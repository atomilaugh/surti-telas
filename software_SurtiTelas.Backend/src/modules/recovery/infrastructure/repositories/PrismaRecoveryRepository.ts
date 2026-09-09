import { PrismaClient, RecoveryRequestStatus as PrismaRecoveryRequestStatus } from '@prisma/client';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryRequest, RecoveryRequestStatus } from '../../domain/entities/RecoveryRequest';

const toEntity = (row: {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  completedAt: Date | null;
  estado: PrismaRecoveryRequestStatus;
  ip: string | null;
  userAgent: string | null;
  resultado: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RecoveryRequest => ({
  id: row.id,
  userId: row.userId,
  email: row.email,
  tokenHash: row.tokenHash,
  expiresAt: row.expiresAt,
  completedAt: row.completedAt ?? undefined,
  estado: row.estado as RecoveryRequestStatus,
  ip: row.ip ?? undefined,
  userAgent: row.userAgent ?? undefined,
  resultado: row.resultado ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PrismaRecoveryRepository implements RecoveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(request: {
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<RecoveryRequest> {
    const row = await this.prisma.recoveryRequest.create({
      data: {
        userId: request.userId,
        email: request.email,
        tokenHash: request.tokenHash,
        expiresAt: request.expiresAt,
        ip: request.ip ?? null,
        userAgent: request.userAgent ?? null,
      },
    });
    return toEntity(row);
  }

  async findByTokenHash(tokenHash: string): Promise<RecoveryRequest | null> {
    const row = await this.prisma.recoveryRequest.findFirst({
      where: { tokenHash, estado: 'PENDIENTE', deletedAt: null },
    });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<RecoveryRequest | null> {
    const row = await this.prisma.recoveryRequest.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toEntity(row) : null;
  }

  async findPendingByUserId(userId: string): Promise<RecoveryRequest[]> {
    const rows = await this.prisma.recoveryRequest.findMany({
      where: { userId, estado: 'PENDIENTE', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    estado?: RecoveryRequestStatus;
    userId?: string;
    email?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ data: RecoveryRequest[]; meta: { total: number; page: number; limit: number } }> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filters?.estado) where.estado = filters.estado;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.email) where.email = { contains: filters.email, mode: 'insensitive' };
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) (where.createdAt as Record<string, Date>).gte = filters.fromDate;
      if (filters.toDate) (where.createdAt as Record<string, Date>).lte = filters.toDate;
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.recoveryRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.recoveryRequest.count({ where }),
    ]);

    return { data: data.map(toEntity), meta: { total, page, limit } };
  }

  async update(id: string, data: {
    estado?: RecoveryRequestStatus;
    completedAt?: Date | null;
    resultado?: string | null;
  }): Promise<RecoveryRequest> {
    const row = await this.prisma.recoveryRequest.update({
      where: { id },
      data: {
        ...(data.estado && { estado: data.estado }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
        ...(data.resultado !== undefined && { resultado: data.resultado }),
      },
    });
    return toEntity(row);
  }

  async markCompleted(id: string, resultado?: string): Promise<void> {
    await this.prisma.recoveryRequest.update({
      where: { id },
      data: { estado: 'COMPLETADA', completedAt: new Date(), resultado: resultado ?? null },
    });
  }

  async markExpired(id: string): Promise<void> {
    await this.prisma.recoveryRequest.update({
      where: { id },
      data: { estado: 'EXPIRADA', resultado: 'Expirado' },
    });
  }

  async markRejected(id: string, resultado: string): Promise<void> {
    await this.prisma.recoveryRequest.update({
      where: { id },
      data: { estado: 'RECHAZADA', resultado },
    });
  }
}
