import { NotFoundError } from '../../../../shared/domain/errors';
import type {
  CreateCustomerInput,
  CustomerFilters,
  CustomerRepository,
  UpdateCustomerInput,
} from '../../domain/repositories/CustomerRepository';
import type { EventBus } from '../../../../shared/application/events';
import { CustomerCreatedEvent, CustomerUpdatedEvent } from '../../../../shared/application/events';

export class CreateCustomer {
  constructor(private readonly repo: CustomerRepository, private readonly eventBus?: EventBus) {}
  async execute(input: CreateCustomerInput, requestId?: string) {
    const customer = await this.repo.create(input);

    if (this.eventBus) {
      this.eventBus.publish(
        new CustomerCreatedEvent({
          customerId: customer.id!,
          nombre: customer.nombre,
          email: customer.email,
          ciudad: customer.ciudad,
          asesorId: customer.asesorId ?? undefined,
          asesorNombre: undefined,
        }, requestId)
      );
    }

    return customer;
  }
}

export class GetCustomers {
  constructor(private readonly repo: CustomerRepository) {}
  execute(filters?: CustomerFilters) {
    return this.repo.list(filters);
  }
}

export class GetCustomerById {
  constructor(private readonly repo: CustomerRepository) {}
  async execute(id: string) {
    const customer = await this.repo.getById(id);
    if (!customer) throw new NotFoundError('Cliente no encontrado');
    return customer;
  }
}

/** Búsqueda exacta/parcial de clientes por número de identificación (NIT/CC). */
export class SearchCustomersByDocument {
  constructor(private readonly repo: CustomerRepository) {}
  execute(documento: string, limit?: number) {
    return this.repo.findByDocument(documento, limit);
  }
}

export class UpdateCustomer {
  constructor(private readonly repo: CustomerRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, changes: UpdateCustomerInput, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');
    const updated = await this.repo.update(id, changes);

    if (this.eventBus) {
      this.eventBus.publish(
        new CustomerUpdatedEvent({
          customerId: updated.id!,
          nombre: updated.nombre,
          cambios: changes as Record<string, unknown>,
          asesorId: updated.asesorId ?? undefined,
          asesorNombre: undefined,
        }, requestId)
      );
    }

    return updated;
  }
}

export class AssignAsesor {
  constructor(private readonly repo: CustomerRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, asesorId: string, requestId?: string) {
    const updated = await this.repo.assignAsesor(id, asesorId);

    if (this.eventBus) {
      this.eventBus.publish(
        new CustomerUpdatedEvent({
          customerId: updated.id!,
          nombre: updated.nombre,
          cambios: { asesorId, action: 'assign_asesor' },
          asesorId: updated.asesorId ?? undefined,
          asesorNombre: undefined,
        }, requestId)
      );
    }

    return updated;
  }
}

export class UpdateCupo {
  constructor(private readonly repo: CustomerRepository) {}
  execute(id: string, cupoTotal?: number, cupoUsado?: number, deudaVencida?: number) {
    return this.repo.updateCupo(id, cupoTotal, cupoUsado, deudaVencida);
  }
}

export class DeleteCustomer {
  constructor(private readonly repo: CustomerRepository) {}
  async execute(id: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Cliente no encontrado');
    await this.repo.delete(id);
  }
}

export class GetCustomerTrustedStatus {
  constructor(private readonly repo: CustomerRepository) {}
  async execute(userId: string) {
    return this.repo.getTrustedStatusByUserId(userId);
  }
}
