import { NotFoundError, BadRequestError } from '../../../../shared/domain/errors';
import type { CustomerRepository } from '../../../customers/domain/repositories/CustomerRepository';
import type { ProductRepository } from '../../../catalog/domain/repositories/ProductRepository';
import type { OrderFilters, OrderRepository, CreateOrderInput } from '../../domain/repositories/OrderRepository';
import { type OrderRow } from '../../infrastructure/mappers/OrderMapper';
import { Order, type OrderItem, type OrderPriority, type OrderStatus } from '../../domain/entities/Order';
import type { EventBus } from '../../../../shared/application/events';
import { PrismaClient, StockStatus } from '@prisma/client';
import { computeStockStatus, type ProductColorStockData } from '../../../catalog/domain/entities/Product';
import { STOCK_TO_DB } from '../../../catalog/infrastructure/mappers/ProductMapper';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
  StockReservedEvent,
  OrderDeliveredEvent,
  OrderAcceptedEvent,
  OrderRejectedEvent,
  OrderReceiptGeneratedEvent,
  OrderCanceledEvent,
  OrderDispatchedEvent,
  OrderAssignedEvent,
  OrderUpdatedEvent,
  OrderDeletedEvent,
} from '../../../../shared/application/events';
import { toOrderData } from '../../infrastructure/mappers/OrderMapper';
import { logger } from '../../../../shared/infrastructure/logger';

/** Suma de las existencias de un conjunto de variantes de inventario. */
function sumVariantStock(variantes: ProductColorStockData[]): number {
  return variantes.reduce((total, variante) => total + (Number.isFinite(variante.cantidad) ? variante.cantidad : 0), 0);
}

