import { Prisma, PrismaClient } from '@prisma/client';
import { WarrantyPolicy } from '../../domain/entities/WarrantyPolicy';
import type { CreateWarrantyPolicyInput, UpdateWarrantyPolicyInput } from '../../domain/repositories/WarrantyPolicyRepository';
import {
  toWarrantyPolicyEntity,
  toWarrantyPolicyCreateInput,
  toWarrantyPolicyUpdateInput,
} from '../mappers/GuaranteeMapper';

export class PrismaWarrantyPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(activasOnly = true): Promise<WarrantyPolicy[]> {
    const where: Prisma.WarrantyPolicyWhereInput = { deletedAt: null };
    if (activasOnly) {
      where.activa = true;
    }
    const rows = await this.prisma.warrantyPolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toWarrantyPolicyEntity);
  }

  async getById(id: string): Promise<WarrantyPolicy | null> {
    const row = await this.prisma.warrantyPolicy.findFirst({
      where: { id, deletedAt: null },
    });
    return row ? toWarrantyPolicyEntity(row) : null;
  }

  async getByTipo(tipo: string): Promise<WarrantyPolicy | null> {
    const row = await this.prisma.warrantyPolicy.findFirst({
      where: { tipo: tipo as any, activa: true, deletedAt: null },
    });
    return row ? toWarrantyPolicyEntity(row) : null;
  }

  async create(input: CreateWarrantyPolicyInput): Promise<WarrantyPolicy> {
    const row = await this.prisma.warrantyPolicy.create({
      data: toWarrantyPolicyCreateInput(input),
    });
    return toWarrantyPolicyEntity(row);
  }

  async update(id: string, changes: UpdateWarrantyPolicyInput): Promise<WarrantyPolicy> {
    const row = await this.prisma.warrantyPolicy.update({
      where: { id },
      data: toWarrantyPolicyUpdateInput(changes),
    });
    return toWarrantyPolicyEntity(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.warrantyPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
