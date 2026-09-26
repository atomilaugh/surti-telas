import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaProductRepository } from '@/modules/catalog/infrastructure/repositories/PrismaProductRepository';
import { Product } from '@/modules/catalog/domain/entities/Product';

const mockPrisma = {
  product: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  productColorStock: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  category: { findFirst: vi.fn() },
  $transaction: vi.fn(),
} as any;

const repo = new PrismaProductRepository(mockPrisma as any);

describe('PrismaProductRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeRow = (overrides = {}) => ({
    id: '1',
    ref: 'REF-001',
    nombre: 'Camiseta',
    descripcion: null,
    descripcionCorta: null,
    categoriaId: null,
    categoria: { nombre: 'Camisetas' },
    subcategoria: null,
    marca: null,
    precio: { toNumber: () => 25000 },
    precioAnterior: { toNumber: () => 30000 },
    descuento: 0,
    cantidadStock: 100,
    stockStatus: 'OK',
    estado: 'ACTIVO',
    publicado: true,
    fechaPublicacion: null,
    destacado: false,
    oferta: false,
    nuevo: false,
    masVendido: false,
    tela: 'Algodón',
    colores: ['Blanco'],
    tallas: ['M'],
    imagenPrincipal: null,
    imagenes: [],
    stockPorColor: [
      { id: 'cs-1', color: 'Blanco', cantidad: 60, stockStatus: 'OK' },
      { id: 'cs-2', color: 'Negro', cantidad: 40, stockStatus: 'OK' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  it('should list products', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      [makeRow()],
      1,
    ]);

    const result = await repo.list();
    expect(result.data).toHaveLength(1);
  });

  it('should get product by id', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(makeRow());

    const result = await repo.getById('1');
    expect(result?.ref).toBe('REF-001');
  });

  it('should create product', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat1', nombre: 'Camisetas', slug: 'camisetas' });
    mockPrisma.product.create.mockResolvedValue(makeRow());

    const product = new Product({
      id: '1',
      ref: 'REF-001',
      nombre: 'Camiseta',
      precio: 25000,
      cantidadStock: 100,
      stock: 'OK',
      estado: 'Activo',
      categoria: 'Camisetas',
      tela: 'Algodón',
      colores: ['Blanco'],
      tallas: ['M'],
      imagenes: [],
      publicado: true,
      fecha: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await repo.create(product);
    expect(result.ref).toBe('REF-001');
  });

  it('should update product', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(makeRow());
    mockPrisma.product.update.mockResolvedValue(makeRow({ nombre: 'Camiseta Updated' }));

    const result = await repo.update('REF-001', { nombre: 'Camiseta Updated' });
    expect(result.nombre).toBe('Camiseta Updated');
  });

  it('should soft delete product', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(makeRow());
    mockPrisma.product.update.mockResolvedValue({});

    await repo.delete('REF-001');
    expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { ref: 'REF-001' }, data: { deletedAt: expect.any(Date) } });
  });

  it('should create product with stock per color', async () => {
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat1', nombre: 'Camisetas', slug: 'camisetas' });
    mockPrisma.product.create.mockResolvedValue(
      makeRow({ colores: ['Azul', 'Gris', 'Rojo'], cantidadStock: 41, stockPorColor: [
        { id: 'cs-azul', color: 'Azul', cantidad: 11, stockStatus: 'OK' },
        { id: 'cs-gris', color: 'Gris', cantidad: 20, stockStatus: 'OK' },
        { id: 'cs-rojo', color: 'Rojo', cantidad: 10, stockStatus: 'OK' },
      ] })
    );

    const result = await repo.create({
      ref: 'REF-003',
      nombre: 'Camiseta de algodón',
      categoria: 'Camisetas',
      precio: 25000,
      cantidadStock: 41,
      stock: 'OK',
      publicado: false,
      tela: 'Algodón',
      tallas: ['M'],
      imagenes: [],
      colores: ['Azul', 'Gris', 'Rojo'],
      stockPorColor: [
        { color: 'Azul', cantidad: 11 },
        { color: 'Gris', cantidad: 20 },
        { color: 'Rojo', cantidad: 10 },
      ],
    });

    const data = mockPrisma.product.create.mock.calls[0][0].data;
    expect(data.cantidadStock).toBe(41);
    expect(data.colores).toEqual(['Azul', 'Gris', 'Rojo']);
    expect(data.stockPorColor.create).toEqual([
      { color: 'Azul', size: '', cantidad: 11, stockStatus: 'OK' },
      { color: 'Gris', size: '', cantidad: 20, stockStatus: 'OK' },
      { color: 'Rojo', size: '', cantidad: 10, stockStatus: 'OK' },
    ]);
    expect(result.stockPorColor.map((v) => v.cantidad)).toEqual([11, 20, 10]);
  });

  it('should sync stock per color on update and retire removed colors', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(makeRow());
    mockPrisma.product.update.mockResolvedValue(makeRow());
    mockPrisma.$transaction.mockResolvedValue([]);
    mockPrisma.productColorStock.findMany.mockResolvedValue([{ id: 'cs-2', color: 'Negro', size: '' }]);
    mockPrisma.productColorStock.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUniqueOrThrow.mockResolvedValue(
      makeRow({ colores: ['Azul'], tallas: ['M'], cantidadStock: 11, stockPorColor: [{ id: 'cs-1', color: 'Azul', size: '', cantidad: 11, stockStatus: 'OK' }] })
    );

    const result = await repo.update('REF-001', {
      stockPorColor: [{ color: 'Azul', cantidad: 11 }],
    });

    const data = mockPrisma.product.update.mock.calls[0][0].data;
    expect(data.cantidadStock).toBe(11);
    expect(data.colores).toEqual(['Azul']);
    expect(data.stockStatus).toBe('OK');
    expect(mockPrisma.productColorStock.upsert).toHaveBeenCalledWith({
      where: { productId_color_size: { productId: '1', color: 'Azul', size: '' } },
      create: { productId: '1', color: 'Azul', size: '', cantidad: 11, stockStatus: 'OK' },
      update: { cantidad: 11, stockStatus: 'OK', deletedAt: null },
    });
    expect(mockPrisma.productColorStock.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['cs-2'] } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result.stockPorColor).toEqual([{ id: 'cs-1', color: 'Azul', cantidad: 11, stock: 'OK' }]);
  });

  it('should persist the inventory matrix color + size and sum the general stock', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(makeRow());
    mockPrisma.product.update.mockResolvedValue(makeRow());
    mockPrisma.$transaction.mockResolvedValue([]);
    mockPrisma.productColorStock.findMany.mockResolvedValue([
      { id: 'cs-old', color: 'Blanco', size: '' },
    ]);
    mockPrisma.productColorStock.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUniqueOrThrow.mockResolvedValue(
      makeRow({
        colores: ['Azul', 'Rojo'],
        tallas: ['S', 'M', 'L'],
        cantidadStock: 48,
        stockPorColor: [
          { id: 'v1', color: 'Azul', size: 'S', cantidad: 12, stockStatus: 'OK' },
          { id: 'v2', color: 'Azul', size: 'M', cantidad: 12, stockStatus: 'OK' },
          { id: 'v3', color: 'Rojo', size: 'S', cantidad: 12, stockStatus: 'OK' },
          { id: 'v4', color: 'Rojo', size: 'L', cantidad: 12, stockStatus: 'OK' },
        ],
      })
    );

    const result = await repo.update('REF-001', {
      stockPorColor: [
        { color: 'Azul', size: 'S', cantidad: 12 },
        { color: 'Azul', size: 'M', cantidad: 12 },
        { color: 'Rojo', size: 'S', cantidad: 12 },
        { color: 'Rojo', size: 'L', cantidad: 12 },
      ],
    });

    const data = mockPrisma.product.update.mock.calls[0][0].data;
    expect(data.cantidadStock).toBe(48);
    expect(data.colores).toEqual(['Azul', 'Rojo']);
    expect(data.tallas).toEqual(['S', 'M', 'L']);
    expect(data.stockStatus).toBe('OK');
    expect(mockPrisma.productColorStock.upsert).toHaveBeenCalledWith({
      where: { productId_color_size: { productId: '1', color: 'Azul', size: 'S' } },
      create: { productId: '1', color: 'Azul', size: 'S', cantidad: 12, stockStatus: 'OK' },
      update: { cantidad: 12, stockStatus: 'OK', deletedAt: null },
    });
    // La variante sin talla previa deja de ser vigente y se retira.
    expect(mockPrisma.productColorStock.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['cs-old'] } },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result.stockPorColor.map((v) => `${v.color}/${v.size}`)).toEqual([
      'Azul/M',
      'Azul/S',
      'Rojo/L',
      'Rojo/S',
    ]);
  });
});
