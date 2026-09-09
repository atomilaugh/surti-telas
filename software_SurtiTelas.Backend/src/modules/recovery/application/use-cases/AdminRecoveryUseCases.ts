import { NotFoundError, ForbiddenError } from '../../../../shared/domain/errors';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryRequest, RecoveryRequestStatus } from '../../domain/entities/RecoveryRequest';
import { AdminForcedPasswordResetEvent } from '../../../../shared/application/events';
import { eventBus } from '../../../../shared/infrastructure/eventBus';

export class AdminRecoveryUseCases {
  constructor(
    private readonly recoveryRepo: RecoveryRepository
  ) {}

  async listRequests(filters?: {
    page?: number;
    limit?: number;
    estado?: RecoveryRequestStatus;
    userId?: string;
    email?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ data: RecoveryRequest[]; meta: { total: number; page: number; limit: number } }> {
    return this.recoveryRepo.findAll(filters);
  }

  async getRequest(id: string): Promise<RecoveryRequest | null> {
    return this.recoveryRepo.findById(id);
  }

  async rejectRequest(id: string, motivo: string, actorId: string): Promise<void> {
    const request = await this.recoveryRepo.findById(id);
    if (!request) throw new NotFoundError('Solicitud no encontrada');
    if (request.estado !== 'PENDIENTE') {
      throw new ForbiddenError('La solicitud ya fue procesada');
    }

    await this.recoveryRepo.markRejected(id, motivo);

    eventBus.publish(
      new AdminForcedPasswordResetEvent({
        userId: request.userId,
        email: request.email,
        actorId,
        action: 'rejected',
        motivo,
        recoveryRequestId: id,
      })
    );
  }
}
