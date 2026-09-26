import { ProductStatus, StockStatus } from '@prisma/client';
import { Product, ProductColorStockData, ProductData, ProductStockStatus } from '../../domain/entities/Product';
import { computeStockStatus } from '../../domain/entities/Product';

const STOCK_TO_DB: Record<ProductStockStatus, StockStatus> = {
  OK: 'OK',
  'Bajo stock': 'BAJO_STOCK',
  Agotado: 'AGOTADO',
};

const DB_TO_STOCK: Record<StockStatus, ProductStockStatus> = {
  OK: 'OK',
  BAJO_STOCK: 'Bajo stock',
  AGOTADO: 'Agotado',
};

export { STOCK_TO_DB, DB_TO_STOCK };

const STATUS_TO_DB: Record<'Activo' | 'Inactivo', ProductStatus> = {
  Activo: 'ACTIVO',
  Inactivo: 'INACTIVO',
};

const DB_TO_STATUS: Record<ProductStatus, 'Activo' | 'Inactivo'> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

type ProductColorStockRow = {
  id: string;
  color: string;
  size: string;
  cantidad: number;
  stockStatus: StockStatus;
};

type ProductRow = {
  id: string;
  ref: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  descripcionCorta: string | null;
  categoriaId: string | null;
  categoria: { nombre: string } | null;
  subcategoria: string | null;
  marca: string | null;
  precio: { toNumber(): number };
  precioAnterior: { toNumber(): number } | null;
  descuento: number;
  cantidadStock: number;
  stockStatus: StockStatus;
  estado: ProductStatus;
  publicado: boolean;
  fechaPublicacion: Date | null;
  destacado: boolean;
  oferta: boolean;
  nuevo: boolean;
  masVendido: boolean;
  tela: string;
  colores: string[];
  tallas: string[];
  imagenPrincipal: string | null;
  imagenes: string[];
  stockPorColor?: ProductColorStockRow[];
};

export function toColorStockData(row: ProductRow): ProductColorStockData[] {
  const variantes = Array.isArray(row.stockPorColor) ? row.stockPorColor : [];
  return [...variantes]
    .sort((a, b) => a.color.localeCompare(b.color, 'es') || a.size.localeCompare(b.size, 'es'))
    .map((v) => ({
      id: v.id,
      color: v.color,
      ...(v.size ? { size: v.size } : {}),
      cantidad: v.cantidad,
      stock: DB_TO_STOCK[v.stockStatus],
    }));
}

export function toProductData(row: ProductRow): ProductData {
  return {
    id: row.id,
    ref: row.ref,
    codigo: row.codigo ?? undefined,
    nombre: row.nombre,
    descripcion: row.descripcion ?? undefined,
    descripcionCorta: row.descripcionCorta ?? undefined,
    categoria: row.categoria?.nombre ?? '',
    subcategoria: row.subcategoria ?? undefined,
    marca: row.marca ?? undefined,
    precio: row.precio.toNumber(),
    precioAnterior: row.precioAnterior ? row.precioAnterior.toNumber() : undefined,
    descuento: row.descuento,
    cantidadStock: row.cantidadStock,
    stock: DB_TO_STOCK[row.stockStatus],
    estado: DB_TO_STATUS[row.estado],
    imagenes: row.imagenes,
    imagenPrincipal: row.imagenPrincipal ?? undefined,
    publicado: row.publicado,
    destacado: row.destacado,
    oferta: row.oferta,
    nuevo: row.nuevo,
    masVendido: row.masVendido,
    tela: row.tela,
    colores: row.colores,
    tallas: row.tallas,
    stockPorColor: toColorStockData(row),
  };
}

export function toCreateInput(
  product: Product,
  categoriaId: string | null,
  ref: string
) {
  return {
    ref,
    codigo: product.codigo,
    nombre: product.nombre,
    descripcion: product.descripcion,
    descripcionCorta: product.descripcionCorta,
    categoriaId,
    subcategoria: product.subcategoria,
    marca: product.marca,
    precio: product.precio,
    precioAnterior: product.precioAnterior,
    descuento: product.descuento ?? 0,
    cantidadStock: product.cantidadStock,
    stockStatus: STOCK_TO_DB[product.stock],
    estado: STATUS_TO_DB[product.estado ?? 'Activo'],
    publicado: product.publicado,
    destacado: product.destacado ?? false,
    oferta: product.oferta ?? false,
    nuevo: product.nuevo ?? false,
    masVendido: product.masVendido ?? false,
    tela: product.tela,
    colores: product.colores,
    tallas: product.tallas,
    imagenPrincipal: product.imagenPrincipal,
    imagenes: product.imagenes,
  };
}

