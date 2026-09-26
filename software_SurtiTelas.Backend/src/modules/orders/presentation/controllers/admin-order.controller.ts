import { Request, Response } from 'express';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildHateoasLinks, buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { z } from 'zod';
import { Prisma } from "@prisma/client"; import { prisma } from '../../../../config/database';

const AdminOrderFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  estado: z.string().optional(),
  cliente: z.string().optional(),
  clienteId: z.string().optional(),
  asesor: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  search: z.string().optional(),
});

const UpdateOrderAdminSchema = z.object({
  estado: z.string().optional(),
  prioridad: z.string().optional(),
  observaciones: z.string().optional(),
  asesorId: z.string().optional(),
});

const SalesSummarySchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export const getAdminOrders = async (req: Request, res: Response) => {
  const filters = parseDto(AdminOrderFiltersSchema, req.query);
  const where: Record<string, unknown> = { deletedAt: null };

  if (filters.estado) {
    where.estado = filters.estado;
  }
  if (filters.cliente) {
    where.clienteNombre = { contains: filters.cliente, mode: 'insensitive' as const };
  }
  if (filters.clienteId) {
    where.clienteId = filters.clienteId;
  }
  if (filters.asesor) {
    where.asesorNombre = { contains: filters.asesor, mode: 'insensitive' as const };
  }
  if (filters.fechaDesde || filters.fechaHasta) {
    where.createdAt = {};
    if (filters.fechaDesde) (where.createdAt as Record<string, Date>).gte = new Date(filters.fechaDesde);
    if (filters.fechaHasta) (where.createdAt as Record<string, Date>).lte = new Date(filters.fechaHasta);
  }
  if (filters.search) {
    where.OR = [
      { numero: { contains: filters.search, mode: 'insensitive' as const } },
      { clienteNombre: { contains: filters.search, mode: 'insensitive' as const } },
      { asesor: { nombre: { contains: filters.search, mode: 'insensitive' as const } } },
    ];
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: true,
        asesor: true,
        items: true,
        usuarioValidacion: true,
      },
    }),
    prisma.order.count({ where }),
  ]);
  
  const data = orders.map((o) => ({
    id: o.id,
    numero: o.numero,
    cliente: o.cliente?.nombre ?? '',
    clienteId: o.clienteId,
    asesor: o.asesor?.nombre ?? '',
    asesorId: o.asesorId,
    fecha: o.createdAt.toISOString(),
    estado: o.estado,
    prioridad: o.prioridad,
    observaciones: o.observaciones,
    total: o.total,
    items: o.items,
    itemsList: o.items,
    medioPago: o.medioPago,
    comprobantePagoUrl: o.comprobantePagoUrl,
    usuarioValidacionId: o.usuarioValidacionId,
    fechaValidacion: o.fechaValidacion,
    razonRechazo: o.razonRechazo,
  }));

  return ok(res, buildApiPaginatedResponse(data, total, page, limit));
};

export const getAdminOrderById = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      cliente: true,
      asesor: true,
      items: true,
      usuarioValidacion: true,
      comprobantePagoCargadoPor: true,
    },
  });

  if (!order || order.deletedAt) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const hateoas = buildHateoasLinks('/api/v1/admin/orders', order.id);
  return ok(res, {
    id: order.id,
    numero: order.numero,
    cliente: order.cliente?.nombre ?? '',
    clienteId: order.clienteId,
    asesor: order.asesor?.nombre ?? '',
    asesorId: order.asesorId,
    fecha: order.createdAt.toISOString(),
    estado: order.estado,
    prioridad: order.prioridad,
    observaciones: order.observaciones,
    total: order.total,
    items: order.items,
    itemsList: order.items,
    medioPago: order.medioPago,
    comprobantePagoUrl: order.comprobantePagoUrl,
    usuarioValidacionId: order.usuarioValidacionId,
    fechaValidacion: order.fechaValidacion,
    razonRechazo: order.razonRechazo,
    _links: hateoas,
  });
};

