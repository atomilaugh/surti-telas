import { Prisma, PrismaClient } from '@prisma/client';
import { ReturnRequest } from '../../domain/entities/ReturnRequest';
import type { ReturnItem, ReturnItemData } from '../../domain/entities/ReturnItem';
import { ReturnInspection } from '../../domain/entities/ReturnInspection';
import { ReturnResolution } from '../../domain/entities/ReturnResolution';
import { ReturnHistory } from '../../domain/entities/ReturnHistory';
import type { ReturnRequestData, ReturnRequestFilters, ReturnRequestListResult, ReturnRequestRepository } from '../../domain/repositories/ReturnRequestRepository';
import {
  toReturnRequestEntity,
  toReturnRequestCreateInput,
  toReturnRequestUpdateInput,
  toReturnItemEntity,
  toReturnItemCreateInput,
  toReturnItemUpdateInput,
  toReturnInspectionEntity,
  toReturnInspectionCreateInput,
  toReturnResolutionEntity,
  toReturnResolutionCreateInput,
  toReturnHistoryEntity,
  toReturnHistoryCreateInput,
} from '../mappers/GuaranteeMapper';

export class PrismaReturnRequestRepository
  implements ReturnRequestRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ReturnRequestFilters = {}): Promise<ReturnRequestListResult> {
    const where: Prisma.ReturnRequestWhereInput = { deletedAt: null };
    if (filters.estado) where.estado = filters.estado as any;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.cliente) where.clienteSnapshot = { contains: filters.cliente, mode: 'insensitive' };
    if (filters.orderId) {
      where.OR = [{ orderId: filters.orderId }, { order: { numero: filters.orderId } }];
    }

    const toPositiveInt = (value: unknown, fallback: number): number => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    };

    const page = toPositiveInt(filters.page, 1);
    const limit = Math.min(toPositiveInt(filters.limit, 50), 100);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data: rows.map((r) => toReturnRequestEntity(r).toDTO()),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<ReturnRequest | null> {
    const row = await this.prisma.returnRequest.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toReturnRequestEntity(row) : null;
  }

  async getByNumero(numeroDevolucion: string): Promise<ReturnRequest | null> {
    const row = await this.prisma.returnRequest.findFirst({
      where: { numeroDevolucion, deletedAt: null },
    });
    return row ? toReturnRequestEntity(row) : null;
  }

  async create(data: ReturnRequestData): Promise<ReturnRequest> {
    const ret = new ReturnRequest(data);
    const row = await this.prisma.returnRequest.create({
      data: toReturnRequestCreateInput(ret) as any,
    });
    return toReturnRequestEntity(row);
  }

  async update(id: string, changes: Partial<ReturnRequestData>): Promise<ReturnRequest> {
    const row = await this.prisma.returnRequest.update({
      where: { id },
      data: toReturnRequestUpdateInput(changes) as any,
    });
    return toReturnRequestEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.returnRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async nextNumero(): Promise<string> {
    const last = await this.prisma.returnRequest.findFirst({
      where: { numeroDevolucion: { startsWith: 'DEV-' } },
      orderBy: { createdAt: 'desc' },
    });
    let seq = 1;
    if (last?.numeroDevolucion) {
      const match = /DEV-(\d+)/.exec(last.numeroDevolucion);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `DEV-${String(seq).padStart(4, '0')}`;
  }

  async nextNumeroWithLock(tx: any = this.prisma): Promise<string> {
    const last = await tx.returnRequest.findFirst({
      where: { numeroDevolucion: { startsWith: 'DEV-' } },
      orderBy: { createdAt: 'desc' },
    });
    let seq = 1;
    if (last?.numeroDevolucion) {
      const match = /DEV-(\d+)/.exec(last.numeroDevolucion);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `DEV-${String(seq).padStart(4, '0')}`;
  }

  async findByIdWithRelations(id: string): Promise<{
    request: ReturnRequest;
    items: ReturnItem[];
    inspection: ReturnInspection | null;
    resolution: ReturnResolution | null;
    histories: ReturnHistory[];
  } | null> {
    const row = await this.prisma.returnRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: true,
        inspection: true,
        resolution: true,
        histories: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!row) return null;

    return {
      request: toReturnRequestEntity(row),
      items: (row.items ?? []).map(toReturnItemEntity),
      inspection: row.inspection ? toReturnInspectionEntity(row.inspection) : null,
      resolution: row.resolution ? toReturnResolutionEntity(row.resolution) : null,
      histories: (row.histories ?? []).map(toReturnHistoryEntity),
    };
  }

  async createItem(data: ReturnItemData): Promise<ReturnItem> {
    const row = await this.prisma.returnItem.create({
      data: toReturnItemCreateInput(data as any) as any,
    });
    return toReturnItemEntity(row);
  }

  async updateItem(id: string, changes: Partial<ReturnItemData>): Promise<ReturnItem> {
    const row = await this.prisma.returnItem.update({
      where: { id },
      data: toReturnItemUpdateInput(changes as any) as any,
    });
    return toReturnItemEntity(row);
  }

  async listItemsByRequestId(returnRequestId: string): Promise<ReturnItem[]> {
    const rows = await this.prisma.returnItem.findMany({
      where: { returnRequestId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toReturnItemEntity);
  }

  async getItemById(id: string): Promise<ReturnItem | null> {
    const row = await this.prisma.returnItem.findFirst({ where: { id } });
    return row ? toReturnItemEntity(row) : null;
  }

  async createInspection(data: any): Promise<ReturnInspection> {
    const ret = new ReturnInspection(data);
    const row = await this.prisma.returnInspection.create({
      data: toReturnInspectionCreateInput(ret) as any,
    });
    return toReturnInspectionEntity(row);
  }

  async createResolution(data: any): Promise<ReturnResolution> {
    const ret = new ReturnResolution(data);
    const row = await this.prisma.returnResolution.create({
      data: toReturnResolutionCreateInput(ret) as any,
    });
    return toReturnResolutionEntity(row);
  }

  async createHistory(data: any): Promise<ReturnHistory> {
    const hist = new ReturnHistory(data);
    const row = await this.prisma.returnHistory.create({
      data: toReturnHistoryCreateInput(hist) as any,
    });
    return toReturnHistoryEntity(row);
  }

  async listHistoriesByRequestId(returnRequestId: string): Promise<ReturnHistory[]> {
    const rows = await this.prisma.returnHistory.findMany({
      where: { returnRequestId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toReturnHistoryEntity);
  }
}

