import { Prisma, PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../../shared/domain/errors';
import { Product, ProductColorStockData, normalizeColorStock } from '../../domain/entities/Product';
import { computeStockStatus, colorsFromVariants, sizesFromVariants, sumColorStock, variantKey } from '../../domain/entities/Product';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from '../../domain/repositories/ProductRepository';
import {
  toColorStockDataInput,
  toColorStockUpdateMany,
  toCreateInput,
  toProductData,
  toUpdateInput,
} from '../mappers/ProductMapper';

const COLOR_STOCK_INCLUDE = { stockPorColor: { where: { deletedAt: null } } } as const;

/**
 * Devuelve las variantes (color + talla) normalizadas cuando el cliente las
 * envia, o `null` cuando la peticion solo manipula el stock global legado.
 */
function resolveVariantes(input: { stockPorColor?: unknown }): ProductColorStockData[] | null {
  if (!Array.isArray(input.stockPorColor) || input.stockPorColor.length === 0) return null;
  const raw = input.stockPorColor as Array<Partial<ProductColorStockData>>;
  return normalizeColorStock(
    undefined,
    raw.map((v) => ({
      color: String(v?.color ?? ''),
      size: v?.size === undefined || v?.size === null ? undefined : String(v.size),
      cantidad: Number(v?.cantidad ?? 0),
    })),
  );
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ProductFilters = {}): Promise<{ data: Product[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };
    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { ref: { contains: filters.search, mode: 'insensitive' } },
        { codigo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.categoriaId) where.categoriaId = filters.categoriaId;
    else if (filters.categoria) {
      const categoria = await this.prisma.category.findFirst({
        where: {
          OR: [
            { nombre: { contains: filters.categoria, mode: 'insensitive' } },
            { slug: { contains: filters.categoria, mode: 'insensitive' } },
          ],
        },
      });
      if (categoria) where.categoriaId = categoria.id;
    }
    if (filters.publicado !== undefined) where.publicado = filters.publicado;
    if (filters.destacado !== undefined) where.destacado = filters.destacado;
    if (filters.marca) where.marca = filters.marca;
    if (filters.marcas && filters.marcas.length > 0) where.marca = { in: filters.marcas };
    if (filters.categoriasEspeciales && filters.categoriasEspeciales.length > 0) {
      where.categoria = {
        nombre: { in: filters.categoriasEspeciales, mode: 'insensitive' },
      };
    }
    if (filters.tallas && filters.tallas.length > 0) {
      where.tallas = { hasSome: filters.tallas };
    }

    const limit = filters.limit ?? 50;
    const sort = filters.sort ?? 'createdAt';
    const order = filters.order ?? 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ [sort]: order }, { id: order }];

    const cursorId = filters.cursor ? Buffer.from(filters.cursor, 'base64').toString('utf-8') : undefined;

    if (cursorId) {
      const cursorWhere: Prisma.ProductWhereInput = {
        ...where,
        OR: [
          { id: order === 'asc' ? { gt: cursorId } : { lt: cursorId } },
        ],
      };

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where: cursorWhere,
          include: { categoria: true, ...COLOR_STOCK_INCLUDE },
          orderBy,
          take: limit + 1,
        }),
        this.prisma.product.count({ where }),
      ]);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? Buffer.from(data[data.length - 1].id).toString('base64') : undefined;

      return {
        data: data.map((r) => new Product(toProductData(r))),
        meta: { total, page: 1, limit, nextCursor },
      };
    }

    const page = filters.page ?? 1;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { categoria: true, ...COLOR_STOCK_INCLUDE },
        orderBy: orderBy as Prisma.ProductOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: rows.map((r) => new Product(toProductData(r))),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { categoria: true, ...COLOR_STOCK_INCLUDE },
    });
    return row ? new Product(toProductData(row)) : null;
  }

  async getByRef(ref: string): Promise<Product | null> {
    const row = await this.prisma.product.findFirst({
      where: { ref, deletedAt: null },
      include: { categoria: true, ...COLOR_STOCK_INCLUDE },
    });
    return row ? new Product(toProductData(row)) : null;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const categoriaId = await this.resolveCategoriaId(input);
    const ref = input.ref?.trim() || `REF-${Date.now()}`;
    const codigo = input.codigo?.trim() || ref;
    const variantes = resolveVariantes(input);
    const stock = computeStockStatus(variantes ? sumColorStock(variantes) : input.cantidadStock);
    const product = new Product({
      ...input,
      cantidadStock: variantes ? sumColorStock(variantes) : input.cantidadStock ?? 0,
      stock,
      ref,
      codigo,
    });
    const row = await this.prisma.product.create({
      data: {
        ...toCreateInput(product, categoriaId, ref),
        ...(product.stockPorColor.length > 0
          ? { stockPorColor: { create: toColorStockDataInput(product.stockPorColor) } }
          : {}),
      } as Prisma.ProductCreateInput,
      include: { categoria: true, ...COLOR_STOCK_INCLUDE },
    });
    return new Product(toProductData(row));
  }

  async update(ref: string, changes: UpdateProductInput): Promise<Product> {
    const existing = await this.getByRef(ref);
    if (!existing) throw new NotFoundError('Producto no encontrado');

    const categoriaId =
      changes.categoriaId !== undefined
        ? changes.categoriaId
        : changes.categoria !== undefined
          ? await this.resolveCategoriaId({ ...changes, categoria: changes.categoria })
          : undefined;

    const variantes = resolveVariantes(changes);
    const total = variantes ? sumColorStock(variantes) : undefined;
    const colores = variantes ? colorsFromVariants(variantes) : undefined;
    const tallas = variantes ? sizesFromVariants(variantes) : undefined;
    const data = toUpdateInput({
      ...changes,
      categoriaId: categoriaId ?? undefined,
      ...(variantes ? { cantidadStock: total, colores, stock: computeStockStatus(total!) } : {}),
      ...(variantes && tallas && tallas.length > 0 ? { tallas } : {}),
    });
    const row = await this.prisma.product.update({
      where: { ref },
      data: data as Prisma.ProductUpdateInput,
      include: { categoria: true, ...COLOR_STOCK_INCLUDE },
    });
    if (variantes && colores) {
      await this.prisma.$transaction(
        toColorStockUpdateMany(row.id, variantes).map((upsert) => this.prisma.productColorStock.upsert(upsert)),
      );
      // Se retiran (soft delete) las combinaciones color/talla que ya no existen.
      const vigentes = new Set(variantes.map((v) => variantKey(v.color, v.size)));
      const actuales = await this.prisma.productColorStock.findMany({
        where: { productId: row.id, deletedAt: null },
        select: { id: true, color: true, size: true },
      });
      const obsoletas = actuales.filter((v) => !vigentes.has(variantKey(v.color, v.size))).map((v) => v.id);
      if (obsoletas.length > 0) {
        await this.prisma.productColorStock.updateMany({
          where: { id: { in: obsoletas } },
          data: { deletedAt: new Date() },
        });
      }
      const refreshed = await this.prisma.product.findUniqueOrThrow({
        where: { id: row.id },
        include: { categoria: true, ...COLOR_STOCK_INCLUDE },
      });
      return new Product(toProductData(refreshed));
    }
    return new Product(toProductData(row));
  }

  async delete(ref: string): Promise<void> {
    const existing = await this.getByRef(ref);
    if (!existing) throw new NotFoundError('Producto no encontrado');
    await this.prisma.product.update({ where: { ref }, data: { deletedAt: new Date() } });
  }

  async getBrands(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { deletedAt: null, marca: { not: null } },
      select: { marca: true },
      distinct: ['marca'],
      orderBy: { marca: 'asc' },
    });
    return rows.map((r) => r.marca!).filter((m): m is string => Boolean(m && m.trim()));
  }

  private async resolveCategoriaId(input: { categoria?: string; categoriaId?: string }): Promise<string | null> {
    if (input.categoriaId) return input.categoriaId;
    if (!input.categoria) return null;
    const category = await this.prisma.category.findFirst({
      where: { OR: [{ slug: input.categoria }, { nombre: input.categoria }] },
    });
    if (!category) {
      throw new BadRequestError(`Categoría "${input.categoria}" no existe`);
    }
    return category.id;
  }
}