export class CreateOrder {  constructor(
    private readonly repo: OrderRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly productRepo: ProductRepository,
    private readonly prisma: PrismaClient,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(input: CreateOrderInput, requestId?: string, user?: { id: string; email: string; nombre?: string; role?: string }) {
    let customerId = input.clienteId;
    let asesorId = input.asesorId;

    if (user?.role === 'CLIENTE' && user?.email) {
      const customer = await this.customerRepo.getByEmail(user.email);
      if (customer) {
        customerId = customer.id;
      } else {
        const asesor = await this.prisma.user.findFirst({
          where: { role: 'ASESOR', deletedAt: null },
          select: { id: true },
        });

        const newCustomer = await this.prisma.customer.create({
          data: {
            nombre: user.nombre ?? user.email,
            email: user.email,
            telefono: null,
            ciudad: null,
            nit: null,
            asesorId: asesor?.id ?? null,
            cupoTotal: 1000000,
            cupoUsado: 0,
            deudaVencida: 0,
            isTrustedCustomer: false,
            estado: 'ACTIVO',
          },
          include: {
            asesor: true,
            _count: { select: { orders: true } },
          },
        });

        customerId = newCustomer.id;
      }
    } else if (!customerId && user?.email) {
      const customer = await this.customerRepo.getByEmail(user.email);
      if (customer) {
        customerId = customer.id;
      } else {
        const asesor = await this.prisma.user.findFirst({
          where: { role: 'ASESOR', deletedAt: null },
          select: { id: true },
        });

        const newCustomer = await this.prisma.customer.create({
          data: {
            nombre: user.nombre ?? user.email,
            email: user.email,
            telefono: null,
            ciudad: null,
            nit: null,
            asesorId: asesor?.id ?? null,
            cupoTotal: 1000000,
            cupoUsado: 0,
            deudaVencida: 0,
            isTrustedCustomer: false,
            estado: 'ACTIVO',
          },
          include: {
            asesor: true,
            _count: { select: { orders: true } },
          },
        });

        customerId = newCustomer.id;
      }
    } else if (customerId) {
      const customer = await this.customerRepo.getById(customerId);
      if (!customer) {
        const userCustomer = await this.prisma.user.findFirst({
          where: { id: customerId, deletedAt: null },
          select: { id: true, email: true, nombre: true },
        });
        if (userCustomer?.email) {
          const existing = await this.customerRepo.getByEmail(userCustomer.email);
          if (existing) {
            customerId = existing.id;
          } else {
            const asesor = await this.prisma.user.findFirst({
              where: { role: 'ASESOR', deletedAt: null },
              select: { id: true },
            });
            const newCustomer = await this.prisma.customer.create({
              data: {
                nombre: userCustomer.nombre ?? userCustomer.email,
                email: userCustomer.email,
                telefono: null,
                ciudad: null,
                nit: null,
                asesorId: asesor?.id ?? null,
                cupoTotal: 1000000,
                cupoUsado: 0,
                deudaVencida: 0,
                isTrustedCustomer: false,
                estado: 'ACTIVO',
              },
              include: {
                asesor: true,
                _count: { select: { orders: true } },
              },
            });
            customerId = newCustomer.id;
          }
        }
      }
    }

    if (!asesorId) {
      const asesor = await this.prisma.user.findFirst({
        where: { role: 'ASESOR', deletedAt: null },
        select: { id: true },
      });
      asesorId = asesor?.id ?? undefined;
    }

    if (!asesorId) {
      throw new BadRequestError('Se requiere asesorId para crear el pedido');
    }

    console.log('CREATE_ORDER_CUSTOMER_ID', JSON.stringify({ customerId, inputClienteId: input.clienteId, userEmail: user?.email, userRole: user?.role }));

    if (!customerId) {
      throw new BadRequestError('Se requiere clienteId para crear el pedido');
    }

    const customer = await this.customerRepo.getById(customerId);
    if (!customer) throw new NotFoundError('Cliente no encontrado');

    if ((input.paymentMethod === 'OTHER' || input.paymentMethod === 'INSTALLMENTS') && !customer.isTrustedCustomer) {
      throw new BadRequestError('Solo los clientes de confianza pueden seleccionar pago a cuotas');
    }

    try {
      const itemsList = input.itemsList ?? [];
      const computedSubtotal = itemsList.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      const total = computedSubtotal;

      if (input.itemsList && input.itemsList.length > 0) {
        if (input.subtotal !== undefined && Math.abs(input.subtotal - computedSubtotal) > 0.01) {
          throw new BadRequestError('El subtotal no coincide con el c�lculo de los productos.');
        }
        const expectedImpuestos = computedSubtotal * 0.19;
        if (input.impuestos !== undefined && Math.abs(input.impuestos - expectedImpuestos) > 0.01) {
          throw new BadRequestError('Los impuestos no coinciden con el c�lculo del subtotal (19%).');
        }
        if (input.descuentos !== undefined && input.descuentos < 0) {
          throw new BadRequestError('Los descuentos no pueden ser negativos.');
        }
        if (input.descuentos !== undefined && input.descuentos > computedSubtotal) {
          throw new BadRequestError('Los descuentos no pueden superar el subtotal.');
        }
      }

      const stockItems: { productId: string; productRef: string; cantidad: number }[] = [];
      const productUpdates: { ref: string; cantidadStock: number; stockStatus: StockStatus }[] = [];
      const variantUpdates: { productId: string; color: string; size: string; cantidad: number; stockStatus: StockStatus }[] = [];
      /** Unidades ya descontadas por producto, para no aplicar el descuento por linea. */
      const descontadoPorProducto = new Map<string, number>();

      for (const item of itemsList) {
        if (item.productId) {
          const product = await this.productRepo.getById(item.productId);
          if (product) {
            const descontado = (descontadoPorProducto.get(item.productId) ?? 0) + item.cantidad;
            descontadoPorProducto.set(item.productId, descontado);
            stockItems.push({ productId: item.productId, productRef: product.ref!, cantidad: item.cantidad });

            // Inventario multivariable: el stock general es la suma de las variantes,
            // por lo que se descuenta la combinacion exacta (color + talla) del item.
            const variante = this.findVariant(product.stockPorColor, item);
            if (variante) {
              const restante = Math.max(0, variante.cantidad - item.cantidad);
              variantUpdates.push({
                productId: item.productId,
                color: variante.color,
                size: variante.size ?? '',
                cantidad: restante,
                stockStatus: STOCK_TO_DB[computeStockStatus(restante)],
              });
            }

            const variantes = Array.isArray(product.stockPorColor) ? product.stockPorColor : [];
            const newStock = variantes.length > 0
              ? Math.max(0, sumVariantStock(variantes) - descontado)
              : Math.max(0, product.cantidadStock - descontado);
            productUpdates.push({
              ref: product.ref!,
              cantidadStock: newStock,
              stockStatus: STOCK_TO_DB[computeStockStatus(newStock)],
            });
          }
        }
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const order = await this.repo.create({
          ...input,
          clienteId: customerId,
          asesorId: asesorId ?? undefined,
        });
        await tx.customer.update({
          where: { id: customer.id! },
          data: { cupoUsado: { increment: total } },
          include: { asesor: true },
        });

        for (const update of productUpdates) {
          await tx.product.update({
            where: { ref: update.ref },
            data: { cantidadStock: update.cantidadStock, stockStatus: update.stockStatus },
          });
        }

        for (const variante of variantUpdates) {
          await tx.productColorStock.updateMany({
            where: {
              productId: variante.productId,
              color: variante.color,
              size: variante.size,
              deletedAt: null,
            },
            data: { cantidad: variante.cantidad, stockStatus: variante.stockStatus },
          });
        }

        for (const item of itemsList) {
          if (item.productId) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            if (!product) continue;
            await tx.inventoryMovement.create({
              data: {
                tipo: 'SALIDA',
                productId: product.id,
                cantidad: item.cantidad,
                motivo: `Pedido ${order.numero || order.id}`,
                usuarioId: asesorId ?? user?.id,
              },
            });
          }
        }

        return order;
      });

      this.emitEvents(result, total, stockItems, input.paymentMethod, input.installments, input.tipoFlujo, requestId);
      return result;
    } catch (error) {
      console.error('CREATE_ORDER_ERROR', error);
      throw error;
    }
  }

  /**
   * Localiza la variante de inventario que corresponde a la linea del pedido.
   * Prioriza el par color + talla exacto; si el pedido no trae talla, usa la
   * variante del color sin talla y, en su defecto, la primera del color.
   */
  private findVariant(
    variantes: ProductColorStockData[],
    item: OrderItem,
  ): ProductColorStockData | undefined {
    if (!Array.isArray(variantes) || variantes.length === 0) return undefined;
    const color = (item.color ?? '').trim().toLowerCase();
    const talla = (item.talla ?? '').trim().toLowerCase();
    if (color === '') return undefined;

    const delColor = variantes.filter((v) => v.color.trim().toLowerCase() === color);
    if (delColor.length === 0) return undefined;
    if (talla !== '') {
      const exacta = delColor.find((v) => (v.size ?? '').trim().toLowerCase() === talla);
      if (exacta) return exacta;
    }
    const sinTalla = delColor.find((v) => (v.size ?? '').trim() === '');
    return sinTalla ?? delColor[0];
  }

  private emitEvents(order: Order, total: number, stockItems: { productId: string; productRef: string; cantidad: number }[], paymentMethod?: string, installments?: number, tipoFlujo?: string, requestId?: string) {
    if (!this.eventBus) return;
    this.eventBus.publish(
      new StockReservedEvent({
        orderId: order.id,
        items: stockItems,
      }, requestId)
    );
    this.eventBus.publish(
      new OrderCreatedEvent({
        orderId: order.id,
        orderNumero: order.numero || order.id,
        clienteId: order.clienteId,
        clienteNombre: order.cliente,
        asesorId: order.asesorId,
        asesorNombre: order.asesor,
        total,
        itemsCount: order.items,
        paymentMethod: paymentMethod || 'OTHER',
        installments,
        tipoFlujo,
      }, requestId)
    );
  }
}

