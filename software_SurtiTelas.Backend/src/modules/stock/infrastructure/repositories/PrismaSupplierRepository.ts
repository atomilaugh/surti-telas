import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Supplier } from '../../domain/entities/Supplier';
import type {
  CreateSupplierInput,
  SupplierFilters,
  SupplierRepository,
  UpdateSupplierInput,
} from '../../domain/repositories/SupplierRepository';
import { toSupplierData, SUPPLIER_STATUS_TO_DB } from '../mappers/StockMapper';

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: SupplierFilters = {}): Promise<{ data: Supplier[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.SupplierWhereInput = { deletedAt: null };
    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { nit: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.estado) where.estado = SUPPLIER_STATUS_TO_DB[filters.estado];

    const limit = filters.limit ?? 50;
    const sort = filters.sort ?? 'nombre';
    const order = filters.order ?? 'asc';
    const orderBy: Prisma.SupplierOrderByWithRelationInput[] = [{ [sort]: order }, { id: order }];

    const cursorId = filters.cursor ? Buffer.from(filters.cursor, 'base64').toString('utf-8') : undefined;

    if (cursorId) {
      const cursorWhere: Prisma.SupplierWhereInput = {
        ...where,
        OR: [
          { id: order === 'asc' ? { gt: cursorId } : { lt: cursorId } },
        ],
      };

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.supplier.findMany({
          where: cursorWhere,
          orderBy,
          take: limit + 1,
        }),
        this.prisma.supplier.count({ where }),
      ]);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? Buffer.from(data[data.length - 1].id).toString('base64') : undefined;

      return {
        data: data.map((r) => new Supplier(toSupplierData(r))),
        meta: { total, page: 1, limit, nextCursor },
      };
    }

    const page = filters.page ?? 1;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: rows.map((r) => new Supplier(toSupplierData(r))),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<Supplier | null> {
    const row = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    return row ? new Supplier(toSupplierData(row)) : null;
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const row = await this.prisma.supplier.create({
      data: {
        nombre: input.nombre,
        nit: input.nit,
        tipoPersona: input.tipoPersona ?? null,
        numeroDocumento: input.numeroDocumento ?? null,
        telefono: input.telefono,
        email: input.email,
        direccion: input.direccion,
        ciudad: input.ciudad,
        materiales: input.materiales ?? [],
        estado: input.estado ? SUPPLIER_STATUS_TO_DB[input.estado] : 'ACTIVO',
        calificacion: input.calificacion ?? 0,
      },
    });
    return new Supplier(toSupplierData(row));
  }

  async update(id: string, changes: UpdateSupplierInput): Promise<Supplier> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Proveedor no encontrado');

    const row = await this.prisma.supplier.update({
      where: { id },
      data: {
        nombre: changes.nombre,
        nit: changes.nit,
        tipoPersona: changes.tipoPersona ?? null,
        numeroDocumento: changes.numeroDocumento ?? null,
        telefono: changes.telefono,
        email: changes.email,
        direccion: changes.direccion,
        ciudad: changes.ciudad,
        materiales: changes.materiales,
        estado: changes.estado ? SUPPLIER_STATUS_TO_DB[changes.estado] : undefined,
        calificacion: changes.calificacion,
      },
    });
    return new Supplier(toSupplierData(row));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Proveedor no encontrado');
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
