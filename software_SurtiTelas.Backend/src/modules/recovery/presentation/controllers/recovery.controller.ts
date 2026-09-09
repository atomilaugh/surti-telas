import { Request, Response } from 'express';
import { ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { recoveryContainer } from '../../infrastructure/container/recoveryContainer';
import { ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema, AdminResetAccessSchema, RecoveryRequestFiltersSchema } from '../validators/recovery.validators';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { PasswordResetAttemptedEvent } from '../../../../shared/application/events';

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = parseDto(ForgotPasswordSchema, req.body);
  const result = await recoveryContainer.forgotPassword().execute(
    email,
    req.requestId,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, result, result.message);
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = parseDto(ResetPasswordSchema, req.body);

  let userForAudit: { id: string; email: string } | null = null;
  try {
    const result = await recoveryContainer.resetPassword().execute(
      token,
      newPassword,
      req.requestId,
      req.ip,
      req.get('user-agent')
    );
    userForAudit = result.user;
    return ok(res, null, 'Contraseña restablecida correctamente');
  } catch (error) {
    const fallbackEmail = (req.body?.email as string | undefined) || '';
    eventBus.publish(
      new PasswordResetAttemptedEvent({
        userId: userForAudit?.id ?? 'unknown',
        email: userForAudit?.email ?? fallbackEmail,
        success: false,
        reason: error instanceof Error ? error.message : 'unknown_error',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }),
      req.requestId
    );
    throw error;
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = parseDto(ChangePasswordSchema, req.body);
  await recoveryContainer.changePassword().execute(
    req.user!.id,
    currentPassword,
    newPassword,
    req.requestId,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, null, 'Contraseña actualizada correctamente');
};

export const adminResetAccess = async (req: Request, res: Response) => {
  const { userId } = parseDto(AdminResetAccessSchema, req.params);
  const result = await recoveryContainer.adminResetAccess().execute(
    userId,
    req.user!.id,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, result, result.message);
};

export const listRecoveryRequests = async (req: Request, res: Response) => {
  const filters = parseDto(RecoveryRequestFiltersSchema, req.query);
  const result = await recoveryContainer.adminRecovery().listRequests({
    ...filters,
    estado: filters.estado as any,
  });
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    undefined
  );
  return ok(res, response);
};

export const getRecoveryRequest = async (req: Request, res: Response) => {
  const request = await recoveryContainer.adminRecovery().getRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Solicitud no encontrada' });
  }
  return ok(res, request);
};

export const rejectRecoveryRequest = async (req: Request, res: Response) => {
  const { motivo } = req.body as { motivo?: string };
  if (!motivo) {
    return res.status(400).json({ success: false, error: 'bad_request', message: 'Motivo requerido' });
  }
  await recoveryContainer.adminRecovery().rejectRequest(req.params.id, motivo, req.user!.id);
  return ok(res, null, 'Solicitud rechazada');
};
