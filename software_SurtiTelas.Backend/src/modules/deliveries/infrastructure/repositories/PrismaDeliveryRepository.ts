import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Delivery } from '../../domain/entities/Delivery';
import type { DeliveryData, DeliveryFilters, DeliveryListResult, DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
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
