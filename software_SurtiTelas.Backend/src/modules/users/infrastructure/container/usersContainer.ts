import { prisma } from '../../../../config/database';
import { BcryptPasswordHasher } from '../../../auth/infrastructure/services/BcryptPasswordHasher';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { SmtpEmailService } from '../../../shared/infrastructure/services/SmtpEmailService';
import { ConsoleEmailService } from '../../../shared/infrastructure/services/ConsoleEmailService';
import { env } from '../../../../config/env';
import {
  ListUsers,
  GetUserById,
  CreateUser,
  UpdateUser,
  DeleteUser,
  UpdateUserStatus,
  ChangeUserRole,
  LockUser,
  UnlockUser,
  GetUserPermissions,
  ResetUserAccess,
} from '../../application/use-cases/UserUseCases';

const passwordHasher = new BcryptPasswordHasher();
const userRepository = new PrismaUserRepository(prisma, passwordHasher);

const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL);
const emailService = hasSmtpConfig
  ? new SmtpEmailService({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
      fromName: env.SMTP_FROM_NAME,
      fromEmail: env.SMTP_FROM_EMAIL!,
    })
  : new ConsoleEmailService();

const emailAdapter = {
  sendPasswordReset: async (email: string, token: string): Promise<void> => {
    await emailService.sendPasswordReset(email, token);
  },
};

export const userUseCases = {
  listUsers: new ListUsers(userRepository),
  getUserById: new GetUserById(userRepository),
  createUser: new CreateUser(userRepository),
  updateUser: new UpdateUser(userRepository),
  deleteUser: new DeleteUser(userRepository, prisma),
  updateUserStatus: new UpdateUserStatus(userRepository),
  changeUserRole: new ChangeUserRole(userRepository, prisma),
  lockUser: new LockUser(userRepository),
  unlockUser: new UnlockUser(userRepository),
  getUserPermissions: new GetUserPermissions(userRepository),
  resetUserAccess: new ResetUserAccess(userRepository, emailAdapter),
};
