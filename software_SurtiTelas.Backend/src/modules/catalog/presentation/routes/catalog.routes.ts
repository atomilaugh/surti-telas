import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../auth/presentation/middlewares/authenticate';
import { requirePermission, requireRole } from '../../../auth/presentation/middlewares/authorize';
import { cacheMiddleware } from '../../../../modules/shared/presentation/middlewares/cache';
import { sensitiveUserRateLimiter } from '../../../../modules/shared/presentation/middlewares/sensitiveUserRateLimiter';
import { upload } from '../../../../modules/shared/presentation/middlewares/upload';
import type { Request, Response, NextFunction } from 'express';
import * as controller from '../controllers/catalog.controller';

/**
 * @swagger
 * /catalog/products:
 *   get:
 *     tags: [Catalog]
 *     summary: List products with pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string, example: Camiseta }
 *     responses:
 *       200:
 *         description: Paginated products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedProducts'
 */
export const catalogRouter = Router();

const cache60s = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const middleware = await cacheMiddleware(60_000);
  return middleware(req, res, next);
});

catalogRouter.get('/products', cache60s, asyncHandler(controller.listProducts));

/**
 * @swagger
 * /catalog/products/brands:
 *   get:
 *     tags: [Catalog]
 *     summary: List distinct product brands
 *     responses:
 *       200:
 *         description: Distinct brands list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: Nike
 */
catalogRouter.get('/products/brands', asyncHandler(controller.listBrands));
catalogRouter.get('/products/subcategories', asyncHandler(controller.listSubcategories));

/**
 * @swagger
 * /catalog/products/{ref}:
 *   get:
 *     tags: [Catalog]
 *     summary: Get product by ref
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
catalogRouter.get('/products/:ref', asyncHandler(controller.getProduct));

/**
 * @swagger
 * /catalog/products:
 *   post:
 *     tags: [Catalog]
 *     summary: Create product
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *           example:
 *             ref: REF-001
 *             nombre: Camiseta básica
 *             categoria: Camisetas
 *             precio: 25000
 *             cantidadStock: 100
 *             stock: OK
 *             estado: Activo
 *             tela: Algodón
 *             colores: ['Blanco']
 *             tallas: ['M']
 *             imagenes: []
 *             publicado: true
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Producto creado }
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
catalogRouter.post(
  '/products',
  authenticate,
  requirePermission('catalog:create'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.createProduct)
);

/**
 * @swagger
 * /catalog/products/{ref}:
 *   patch:
 *     tags: [Catalog]
 *     summary: Update product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nombre: Camiseta actualizada
 *             precio: 27000
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Producto actualizado }
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
catalogRouter.patch(
  '/products/:ref',
  authenticate,
  requirePermission('catalog:update'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.updateProduct)
);

/**
 * @swagger
 * /catalog/products/{ref}:
 *   delete:
 *     tags: [Catalog]
 *     summary: Delete product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Producto eliminado }
 */
catalogRouter.delete(
  '/products/:ref',
  authenticate,
  requirePermission('catalog:delete'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.deleteProduct)
);

/**
 * @swagger
 * /catalog/products/{ref}/publish:
 *   post:
 *     tags: [Catalog]
 *     summary: Publish product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product published
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Producto publicado }
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
catalogRouter.post(
  '/products/:ref/publish',
  authenticate,
  requirePermission('catalog:publish'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.publishProduct)
);

/**
 * @swagger
 * /catalog/products/{ref}/unpublish:
 *   post:
 *     tags: [Catalog]
 *     summary: Unpublish product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product unpublished
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Producto despublicado }
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 */
catalogRouter.post(
  '/products/:ref/unpublish',
  authenticate,
  requirePermission('catalog:publish'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.unpublishProduct)
);

/**
 * @swagger
 * /catalog/categories:
 *   get:
 *     tags: [Catalog]
 *     summary: List categories
 *     responses:
 *       200:
 *         description: Categories list
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
 *                       id: { type: 'string', example: 'cat-1' }
 *                       nombre: { type: 'string', example: 'Camisetas' }
 *                       slug: { type: 'string', example: 'camisetas' }
 */
catalogRouter.get('/categories', cache60s, asyncHandler(controller.listCategories));

/**
 * @swagger
 * /catalog/categories:
 *   post:
 *     tags: [Catalog]
 *     summary: Create category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nombre: Camisetas
 *             slug: camisetas
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Categoría creada }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: 'string', example: 'cat-1' }
 *                     nombre: { type: 'string', example: 'Camisetas' }
 *                     slug: { type: 'string', example: 'camisetas' }
 */
catalogRouter.post(
  '/categories',
  authenticate,
  requireRole('ADMIN'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.createCategory)
);

catalogRouter.get('/categories/stock-status', asyncHandler(controller.getCategoriesWithLowStock));

catalogRouter.get('/categories/:id', asyncHandler(controller.getCategory));

catalogRouter.patch(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.updateCategory)
);

catalogRouter.delete(
  '/categories/:id',
  authenticate,
  requireRole('ADMIN'),
  sensitiveUserRateLimiter,
  asyncHandler(controller.deleteCategory)
);

/**
 * @swagger
 * /catalog/products/{ref}/images:
 *   post:
 *     tags: [Catalog]
 *     summary: Upload product image
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ref
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
catalogRouter.post('/products/:ref/images', authenticate, requirePermission('catalog:update'), upload.single('file'), asyncHandler(controller.uploadProductImage));
