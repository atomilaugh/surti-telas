import type { RecoveryRequest, RecoveryRequestStatus } from '../entities/RecoveryRequest';

export interface RecoveryRepository {
  create(request: {
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<RecoveryRequest>;

  findByTokenHash(tokenHash: string): Promise<RecoveryRequest | null>;
  findById(id: string): Promise<RecoveryRequest | null>;
  findPendingByUserId(userId: string): Promise<RecoveryRequest[]>;

  findAll(filters?: {
    page?: number;
    limit?: number;
    estado?: RecoveryRequestStatus;
    userId?: string;
    email?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ data: RecoveryRequest[]; meta: { total: number; page: number; limit: number } }>;

  update(id: string, data: {
    estado?: RecoveryRequestStatus;
    completedAt?: Date | null;
    resultado?: string | null;
  }): Promise<RecoveryRequest>;

  markCompleted(id: string, resultado?: string): Promise<void>;
  markExpired(id: string): Promise<void>;
  markRejected(id: string, resultado: string): Promise<void>;
}
