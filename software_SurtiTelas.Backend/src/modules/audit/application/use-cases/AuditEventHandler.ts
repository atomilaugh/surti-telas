import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { auditService } from '../../../../shared/domain/services/AuditService';

const EVENT_ACTION_MAP: Record<string, { action: string; module: string; result: string }> = {
  'order.created': { action: 'ORDER_CREATED', module: 'orders', result: 'SUCCESS' },
  'order.status.updated': { action: 'ORDER_STATUS_UPDATED', module: 'orders', result: 'SUCCESS' },
  'order.delivered': { action: 'ORDER_DELIVERED', module: 'orders', result: 'SUCCESS' },
  'order.canceled': { action: 'ORDER_CANCELED', module: 'orders', result: 'SUCCESS' },
  'stock.below_minimum': { action: 'STOCK_BELOW_MINIMUM', module: 'stock', result: 'FAILURE' },
  'production.completed': { action: 'PRODUCTION_COMPLETED', module: 'production', result: 'SUCCESS' },
  'user.login': { action: 'AUTH_LOGIN_SUCCESS', module: 'auth', result: 'SUCCESS' },
  'user.permission.changed': { action: 'PERMISSION_ASSIGNED', module: 'permissions', result: 'SUCCESS' },
  'report.exported': { action: 'REPORT_EXPORTED', module: 'reports', result: 'SUCCESS' },
  'delivery.updated': { action: 'DELIVERY_UPDATED', module: 'deliveries', result: 'SUCCESS' },
  'commission.calculated': { action: 'COMMISSION_CALCULATED', module: 'commissions', result: 'SUCCESS' },
  'alert.triggered': { action: 'ALERT_TRIGGERED', module: 'alerts', result: 'FAILURE' },
  'auth.password_reset.attempted': { action: 'PASSWORD_RESET_ATTEMPTED', module: 'recovery', result: 'FAILURE' },
  'auth.password_reset.requested': { action: 'PASSWORD_RESET_REQUESTED', module: 'recovery', result: 'SUCCESS' },
  'auth.password_reset.completed': { action: 'PASSWORD_RESET_COMPLETED', module: 'recovery', result: 'SUCCESS' },
  'auth.password_reset.expired': { action: 'PASSWORD_RESET_EXPIRED', module: 'recovery', result: 'FAILURE' },
  'auth.password_reset.rejected': { action: 'PASSWORD_RESET_REJECTED', module: 'recovery', result: 'DENIED' },
  'auth.password.changed': { action: 'PASSWORD_CHANGED', module: 'auth', result: 'SUCCESS' },
  'auth.admin.forced_password_reset': { action: 'ADMIN_FORCED_PASSWORD_RESET', module: 'recovery', result: 'SUCCESS' },
};

export function registerAuditEventHandlers(): void {
  const events = Object.keys(EVENT_ACTION_MAP);

  for (const eventType of events) {
    eventBus.subscribe(eventType, async (event: unknown) => {
      try {
        const typed = event as { occurredAt?: Date; payload?: Record<string, unknown> };
        const payload = typed.payload ?? {};
        const mapping = EVENT_ACTION_MAP[eventType];
        const metadata: Record<string, unknown> = {};

        if (eventType === 'order.status.updated') {
          metadata.previousStatus = payload.previousStatus ?? null;
          metadata.newStatus = payload.newStatus ?? null;
        }

        if (eventType.startsWith('auth.password_reset') || eventType === 'auth.password.changed') {
          metadata.success = payload.success ?? null;
          metadata.reason = payload.reason ?? null;
          metadata.email = payload.email ?? null;
        }

        await auditService.register({
          actorUserId: (payload.actorId as string | undefined) ?? (payload.userId as string | undefined) ?? null,
          targetUserId: (payload.userId as string | undefined) ?? null,
          action: mapping.action,
          module: mapping.module,
          result: mapping.result as 'SUCCESS' | 'FAILURE' | 'DENIED',
          entityType: (payload.entityType as string | undefined) ?? null,
          entityId: (payload.resourceId as string | undefined) ?? (payload.recoveryRequestId as string | undefined) ?? null,
          ip: (payload.ip as string | undefined) ?? (payload.ipAddress as string | undefined) ?? null,
          userAgent: payload.userAgent as string | undefined,
          metadata,
        });
      } catch (err) {
        console.error('[Audit] Failed to persist audit event', {
          accion: eventType,
          error: (err as Error).message,
        });
      }
    });
  }

  console.log(`[Audit] Registered ${events.length} event handlers`);
}
