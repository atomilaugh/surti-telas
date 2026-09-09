export enum RecoveryRequestStatus {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  EXPIRADA = 'EXPIRADA',
  RECHAZADA = 'RECHAZADA',
}

export interface RecoveryRequest {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  completedAt?: Date | null;
  estado: RecoveryRequestStatus;
  ip?: string | null;
  userAgent?: string | null;
  resultado?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
