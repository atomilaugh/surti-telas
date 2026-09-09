import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { sensitiveUserRateLimiter } from '../../../../modules/shared/presentation/middlewares/sensitiveUserRateLimiter';
import { recoveryRateLimiter } from '../../../../modules/shared/presentation/middlewares/recoveryRateLimiter';
import { avatarUpload } from '../middlewares/avatarUpload';
import * as controller from '../controllers/auth.controller';

export const authRouter = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: admin@surtitelas.com
 *             password: SurtiTelas2025*
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Sesión iniciada }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: eyJhbGciOi... }
 *                     refreshToken: { type: string, example: eyJhbGciOi... }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string, example: user-123 }
 *                         email: { type: string, example: admin@surtitelas.com }
 *                         nombre: { type: string, example: Administrador }
 *                         role: { type: string, example: ADMIN }
 *                         permissions:
 *                           type: array
 *                           items: { type: string }
 *                           example: ['catalog:read', 'orders:create']
 */
authRouter.post('/login', sensitiveUserRateLimiter, asyncHandler(controller.login));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: nuevo@surtitelas.com
 *             password: Password123!
 *             nombre: Nuevo Usuario
 *             role: VENDEDOR
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Usuario creado }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: user-456 }
 *                     email: { type: string, example: nuevo@surtitelas.com }
 */
authRouter.post('/register', asyncHandler(controller.register));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             refreshToken: eyJhbGciOi...
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: eyJhbGciOi... }
 */
authRouter.post('/refresh', sensitiveUserRateLimiter, asyncHandler(controller.refresh));

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login with Google
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             idToken: eyJhbGciOi...
 *     responses:
 *       200:
 *         description: Google login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Autenticado con Google }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string, example: eyJhbGciOi... }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string, example: cmrgx18p5000ikgwnffq16bul }
 *                         email: { type: string, example: admin@surtitelas.com }
 *                         nombre: { type: string, example: Administrador }
 *                         role: { type: string, example: ADMIN }
 *                         permissions:
 *                           type: array
 *                           items: { type: string }
 */
authRouter.post('/google', sensitiveUserRateLimiter, asyncHandler(controller.google));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Sesión cerrada }
 */
authRouter.post('/logout', asyncHandler(controller.logout));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: user-123 }
 *                     email: { type: string, example: admin@surtitelas.com }
 *                     nombre: { type: string, example: Administrador }
 *                     role: { type: string, example: ADMIN }
 *                     permissions:
 *                       type: array
 *                       items: { type: string }
 *                       example: ['catalog:read', 'orders:create']
  */
  authRouter.get('/me', authenticate, asyncHandler(controller.me));

  authRouter.post('/me/avatar', authenticate, avatarUpload.single('file'), asyncHandler(controller.uploadAvatar));

  /**
   * @swagger
   * /auth/me:
   *   patch:
   *     tags: [Auth]
   *     summary: Update current user profile
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nombre:
   *                 type: string
   *                 example: Juan Pérez
   *               telefono:
   *                 type: string
   *                 example: "3001234567"
   *     responses:
   *       200:
   *         description: Updated user
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean, example: true }
   *                 data:
   *                   type: object
   *                   properties:
   *                     id: { type: string, example: user-123 }
   *                     email: { type: string, example: admin@surtitelas.com }
   *                     nombre: { type: string, example: Administrador }
   *                     role: { type: string, example: ADMIN }
   */
  authRouter.patch('/me', authenticate, asyncHandler(controller.updateProfile));

/**
 * @swagger
 * /auth/users:
 *   get:
 *     tags: [Auth]
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, example: user-123 }
 *                       email: { type: string, example: admin@surtitelas.com }
 *                       nombre: { type: string, example: Administrador }
 *                       role: { type: string, example: ADMIN }
 */