export class GetOrders {
  constructor(private readonly repo: OrderRepository) {}
  execute(filters?: OrderFilters) {
    return this.repo.list(filters);
  }
}

export class GetOrderById {
  constructor(private readonly repo: OrderRepository) {}
  async execute(id: string) {
    const order = await this.repo.getById(id);
    if (!order) throw new NotFoundError('Pedido no encontrado');
    return order;
  }
}

export class UpdateOrderStatus {
  constructor(
    private readonly repo: OrderRepository,
    private readonly eventBus?: EventBus,
    private readonly prisma?: PrismaClient,
  ) {}

  async execute(id: string, estado: OrderStatus, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');

    const previousStatus = existing.estado;
    if (!existing.canTransitionTo(estado)) {
      throw new BadRequestError(`No se puede transitar de '${existing.estado}' a '${estado}'`);
    }
    const updated = await this.repo.updateStatus(id, estado);

    if (this.eventBus) {
      this.eventBus.publish(
        new OrderStatusUpdatedEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          previousStatus,
          newStatus: updated.estado,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
        }, requestId)
      );
    } else {
      logger.warn(`[UpdateOrderStatus] EventBus no disponible para pedido ${updated.id}`);
    }

    if (estado === 'Enviado') {
      if (this.eventBus) {
        let direccion = '';
        let ciudad = '';
        let telefono = '';
        if (this.prisma) {
          const customer = await this.prisma.customer.findFirst({
            where: { id: updated.clienteId, deletedAt: null },
            select: { direccion: true, ciudad: true, telefono: true },
          });
          direccion = customer?.direccion ?? '';
          ciudad = customer?.ciudad ?? '';
          telefono = customer?.telefono ?? '';
        }
        this.eventBus.publish(
          new OrderDispatchedEvent({
            orderId: updated.id,
            orderNumero: updated.numero || updated.id,
            clienteId: updated.clienteId,
            clienteNombre: updated.cliente,
            domiciliarioId: undefined,
            domiciliarioNombre: undefined,
            direccion,
            ciudad,
            telefono,
            total: Number(updated.total),
          }, requestId)
        );
      }
    }

    if (estado === 'Aceptado') {
      try {
        const existingReceipt = await this.repo.findReceiptByOrderId(updated.id);
        if (!existingReceipt) {
          const receipt = await this.repo.createReceipt({
            orderId: updated.id,
            customerId: updated.clienteId,
            numero: updated.numero || updated.id,
            total: Number(updated.total),
            concepto: `Pedido ${updated.numero || updated.id} - ${updated.items} ítems`,
            emitidoPor: updated.asesor,
          });
          logger.info(`[UpdateOrderStatus] Recibo generado al aceptar pedido ${updated.id}: ${receipt.id}`);
          if (this.eventBus) {
            this.eventBus.publish(
              new OrderReceiptGeneratedEvent({
                orderId: updated.id,
                orderNumero: updated.numero || updated.id,
                clienteId: updated.clienteId,
                clienteNombre: updated.cliente,
                asesorId: updated.asesorId,
                asesorNombre: updated.asesor,
                receiptId: receipt.id,
                total: Number(updated.total),
              }, requestId)
            );
          }
        } else {
          logger.info(`[UpdateOrderStatus] Recibo ya existe para pedido ${updated.id}, no se crea duplicado.`);
        }
      } catch (error) {
        logger.error(`[UpdateOrderStatus] Error generando recibo para pedido ${updated.id}`, { error: (error as Error).message });
      }
    }

    if (estado === 'Entregado') {
      const existingReceipt = await this.repo.findReceiptByOrderId(updated.id);
      if (!existingReceipt) {
        const receipt = await this.repo.createReceipt({
          orderId: updated.id,
          customerId: updated.clienteId,
          numero: `REC-${updated.numero?.replace('PED-', '') || updated.id}`,
          total: Number(updated.total),
          concepto: `Pedido ${updated.numero || updated.id} - ${updated.items} ítems`,
          emitidoPor: updated.asesor,
        });
        this.eventBus?.publish(
          new OrderReceiptGeneratedEvent({
            orderId: updated.id,
            orderNumero: updated.numero || updated.id,
            clienteId: updated.clienteId,
            clienteNombre: updated.cliente,
            asesorId: updated.asesorId,
            asesorNombre: updated.asesor,
            receiptId: receipt.id,
            total: Number(updated.total),
          }, requestId)
        );
      }
      logger.info(`[UpdateOrderStatus] Publicando evento order.delivered para pedido ${updated.id}`);
      await this.eventBus?.publish(
        new OrderDeliveredEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
          total: Number(updated.total),
        }, requestId)
      );
      // Regla: 1 VENTA = 1 PAGO CONFIRMADO. NO se crea un Payment APPROVED
      // automáticamente al entregar; cada pago debe ser registrado y
      // aprobado explícitamente. El PaymentApprovedSubscriber creará la
      // venta cuando un pago real sea confirmado.
    }

    if (estado === 'Rechazado') {
      this.eventBus?.publish(
        new OrderRejectedEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
          razon: updated.razonRechazo || 'Pedido rechazado',
        }, requestId)
      );
    }

    return updated;
  }
}

