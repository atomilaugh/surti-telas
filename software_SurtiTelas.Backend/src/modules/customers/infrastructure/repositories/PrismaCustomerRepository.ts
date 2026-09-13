import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Customer } from '../../domain/entities/Customer';
import type {
  CreateCustomerInput,
  CustomerFilters,
  CustomerRepository,
  UpdateCustomerInput,
} from '../../domain/repositories/CustomerRepository';
import { STATUS_TO_DB, toCustomerData } from '../mappers/CustomerMapper';

const include = {
  asesor: true,
  _count: { select: { orders: true } },
} satisfies Prisma.CustomerInclude;

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: CustomerFilters = {}): Promise<{ data: Customer[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.CustomerWhereInput = { deletedAt: null };
    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { nit: { contains: filters.search, mode: 'insensitive' } },
        { ciudad: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.asesorId) where.asesorId = filters.asesorId;
    if (filters.estado) where.estado = STATUS_TO_DB[filters.estado];

    const limit = filters.limit ?? 50;
    const sort = filters.sort ?? 'nombre';
    const order = filters.order ?? 'asc';
    const orderBy: Prisma.CustomerOrderByWithRelationInput[] = [{ [sort]: order }, { id: order }];

    const cursorId = filters.cursor ? Buffer.from(filters.cursor, 'base64').toString('utf-8') : undefined;

    if (cursorId) {
      const cursorWhere: Prisma.CustomerWhereInput = {
        ...where,
        OR: [
          { id: order === 'asc' ? { gt: cursorId } : { lt: cursorId } },
        ],
      };

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where: cursorWhere,
          include,
          orderBy,
          take: limit + 1,
        }),
        this.prisma.customer.count({ where }),
      ]);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? Buffer.from(data[data.length - 1].id).toString('base64') : undefined;

      return {
        data: data.map((r) => new Customer(toCustomerData(r))),
        meta: { total, page: 1, limit, nextCursor },
      };
    }

    const page = filters.page ?? 1;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include,
        orderBy: orderBy as Prisma.CustomerOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: rows.map((r) => new Customer(toCustomerData(r))),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findFirst({ where: { id, deletedAt: null }, include });
    return row ? new Customer(toCustomerData(row)) : null;
  }

  async getByEmail(email: string): Promise<Customer | null> {
    const row = await this.prisma.customer.findFirst({ where: { email, deletedAt: null }, include });
    return row ? new Customer(toCustomerData(row)) : null;
  }

  async getTrustedStatusByUserId(userId: string): Promise<{ isTrustedCustomer: boolean } | null> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { email: true } });
    if (!user?.email) return null;
    const row = await this.prisma.customer.findFirst({ where: { email: user.email, deletedAt: null }, select: { isTrustedCustomer: true } });
    return row ? { isTrustedCustomer: row.isTrustedCustomer } : null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const data = toCustomerData(
      await this.prisma.customer.create({
        data: {
          nombre: input.nombre,
          apellidos: input.apellidos,
          email: input.email,
          ciudad: input.ciudad,
          telefono: input.tel,
          asesorId: input.asesorId,
          nit: input.nit,
          direccion: input.direccion,
          cupoTotal: input.cupoTotal ?? 0,
          cupoUsado: input.cupoUsado ?? 0,
          deudaVencida: input.deudaVencida ?? 0,
          isTrustedCustomer: input.isTrustedCustomer ?? false,
          estado: input.estado ? STATUS_TO_DB[input.estado] : 'ACTIVO',
        },
        include,
      })
    );

    if (data.email) {
      const userUpdates: Record<string, unknown> = {};
      if (input.nombre !== undefined) userUpdates.nombre = input.nombre;
      if (input.apellidos) userUpdates.apellidos = input.apellidos;
      if (input.email !== undefined) userUpdates.email = input.email;
      if (input.direccion !== undefined) userUpdates.direccion = input.direccion;
      if (input.tel !== undefined) userUpdates.telefono = input.tel;
      if (input.nit !== undefined) userUpdates.numeroDocumento = input.nit;
      if ((input as unknown as Record<string, unknown>).tipoDocumento !== undefined) userUpdates.tipoDocumento = (input as unknown as Record<string, unknown>).tipoDocumento;
      if (Object.keys(userUpdates).length > 0) {
        await this.prisma.user.updateMany({
          where: { email: data.email, deletedAt: null },
          data: userUpdates,
        });
      }
    }

    return new Customer(data);
  }

  async update(id: string, changes: UpdateCustomerInput): Promise<Customer> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');

    const updateData: Record<string, unknown> = {
      nombre: changes.nombre,
      apellidos: changes.apellidos,
      email: changes.email,
      ciudad: changes.ciudad,
      telefono: changes.tel,
      nit: changes.nit,
      direccion: changes.direccion,
      cupoTotal: changes.cupoTotal,
      cupoUsado: changes.cupoUsado,
      deudaVencida: changes.deudaVencida,
      isTrustedCustomer: changes.isTrustedCustomer,
      estado: changes.estado ? STATUS_TO_DB[changes.estado] : undefined,
      asesorId: changes.asesorId,
    };

    const row = await this.prisma.customer.update({
      where: { id },
      data: updateData,
      include,
    });

    const userUpdates: Record<string, unknown> = {};
    if (changes.nombre !== undefined) userUpdates.nombre = changes.nombre;
    if (changes.apellidos) userUpdates.apellidos = changes.apellidos;
    if (changes.email !== undefined) userUpdates.email = changes.email;
      if (changes.direccion !== undefined) userUpdates.direccion = changes.direccion;
    if (changes.tel !== undefined) userUpdates.telefono = changes.tel;
    if (changes.nit !== undefined) userUpdates.numeroDocumento = changes.nit;
    if ((changes as Record<string, unknown>).tipoDocumento !== undefined) userUpdates.tipoDocumento = (changes as Record<string, unknown>).tipoDocumento;

    if (row.email && Object.keys(userUpdates).length > 0) {
      await this.prisma.user.updateMany({
        where: { email: row.email, deletedAt: null },
        data: userUpdates,
      });
    }

    if (!row.email && existing.email && Object.keys(userUpdates).length > 0) {
      await this.prisma.user.updateMany({
        where: { email: existing.email, deletedAt: null },
        data: userUpdates,
      });
    }

    return new Customer(toCustomerData(row));
  }

  async assignAsesor(id: string, asesorId: string): Promise<Customer> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');
    const row = await this.prisma.customer.update({
      where: { id },
      data: { asesorId },
      include,
    });
    return new Customer(toCustomerData(row));
  }

  async updateCupo(id: string, cupoTotal?: number, cupoUsado?: number, deudaVencida?: number): Promise<Customer> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');
    const row = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(cupoTotal !== undefined ? { cupoTotal } : {}),
        ...(cupoUsado !== undefined ? { cupoUsado } : {}),
        ...(deudaVencida !== undefined ? { deudaVencida } : {}),
      },
      include,
    });
    return new Customer(toCustomerData(row));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