authRouter.get('/users', authenticate, requireRole('ADMIN'), asyncHandler(controller.listUsers));
authRouter.get('/users/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.getUser));

/**
 * @swagger
 * /auth/permissions:
 *   get:
 *     tags: [Auth]
 *     summary: List permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permissions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, example: perm-123 }
 *                       nombre: { type: string, example: catalog:read }
 *                       descripcion: { type: string, example: Ver catálogo }
 */
authRouter.get('/permissions', authenticate, requireRole('ADMIN'), asyncHandler(controller.listPermissions));
authRouter.get('/permissions/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.getPermission));
authRouter.patch('/permissions/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.updatePermission));
authRouter.delete('/permissions/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.deletePermission));

authRouter.get('/roles', authenticate, requireRole('ADMIN'), asyncHandler(controller.listRoles));
authRouter.get('/roles/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.getRole));
authRouter.post('/roles', authenticate, requireRole('ADMIN'), asyncHandler(controller.createRole));
authRouter.patch('/roles/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.updateRole));
authRouter.delete('/roles/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.deleteRole));

/**
 * @swagger
 * /auth/permissions:
 *   post:
 *     tags: [Auth]
 *     summary: Create permission
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nombre: catalog:read
 *             descripcion: Ver catálogo
 *     responses:
 *       201:
 *         description: Permission created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Permiso creado }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: perm-123 }
 *                     nombre: { type: string, example: catalog:read }
 */
authRouter.post('/permissions', authenticate, requireRole('ADMIN'), asyncHandler(controller.createPermission));

/**
 * @swagger
 * /auth/roles/{role}/permissions:
 *   get:
 *     tags: [Auth]
 *     summary: List permissions for role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Role permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, example: perm-123 }
 *                       nombre: { type: string, example: catalog:read }
 */
authRouter.get('/roles/:role/permissions', authenticate, requireRole('ADMIN'), asyncHandler(controller.listRolePermissions));

/**
 * @swagger
 * /auth/roles/{role}/permissions:
 *   post:
 *     tags: [Auth]
 *     summary: Assign permission to role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             permissionId: perm-123
 *     responses:
 *       200:
 *         description: Permission assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Permiso asignado }
 */
authRouter.post('/roles/:role/permissions', authenticate, requireRole('ADMIN'), asyncHandler(controller.assignPermissionToRole));

/**
 * @swagger
 * /auth/roles/{role}/permissions:
 *   delete:
 *     tags: [Auth]
 *     summary: Remove permission from role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: permissionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Permission removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Permiso removido }
 */
authRouter.delete('/roles/:role/permissions', authenticate, requireRole('ADMIN'), asyncHandler(controller.removePermissionFromRole));

authRouter.post('/2fa/enable', authenticate, asyncHandler(controller.enableTwoFactor));
authRouter.post('/2fa/verify', sensitiveUserRateLimiter, asyncHandler(controller.verifyTwoFactor));
authRouter.post('/2fa/disable', authenticate, asyncHandler(controller.disableTwoFactor));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Forgot password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: usuario@surtitelas.com
 *     responses:
 *       200:
 *         description: If the email exists, reset instructions will be sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Si el correo existe, recibirás instrucciones para restablecer tu contraseña }
 */
authRouter.post('/forgot-password', recoveryRateLimiter, asyncHandler(controller.forgotPassword));

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             token: abc123
 *             newPassword: NuevaPass123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Contraseña restablecida correctamente }
 */
authRouter.post('/reset-password', recoveryRateLimiter, asyncHandler(controller.resetPassword));

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password for authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             currentPassword: OldPass123!
 *             newPassword: NewPass123!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Contraseña actualizada correctamente }
 */
authRouter.post('/change-password', authenticate, recoveryRateLimiter, asyncHandler(controller.changePassword));

authRouter.post('/users', authenticate, requireRole('ADMIN'), sensitiveUserRateLimiter, asyncHandler(controller.createUser));
authRouter.patch('/users/:id/status', authenticate, requireRole('ADMIN'), sensitiveUserRateLimiter, asyncHandler(controller.updateUserStatus));
authRouter.patch('/users/:id', authenticate, requireRole('ADMIN'), asyncHandler(controller.updateUser));
authRouter.delete('/users/:id', authenticate, requireRole('ADMIN'), sensitiveUserRateLimiter, asyncHandler(controller.deleteUser));

/**
 * @swagger
 * /auth/permissions/:id/status:
 *   patch:
 *     tags: [Auth]
 *     summary: Toggle permission status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             estado: ACTIVO
 *     responses:
 *       200:
 *         description: Permission status updated
 */
authRouter.patch('/permissions/:id/status', authenticate, requireRole('ADMIN'), asyncHandler(controller.updatePermissionStatus));

/**
 * @swagger
 * /auth/roles/:id/status:
 *   patch:
 *     tags: [Auth]
 *     summary: Toggle role status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: ADMIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             estado: Activo
 *     responses:
 *       200:
 *         description: Role status updated
 */
authRouter.patch('/roles/:id/status', authenticate, requireRole('ADMIN'), asyncHandler(controller.updateRoleStatus));
