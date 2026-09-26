import { NotFoundError } from '../../../../shared/domain/errors';
import type { EventBus } from '../../../../shared/application/events';
import {
  WarrantyPolicyCreatedEvent,
  WarrantyPolicyUpdatedEvent,
} from '../../../../shared/application/events';
import type { WarrantyPolicy } from '../../domain/entities/WarrantyPolicy';
import type {
  CreateWarrantyPolicyInput,
  UpdateWarrantyPolicyInput,
  WarrantyPolicyRepository,
} from '../../domain/repositories/WarrantyPolicyRepository';

export class ListWarrantyPolicies {
  constructor(private readonly repo: WarrantyPolicyRepository) {}
  execute(activasOnly = true): Promise<WarrantyPolicy[]> {
    return this.repo.list(activasOnly);
  }
}

export class GetWarrantyPolicy {
  constructor(private readonly repo: WarrantyPolicyRepository) {}
  async execute(id: string): Promise<WarrantyPolicy> {
    const policy = await this.repo.getById(id);
    if (!policy) throw new NotFoundError('Política de garantía no encontrada');
    return policy;
  }
}

export class GetWarrantyPolicyByTipo {
  constructor(private readonly repo: WarrantyPolicyRepository) {}
  async execute(tipo: string): Promise<WarrantyPolicy | null> {
    return this.repo.getByTipo(tipo as any);
  }
}

export class CreateWarrantyPolicy {
  constructor(
    private readonly repo: WarrantyPolicyRepository,
    private readonly eventBus?: EventBus,
  ) {}
  async execute(input: CreateWarrantyPolicyInput, requestId?: string): Promise<WarrantyPolicy> {
    const policy = await this.repo.create(input);
    if (this.eventBus) {
      this.eventBus.publish(
        new WarrantyPolicyCreatedEvent({
          policyId: policy.id!,
          tipo: policy.tipo,
          diasGarantia: policy.diasGarantia,
          activa: policy.activa,
        }, requestId),
      );
    }
    return policy;
  }
}

export class UpdateWarrantyPolicy {
  constructor(
    private readonly repo: WarrantyPolicyRepository,
    private readonly eventBus?: EventBus,
  ) {}
  async execute(id: string, changes: UpdateWarrantyPolicyInput, requestId?: string): Promise<WarrantyPolicy> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Política de garantía no encontrada');
    const updated = await this.repo.update(id, changes);
    if (this.eventBus) {
      this.eventBus.publish(
        new WarrantyPolicyUpdatedEvent({
          policyId: updated.id!,
           cambios: changes as Record<string, unknown>,
        }, requestId),
      );
    }
    return updated;
  }
}

export class DeleteWarrantyPolicy {
  constructor(private readonly repo: WarrantyPolicyRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Política de garantía no encontrada');
    await this.repo.delete(id);
  }
}