export const updateOrderAdmin = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.deletedAt) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const changes = parseDto(UpdateOrderAdminSchema, req.body);
  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: changes as Prisma.OrderUpdateInput,
    include: { cliente: true, asesor: true, items: true },
  });

  return ok(res, {
    id: updated.id,
    numero: updated.numero,
    cliente: updated.cliente?.nombre ?? '',
    clienteId: updated.clienteId,
    asesor: updated.asesor?.nombre ?? '',
    asesorId: updated.asesorId,
    fecha: updated.createdAt.toISOString(),
    estado: updated.estado,
    prioridad: updated.prioridad,
    observaciones: updated.observaciones,
    total: updated.total,
    items: updated.items,
    itemsList: updated.items,
    medioPago: updated.medioPago,
    comprobantePagoUrl: updated.comprobantePagoUrl,
    usuarioValidacionId: updated.usuarioValidacionId,
    fechaValidacion: updated.fechaValidacion,
    razonRechazo: updated.razonRechazo,
  }, 'Pedido actualizado');
};

export const deleteOrderAdmin = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.deletedAt) {
    throw new NotFoundError('Pedido no encontrado');
  }

  await prisma.order.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  });

  return res.status(204).send();
};

export const getAdminSalesSummary = async (req: Request, res: Response) => {
  const parsed = parseDto(SalesSummarySchema, req.query);
  const where: Record<string, unknown> = { deletedAt: null, tipoFlujo: 'VENTAS' };

  if (parsed.desde || parsed.hasta) {
    where.fecha = {};
    if (parsed.desde) (where.fecha as Record<string, Date>).gte = new Date(parsed.desde);
    if (parsed.hasta) (where.fecha as Record<string, Date>).lte = new Date(parsed.hasta);
  }

  const orders = await prisma.order.findMany({ where, include: { items: true, asesor: true } });
  const sales = await prisma.sale.findMany({
    where: {
      fechaVenta: parsed.desde || parsed.hasta
        ? {
            gte: parsed.desde ? new Date(parsed.desde) : undefined,
            lte: parsed.hasta ? new Date(parsed.hasta) : undefined,
          }
        : undefined,
    },
  });

  const totalPedidos = orders.length;
  const pedidosPorEstado = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.estado] = (acc[o.estado] || 0) + 1;
    return acc;
  }, {});

  const ventasGeneradas = sales.length;
  const valorTotalVendido = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const ticketPromedio = ventasGeneradas > 0 ? valorTotalVendido / ventasGeneradas : 0;

  const ventasPorAsesor = orders.reduce<Array<{ asesorId: string; asesorNombre: string; cantidad: number; total: number }>>((acc, o) => {
    if (!o.asesorId) return acc;
    const existing = acc.find((a) => a.asesorId === o.asesorId);
    if (existing) {
      existing.cantidad += 1;
      existing.total += Number(o.total);
    } else {
      acc.push({ asesorId: o.asesorId, asesorNombre: o.asesor?.nombre || 'Sin nombre', cantidad: 1, total: Number(o.total) });
    }
    return acc;
  }, []);

  const ventasPorDia = orders.reduce<Array<{ fecha: string; cantidad: number; total: number }>>((acc, o) => {
    const fecha = o.createdAt.toISOString().split('T')[0];
    const existing = acc.find((a) => a.fecha === fecha);
    if (existing) {
      existing.cantidad += 1;
      existing.total += Number(o.total);
    } else {
      acc.push({ fecha, cantidad: 1, total: Number(o.total) });
    }
    return acc;
  }, []);

  return ok(res, {
    totalPedidos,
    pedidosPorEstado,
    ventasGeneradas,
    valorTotalVendido,
    ticketPromedio,
    ventasPorAsesor,
    ventasPorDia,
  });
};

export const getAdminOrderHistory = async (req: Request, res: Response) => {
  const history = await prisma.orderHistory.findMany({
    where: { pedidoId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { usuario: true },
    take: 50,
  });

  const data = history.map((h) => ({
    id: h.id,
    pedidoId: h.pedidoId,
    usuarioId: h.usuarioId,
    usuarioNombre: h.usuario?.nombre,
    accion: h.accion,
    estadoAnterior: h.estadoAnterior,
    estadoNuevo: h.estadoNuevo,
    informacion: h.informacion,
    createdAt: h.createdAt.toISOString(),
  }));

  return ok(res, data);
};
