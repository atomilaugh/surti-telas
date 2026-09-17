import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Delivery } from '../../domain/entities/Delivery';
import type { DeliveryData, DeliveryFilters, DeliveryListResult, DeliveryRepository, DeliveryRutaItem } from '../../domain/repositories/DeliveryRepository';
import { toDelivery, toDeliveryData, toUpdateInput } from '../mappers/DeliveryMapper';

const include = {
  order: {
    include: { cliente: { select: { nombre: true, telefono: true, ciudad: true, direccion: true } } },
  },
  domiciliario: { select: { nombre: true, email: true, telefono: true } },
} satisfies Prisma.DeliveryInclude;

export class PrismaDeliveryRepository implements DeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: DeliveryFilters = {}): Promise<DeliveryListResult> {
    const where: Prisma.DeliveryWhereInput = { deletedAt: null };
    if (filters.estado) where.estado = filters.estado;
    if (filters.domiciliarioId) where.domiciliarioId = filters.domiciliarioId;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const orderBy = { createdAt: 'desc' as const };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data: rows.map((r) => toDeliveryData(r)),
      meta: { total, page, limit },
    };
  }

  async listRutaDelDia(filters?: { domiciliarioId?: string; estado?: string }): Promise<DeliveryRutaItem[]> {
    const deliveriesWhere: any = {
      deletedAt: null,
      ...(filters?.estado ? { estado: filters.estado } : { estado: { in: ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'] } }),
    };
    if (filters?.domiciliarioId) {
      deliveriesWhere.OR = [
        { domiciliarioId: filters.domiciliarioId },
        { domiciliarioId: null, order: { estado: { in: ['DESPACHADO', 'EN_CAMINO'] } } as any },
      ];
    }

    const [deliveriesRaw, domiciliariosRaw] = await Promise.all([
      this.prisma.delivery.findMany({
        where: deliveriesWhere,
        include: {
          order: {
            select: {
              numero: true,
              total: true,
              estado: true,
              cliente: {
                select: {
                  nombre: true,
                  telefono: true,
                  ciudad: true,
                  direccion: true,
                },
              },
            },
          },
          domiciliario: {
            select: {
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        } as any,
        orderBy: { asignadoEn: 'asc' },
      }),
      this.prisma.domiciliario.findMany({
        where: { activo: true },
        select: {
          userId: true,
          zona: true,
        },
      }),
    ]);

    const domiciliarioZonaMap = new Map((domiciliariosRaw as any[]).map((d: any) => [d.userId, d.zona]));
    const deliveries = deliveriesRaw as any[];

    return deliveries.map((delivery: any) => {
      const order = delivery.order;
      const cliente = order?.cliente;
      const rawDireccion = (cliente?.direccion?.trim() || delivery.direccion?.trim()) || null;
      const rawCiudad = (cliente?.ciudad?.trim() || delivery.ciudad?.trim()) || null;
      const rawTelefono = (cliente?.telefono?.trim() || delivery.telefono?.trim()) || null;
      return {
        id: delivery.id,
        orderId: delivery.orderId,
        estado: delivery.estado,
        domiciliarioId: delivery.domiciliarioId,
        domiciliarioNombre: delivery.domiciliario?.nombre ?? null,
        domiciliarioTelefono: delivery.domiciliario?.telefono ?? null,
        domiciliarioZona: domiciliarioZonaMap.get(delivery.domiciliarioId ?? '') ?? null,
        direccion: rawDireccion,
        ciudad: rawCiudad,
        telefono: rawTelefono,
        notas: delivery.notas,
        motivo: delivery.motivo,
        asignadoEn: delivery.asignadoEn,
        inicioRutaEn: delivery.inicioRutaEn,
        entregadoEn: delivery.entregadoEn,
        order: {
          numero: order?.numero ?? null,
          cliente: cliente?.nombre || order?.clienteNombre || null,
          telefono: rawTelefono,
          direccion: rawDireccion,
          ciudad: rawCiudad,
          total: order?.total ? Number(order.total) : null,
          estado: order?.estado ?? null,
        },
      };
    });
  }

  async getById(id: string): Promise<Delivery | null> {
    const row = await this.prisma.delivery.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!row) return null;
    return toDelivery(row);
  }

  async create(data: DeliveryData): Promise<Delivery> {
    const delivery = new Delivery(data);
    const row = await this.prisma.delivery.create({
      data: {
        orderId: delivery.orderId,
        domiciliarioId: delivery.domiciliarioId ?? undefined,
        estado: delivery.estado,
        direccion: (delivery.direccion ?? '') as string,
        ciudad: (delivery.ciudad ?? '') as string,
        telefono: (delivery.telefono ?? '') as string,
        notas: (delivery.notas ?? '') as string,
        motivo: (delivery.motivo ?? '') as string,
        asignadoEn: delivery.asignadoEn ?? undefined,
        inicioRutaEn: delivery.inicioRutaEn ?? undefined,
        entregadoEn: delivery.entregadoEn ?? undefined,
      },
      include,
    });
    return toDelivery(row);
  }

  async update(id: string, changes: Partial<DeliveryData>): Promise<Delivery> {
    const existing = await this.prisma.delivery.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Entrega no encontrada');

    const data = toUpdateInput(changes);
    const row = await this.prisma.delivery.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include,
    });
    return toDelivery(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.delivery.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Entrega no encontrada');
    await this.prisma.delivery.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
