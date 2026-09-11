export interface AuditLogData {
  id?: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  accion: string;
  modulo: string;
  result?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  referenciaId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt?: Date;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    role: string;
  } | null;
}

export class AuditLog {
  readonly id?: string;
  readonly actorUserId?: string | null;
  readonly targetUserId?: string | null;
  readonly accion: string;
  readonly modulo: string;
  readonly result?: string | null;
  readonly entityType?: string | null;
  readonly entityId?: string | null;
  readonly ip?: string | null;
  readonly userAgent?: string | null;
  readonly metadata?: unknown;
  readonly createdAt?: Date;
  readonly usuario?: { id: string; nombre: string; email: string; role: string } | null;

  constructor(data: AuditLogData) {
    this.id = data.id;
    this.actorUserId = data.actorUserId;
    this.targetUserId = data.targetUserId;
    this.accion = data.accion;
    this.modulo = data.modulo;
    this.result = data.result;
    this.entityType = data.entityType;
    this.entityId = data.entityId ?? data.referenciaId ?? null;
    this.ip = data.ip;
    this.userAgent = data.userAgent;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.usuario = data.usuario;
  }
}