export class AssignDomiciliario {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, domiciliarioId: string, domiciliarioNombre: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    const order = await this.repo.assignDomiciliario(id, domiciliarioId);
    if (this.eventBus) {
      this.eventBus.publish(
        new OrderAssignedEvent({
          orderId: existing.id,
          orderNumero: existing.numero || existing.id,
          domiciliarioId,
          domiciliarioNombre,
          clienteId: existing.clienteId,
          clienteNombre: existing.cliente,
          asesorId: existing.asesorId,
          asesorNombre: existing.asesor,
        }, requestId)
      );
    }
    return order;
  }
}

export class DeleteOrder {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    await this.repo.softDelete(id);
    if (this.eventBus) {
      this.eventBus.publish(
        new OrderDeletedEvent({
          orderId: existing.id,
          orderNumero: existing.numero || existing.id,
          clienteId: existing.clienteId,
          clienteNombre: existing.cliente,
          asesorId: existing.asesorId,
          asesorNombre: existing.asesor,
        }, requestId)
      );
    }
  }
}

export class UpdateOrderFull {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, changes: { clienteId?: string; asesorId?: string; prioridad?: OrderPriority; observaciones?: string; itemsList?: OrderItem[] }, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    if (existing.estado === 'Aceptado') {
      throw new BadRequestError('El pedido aceptado no puede ser modificado.');
    }
    const order = await this.repo.updateFull(id, changes);
    if (this.eventBus) {
      this.eventBus.publish(
        new OrderUpdatedEvent({
          orderId: existing.id,
          orderNumero: existing.numero || existing.id,
          cambios: changes,
          clienteId: existing.clienteId,
          clienteNombre: existing.cliente,
          asesorId: existing.asesorId,
          asesorNombre: existing.asesor,
        }, requestId)
      );
    }
    return order;
  }
}

