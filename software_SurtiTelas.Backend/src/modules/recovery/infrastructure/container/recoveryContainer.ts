import { prisma } from '@/config/database';
import { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import { PrismaRecoveryRepository } from '../repositories/PrismaRecoveryRepository';
import { RecoveryTokenService } from '../../domain/services/RecoveryTokenService';
import { ForgotPassword } from '../../application/use-cases/ForgotPassword';
import { ResetPassword } from '../../application/use-cases/ResetPassword';
import { ChangePassword } from '../../application/use-cases/ChangePassword';
import { AdminRecoveryUseCases } from '../../application/use-cases/AdminRecoveryUseCases';
import { AdminResetAccess } from '../../application/use-cases/AdminResetAccess';
import { AuthRepository } from '@/modules/auth/domain/repositories/AuthRepository';
import { PasswordHasher } from '@/modules/auth/domain/services/PasswordHasher';
import { EmailService } from '@/modules/shared/domain/services/EmailService';
import { PrismaAuthRepository } from '@/modules/auth/infrastructure/repositories/PrismaAuthRepository';
import { BcryptPasswordHasher } from '@/modules/auth/infrastructure/services/BcryptPasswordHasher';
import { SmtpEmailService } from '@/modules/shared/infrastructure/services/SmtpEmailService';
import { ConsoleEmailService } from '@/modules/shared/infrastructure/services/ConsoleEmailService';
import { env } from '@/config/env';

let recoveryRepository: RecoveryRepository | null = null;
let recoveryTokenService: RecoveryTokenService | null = null;
let authRepository: AuthRepository | null = null;
let passwordHasher: PasswordHasher | null = null;
let emailService: EmailService | null = null;

const getAuthRepository = (): AuthRepository => {
  if (!authRepository) authRepository = new PrismaAuthRepository(prisma, new BcryptPasswordHasher());
  return authRepository;
};

export const recoveryContainer = {
  repository: (): RecoveryRepository => {
    if (!recoveryRepository) recoveryRepository = new PrismaRecoveryRepository(prisma);
    return recoveryRepository;
  },

  tokenService: (): RecoveryTokenService => {
    if (!recoveryTokenService) recoveryTokenService = new RecoveryTokenService();
    return recoveryTokenService;
  },

  passwordHasher: (): PasswordHasher => {
    if (!passwordHasher) passwordHasher = new BcryptPasswordHasher();
    return passwordHasher;
  },

  emailService: (): EmailService => {
    if (!emailService) {
      const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL);
      if (hasSmtpConfig) {
        emailService = new SmtpEmailService({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          user: env.SMTP_USER!,
          pass: env.SMTP_PASS!,
          fromName: env.SMTP_FROM_NAME,
          fromEmail: env.SMTP_FROM_EMAIL!,
        });
      } else {
        emailService = new ConsoleEmailService();
      }
    }
    return emailService;
  },

  forgotPassword: () =>
    new ForgotPassword(
      getAuthRepository(),
      recoveryContainer.repository(),
      recoveryContainer.tokenService(),
      recoveryContainer.emailService()
    ),

  resetPassword: () =>
    new ResetPassword(
      getAuthRepository(),
      recoveryContainer.repository(),
      recoveryContainer.passwordHasher(),
      recoveryContainer.tokenService()
    ),

  changePassword: () =>
    new ChangePassword(
      getAuthRepository(),
      recoveryContainer.passwordHasher()
    ),

  adminRecovery: () =>
    new AdminRecoveryUseCases(
      recoveryContainer.repository()
    ),

  adminResetAccess: () =>
    new AdminResetAccess(
      getAuthRepository(),
      recoveryContainer.repository(),
      recoveryContainer.tokenService(),
      recoveryContainer.emailService()
    ),
};