export function toColorStockDataInput(variantes: ProductColorStockData[]) {
  return variantes.map((variante) => ({
    color: variante.color,
    size: (variante.size ?? '').trim(),
    cantidad: variante.cantidad,
    stockStatus: STOCK_TO_DB[computeStockStatus(variante.cantidad)],
  }));
}

export function toColorStockCreateMany(productId: string, variantes: ProductColorStockData[]) {
  return toColorStockDataInput(variantes).map((data) => ({ productId, ...data }));
}

export function toColorStockUpdateMany(productId: string, variantes: ProductColorStockData[]) {
  return variantes.map((variante) => {
    const size = (variante.size ?? '').trim();
    return {
      where: { productId_color_size: { productId, color: variante.color, size } },
      create: { productId, color: variante.color, size, cantidad: variante.cantidad, stockStatus: STOCK_TO_DB[computeStockStatus(variante.cantidad)] },
      update: {
        cantidad: variante.cantidad,
        stockStatus: STOCK_TO_DB[computeStockStatus(variante.cantidad)],
        deletedAt: null,
      },
    };
  });
}

export function toUpdateInput(changes: {
  nombre?: string;
  descripcion?: string;
  descripcionCorta?: string;
  subcategoria?: string;
  marca?: string;
  precio?: number;
  precioAnterior?: number;
  descuento?: number;
  cantidadStock?: number;
  stock?: ProductStockStatus;
  stockStatus?: ProductStockStatus;
  estado?: 'Activo' | 'Inactivo';
  publicado?: boolean;
  destacado?: boolean;
  oferta?: boolean;
  nuevo?: boolean;
  masVendido?: boolean;
  tela?: string;
  colores?: string[];
  tallas?: string[];
  imagenPrincipal?: string;
  imagenes?: string[];
  categoriaId?: string;
  codigo?: string;
}) {
  const data: Record<string, unknown> = {};
  if (changes.nombre !== undefined) data.nombre = changes.nombre;
  if (changes.descripcion !== undefined) data.descripcion = changes.descripcion;
  if (changes.descripcionCorta !== undefined) data.descripcionCorta = changes.descripcionCorta;
  if (changes.subcategoria !== undefined) data.subcategoria = changes.subcategoria;
  if (changes.marca !== undefined) data.marca = changes.marca;
  if (changes.precio !== undefined) data.precio = changes.precio;
  if (changes.precioAnterior !== undefined) data.precioAnterior = changes.precioAnterior;
  if (changes.descuento !== undefined) data.descuento = changes.descuento;
  if (changes.codigo !== undefined) data.codigo = changes.codigo;
  if (changes.cantidadStock !== undefined) {
    data.cantidadStock = changes.cantidadStock;
    if (changes.stock === undefined) {
      data.stockStatus = STOCK_TO_DB[computeStockStatus(changes.cantidadStock)];
    } else {
      data.stockStatus = STOCK_TO_DB[changes.stock];
    }
  } else if (changes.stockStatus !== undefined) {
    data.stockStatus = STOCK_TO_DB[changes.stockStatus];
  } else if (changes.stock !== undefined) {
    data.stockStatus = STOCK_TO_DB[changes.stock];
  }
  if (changes.estado !== undefined) data.estado = STATUS_TO_DB[changes.estado];
  if (changes.publicado !== undefined) data.publicado = changes.publicado;
  if (changes.destacado !== undefined) data.destacado = changes.destacado;
  if (changes.oferta !== undefined) data.oferta = changes.oferta;
  if (changes.nuevo !== undefined) data.nuevo = changes.nuevo;
  if (changes.masVendido !== undefined) data.masVendido = changes.masVendido;
  if (changes.tela !== undefined) data.tela = changes.tela;
  if (changes.colores !== undefined) data.colores = changes.colores;
  if (changes.tallas !== undefined) data.tallas = changes.tallas;
  if (changes.imagenPrincipal !== undefined) data.imagenPrincipal = changes.imagenPrincipal;
  if (changes.imagenes !== undefined) data.imagenes = changes.imagenes;
  if (changes.categoriaId !== undefined) data.categoriaId = changes.categoriaId;
  return data;
}
