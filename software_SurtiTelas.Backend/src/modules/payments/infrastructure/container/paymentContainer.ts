import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PrismaPaymentRepository } from '../repositories/PrismaPaymentRepository';
import { prisma } from '../../../../config/database';
import type { PaymentStatus, PaymentMethod } from '../../domain/entities/Payment';
import { PrismaClient } from '@prisma/client';
import { BadRequestError } from '../../../../shared/domain/errors';

const repository = new PrismaPaymentRepository(prisma);

export class ListPayments {
  constructor(private repo: PaymentRepository) {}
  async execute(filters: { customerId?: string; asesorId?: string; status?: PaymentStatus; search?: string }) {
    return this.repo.list(filters);
  }
}

export class GetPaymentById {
  constructor(private repo: PaymentRepository) {}
  async execute(id: string) {
    return this.repo.getById(id);
  }
}

export class CreatePayment {
  constructor(private repo: PaymentRepository, private prisma: PrismaClient) {}
  async execute(input: {
    orderId: string;
    customerId: string;
    asesorId?: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
    comprobantePagoUrl?: string;
    status?: PaymentStatus;
    paidAt?: string;
    tipoPago?: string;
    numeroCuota?: number;
    totalCuotas?: number;
    esAnticipo?: boolean;
    esSaldo?: boolean;
  }) {
    if (input.tipoPago === 'CUOTA' || input.tipoPago === 'PAGO_SALDO') {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, deletedAt: null },
        select: { isTrustedCustomer: true },
      });
      if (!customer?.isTrustedCustomer) {
        throw new BadRequestError('Solo los clientes de confianza pueden seleccionar pago a cuotas.');
      }
    }

    // Si vienen metadatos del pago, los serializamos en `notes` como JSON para
    // que el PaymentApprovedSubscriber los use al crear la venta. Si `notes`
    // ya trae contenido (texto del usuario), respetamos la prioridad del JSON.
    let notesToPersist = input.notes ?? null;
    const meta: Record<string, unknown> = {};
    if (input.tipoPago) meta.tipoPago = input.tipoPago;
    if (typeof input.numeroCuota === 'number') meta.numeroCuota = input.numeroCuota;
    if (typeof input.totalCuotas === 'number') meta.totalCuotas = input.totalCuotas;
    if (typeof input.esAnticipo === 'boolean') meta.esAnticipo = input.esAnticipo;
    if (typeof input.esSaldo === 'boolean') meta.esSaldo = input.esSaldo;
    if (Object.keys(meta).length > 0) {
      const json = JSON.stringify(meta);
      notesToPersist = notesToPersist ? `${notesToPersist} | ${json}` : json;
    }

    return this.repo.create({
      orderId: input.orderId,
      customerId: input.customerId,
      asesorId: input.asesorId,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: notesToPersist ?? undefined,
      comprobantePagoUrl: input.comprobantePagoUrl,
      status: input.status,
      paidAt: input.paidAt,
    });
  }
}

export class UpdatePaymentStatus {
  constructor(private repo: PaymentRepository) {}
  async execute(id: string, status: PaymentStatus, paidAt?: string) {
    return this.repo.updateStatus(id, status, paidAt);
  }
}

export class UpdatePayment {
  constructor(private repo: PaymentRepository) {}
  async execute(id: string, changes: { amount?: number; method?: PaymentMethod; reference?: string; notes?: string }) {
    return this.repo.update(id, changes);
  }
}

export class DeletePayment {
  constructor(private repo: PaymentRepository) {}
  async execute(id: string) {
    return this.repo.delete(id);
  }
}

export class CancelPayment {
  constructor(private repo: PaymentRepository) {}
  async execute(id: string, motivoAnulacion: string) {
    return this.repo.cancel(id, motivoAnulacion);
  }
}

export class GetCustomerBalance {
  constructor(private repo: PaymentRepository) {}
  async execute(customerId: string) {
    return this.repo.getCustomerBalance(customerId);
  }
}

export class GetQuoteBalance {
  constructor(private prisma: any) {}
  async execute(quoteId: string) {
    const quote = await this.prisma.quotes.findFirst({ where: { id: quoteId, deleted_at: null } });
    if (!quote) {
      throw new Error('Cotización no encontrada');
    }

    const where: Record<string, unknown> = { deletedAt: null, status: 'APPROVED' };
    if (quote.custom_order_id) {
      where.orderId = quote.custom_order_id;
    }

    const payments = await this.prisma.payment.findMany({ where });

    const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const total = Number(quote.total);
    const saldo = total - totalPaid;

    return {
      quoteId,
      total,
      totalPaid,
      saldo,
      porcentajeAnticipo: quote.porcentaje_anticipo ?? 50,
      valorAnticipo: Number(quote.valor_anticipo) || 0,
    };
  }
}

export class GetQuoteBalanceByCustomer {
  constructor(private prisma: any) {}
  async execute(customerId: string) {
    const quotes = await this.prisma.quotes.findMany({
      where: {
        deleted_at: null,
        custom_orders: {
          cliente_id: customerId,
          deleted_at: null,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!quotes.length) {
      return [];
    }

    const payments = await this.prisma.payment.findMany({
      where: { deletedAt: null, status: 'APPROVED', orderId: { in: quotes.map((q: any) => q.custom_order_id).filter(Boolean) } },
    });

    const paymentsByOrder = new Map<string, number>();
    for (const p of payments) {
      const current = paymentsByOrder.get(p.orderId) || 0;
      paymentsByOrder.set(p.orderId, current + Number(p.amount));
    }

    return quotes.map((quote: any) => {
      const totalPaid = paymentsByOrder.get(quote.custom_order_id) || 0;
      const total = Number(quote.total);
      const saldo = total - totalPaid;
      return {
        quoteId: quote.id,
        numero: quote.numero,
        total,
        totalPaid,
        saldo,
        porcentajeAnticipo: quote.porcentaje_anticipo ?? 50,
        valorAnticipo: Number(quote.valor_anticipo) || 0,
      };
    });
  }
}

export const paymentUseCases = {
  listPayments: new ListPayments(repository),
  getPaymentById: new GetPaymentById(repository),
  createPayment: new CreatePayment(repository, prisma),
  updatePaymentStatus: new UpdatePaymentStatus(repository),
  updatePayment: new UpdatePayment(repository),
  deletePayment: new DeletePayment(repository),
  cancelPayment: new CancelPayment(repository),
  getCustomerBalance: new GetCustomerBalance(repository),
  getQuoteBalance: new GetQuoteBalance(prisma),
  getQuoteBalanceByCustomer: new GetQuoteBalanceByCustomer(prisma),
};