export class ApproveOrder {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, usuarioValidacionId: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    const order = new Order(toOrderData(existing as unknown as OrderRow));
    if (!order.canBeAccepted()) {
      throw new BadRequestError('El pedido no puede ser aceptado en su estado actual');
    }

    const updated = await this.repo.updateValidation(id, {
      usuarioValidacionId,
      fechaValidacion: new Date(),
      estado: 'Aceptado',
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new OrderAcceptedEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
          saleId: updated.id,
          receiptId: updated.id,
          total: Number(updated.total),
        }, requestId)
      );
    }

    return updated;
  }
}

export class RejectOrder {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, usuarioValidacionId: string, razonRechazo: string, observacionesRechazo?: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    const order = new Order(toOrderData(existing as unknown as OrderRow));
    if (!order.canBeRejected()) {
      throw new BadRequestError('El pedido no puede ser rechazado en su estado actual');
    }

    const updated = await this.repo.updateValidation(id, {
      usuarioValidacionId,
      fechaValidacion: new Date(),
      estado: 'Rechazado',
      razonRechazo,
      observacionesRechazo,
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new OrderRejectedEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
          razon: razonRechazo,
        }, requestId)
      );
    }

    return updated;
  }
}

export class UploadPaymentProof {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, data: { url: string; nombreOriginal: string; mime: string; tamaño: number; cargadoPorId: string; estado: string; observaciones?: string }, requestId?: string) {
    const updated = await this.repo.updatePaymentProof(id, data);
    if (this.eventBus) {
      this.eventBus.publish(
        new OrderStatusUpdatedEvent({
          orderId: updated.id,
          orderNumero: updated.numero || updated.id,
          previousStatus: updated.estado,
          newStatus: updated.estado,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          asesorId: updated.asesorId,
          asesorNombre: updated.asesor,
        }, requestId)
      );
    }
    return updated;
  }
}

export class CancelOrder {
  constructor(private readonly repo: OrderRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, motivoAnulacion: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Pedido no encontrado');
    const order = existing;
    if (!order.canBeCanceled()) {
      throw new BadRequestError('El pedido no puede ser cancelado en su estado actual');
    }

    const updated = await this.repo.cancelOrder(id, motivoAnulacion);

    if (this.eventBus) {
      const items = (updated.itemsList ?? []).map((i) => ({
        productId: i.productId ?? '',
        productRef: i.productId ?? '',
        cantidad: i.cantidad,
      }));
      this.eventBus.publish(
        new OrderCanceledEvent({
          orderId: updated.id,
          clienteId: updated.clienteId,
          clienteNombre: updated.cliente,
          total: Number(updated.total),
          items,
        }, requestId)
      );
    }

    return updated;
  }
}



