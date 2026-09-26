export type ProductStockStatus = 'OK' | 'Bajo stock' | 'Agotado';
export type ProductCategory = string;

import { BadRequestError } from '../../../../shared/domain/errors';

export interface ProductColorStockData {
  id?: string;
  color: string;
  /** Talla de la variante. Si falta, la unidad aplica a cualquier talla del color. */
  size?: string;
  cantidad: number;
  stock?: ProductStockStatus;
}

export interface ProductData {
  id?: string;
  ref: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  descripcionCorta?: string;
  categoria: ProductCategory;
  subcategoria?: string;
  marca?: string;
  precio: number;
  precioAnterior?: number;
  descuento?: number;
  cantidadStock: number;
  stock: ProductStockStatus;
  estado?: 'Activo' | 'Inactivo';
  imagenes: string[];
  imagenPrincipal?: string;
  publicado: boolean;
  destacado?: boolean;
  oferta?: boolean;
  nuevo?: boolean;
  masVendido?: boolean;
  tela: string;
  colores: string[];
  tallas: string[];
  stockPorColor?: ProductColorStockData[];
}

export function computeStockStatus(cantidadStock: number): ProductStockStatus {
  if (cantidadStock <= 0) return 'Agotado';
  if (cantidadStock < 10) return 'Bajo stock';
  return 'OK';
}

/** Clave case-insensitive de la variante color + talla. */
export function variantKey(color: string, size?: string): string {
  return `${color.trim().toLowerCase()}::${(size ?? '').trim().toLowerCase()}`;
}

export function sumColorStock(variantes: ProductColorStockData[]): number {
  return variantes.reduce((total, variante) => total + (Number.isFinite(variante.cantidad) ? variante.cantidad : 0), 0);
}

/** Colores distintos presentes en las variantes, sin repetir y en orden de aparición. */
export function colorsFromVariants(variantes: ProductColorStockData[]): string[] {
  const seen = new Set<string>();
  const colores: string[] = [];
  for (const variante of variantes) {
    const key = variante.color.trim().toLowerCase();
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    colores.push(variante.color.trim());
  }
  return colores;
}

/** Tallas distintas presentes en las variantes, sin repetir y en orden de aparición. */
export function sizesFromVariants(variantes: ProductColorStockData[]): string[] {
  const seen = new Set<string>();
  const tallas: string[] = [];
  for (const variante of variantes) {
    const size = (variante.size ?? '').trim();
    if (size === '') continue;
    const key = size.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tallas.push(size);
  }
  return tallas;
}

/**
 * Normaliza las variantes de inventario: recorta color y talla, descarta
 * combinaciones incompletas y unifica duplicados (case-insensitive) sumando
 * sus existencias. Si no llegan variantes, se derivan desde la lista de colores
 * en 0 unidades para conservar el stock global heredado.
 */
export function normalizeColorStock(
  colores: string[] | undefined,
  variantes: ProductColorStockData[] | undefined
): ProductColorStockData[] {
  const source: ProductColorStockData[] = Array.isArray(variantes) && variantes.length > 0
    ? variantes
    : (colores ?? []).map((color) => ({ color, cantidad: 0 }));
  const porVariante = new Map<string, ProductColorStockData>();

  for (const variante of source) {
    const color = (variante?.color ?? '').trim();
    if (color === '') continue;
    const size = (variante?.size ?? '').trim();
    const cantidad = Number.isFinite(variante.cantidad) ? Math.trunc(variante.cantidad) : 0;
    const etiqueta = size === '' ? `del color "${color}"` : `de la variante ${color}/${size}`;
    if (cantidad < 0) throw new BadRequestError(`La cantidad en stock ${etiqueta} no puede ser negativa`);
    const key = variantKey(color, size);
    const existente = porVariante.get(key);
    if (existente) {
      porVariante.set(key, { ...existente, cantidad: existente.cantidad + cantidad });
    } else {
      porVariante.set(key, { id: variante.id, color, ...(size !== '' ? { size } : {}), cantidad });
    }
  }

  return [...porVariante.values()];
}

export class Product {
  readonly id?: string;
  readonly ref: string;
  readonly codigo?: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly descripcionCorta?: string;
  readonly categoria: ProductCategory;
  readonly subcategoria?: string;
  readonly marca?: string;
  readonly precio: number;
  readonly precioAnterior?: number;
  readonly descuento?: number;
  readonly cantidadStock: number;
  readonly stock: ProductStockStatus;
  readonly estado?: 'Activo' | 'Inactivo';
  readonly imagenes: string[];
  readonly imagenPrincipal?: string;
  readonly publicado: boolean;
  readonly destacado?: boolean;
  readonly oferta?: boolean;
  readonly nuevo?: boolean;
  readonly masVendido?: boolean;
  readonly tela: string;
  readonly colores: string[];
  readonly tallas: string[];
  readonly stockPorColor: ProductColorStockData[];

  constructor(data: ProductData) {
    Product.validate(data);
    const variantes = normalizeColorStock(data.colores, data.stockPorColor);
    this.id = data.id;
    this.ref = data.ref;
    this.codigo = data.codigo;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.descripcionCorta = data.descripcionCorta;
    this.categoria = data.categoria;
    this.subcategoria = data.subcategoria;
    this.marca = data.marca;
    this.precio = data.precio;
    this.precioAnterior = data.precioAnterior;
    this.descuento = data.descuento;
    this.cantidadStock = data.cantidadStock;
    this.stock = data.stock;
    this.estado = data.estado;
    this.imagenes = data.imagenes;
    this.imagenPrincipal = data.imagenPrincipal;
    this.publicado = data.publicado;
    this.destacado = data.destacado;
    this.oferta = data.oferta;
    this.nuevo = data.nuevo;
    this.masVendido = data.masVendido;
    this.tela = data.tela;
    const coloresVariantes = colorsFromVariants(variantes);
    this.colores = coloresVariantes.length > 0 ? coloresVariantes : data.colores;
    this.tallas = this.resolveTallas(data, variantes);
    this.stockPorColor = variantes.map((v) => ({ ...v, stock: v.stock ?? computeStockStatus(v.cantidad) }));
  }

  /**
   * Las tallas del producto son las declaradas más las que aparecen en las
   * variantes, sin repetir y respetando el orden de entrada.
   */
  private resolveTallas(data: ProductData, variantes: ProductColorStockData[]): string[] {
    const declaradas = (data.tallas ?? []).map((t) => t.trim()).filter((t) => t !== '');
    const deVariantes = sizesFromVariants(variantes);
    const union = [...declaradas];
    for (const talla of deVariantes) {
      if (!union.some((t) => t.toLowerCase() === talla.toLowerCase())) union.push(talla);
    }
    return union.length > 0 ? union : data.tallas;
  }

  static validate(data: ProductData): void {
    if (data.ref.trim() === '') throw new BadRequestError('El producto debe tener una referencia');
    if (data.nombre.trim() === '') throw new BadRequestError('El producto debe tener un nombre');
    if (data.categoria.trim() === '') throw new BadRequestError('El producto debe tener una categoría');
    if (data.tela.trim() === '') throw new BadRequestError('El producto debe tener una tela definida');
    if (!Number.isFinite(data.precio) || data.precio < 0)
      throw new BadRequestError('El precio del producto no puede ser negativo');
    if (data.precioAnterior !== undefined && data.precioAnterior < 0)
      throw new BadRequestError('El precio anterior no puede ser negativo');
    if (data.descuento !== undefined && (data.descuento < 0 || data.descuento > 100))
      throw new BadRequestError('El descuento debe estar entre 0 y 100');
    if (!Number.isInteger(data.cantidadStock) || data.cantidadStock < 0)
      throw new BadRequestError('La cantidad en stock no puede ser negativa');
    if (data.stock === 'Agotado' && data.cantidadStock > 0)
      throw new BadRequestError('Un producto agotado no puede tener cantidad en stock mayor a cero');
    if (!Array.isArray(data.imagenes)) throw new BadRequestError('Las imágenes deben ser un arreglo');
    if (!Array.isArray(data.colores) || data.colores.length === 0)
      throw new BadRequestError('El producto debe tener al menos un color');
    const tallasDeclaradas = Array.isArray(data.tallas) ? data.tallas.filter((t) => t.trim() !== '') : [];
    if (tallasDeclaradas.length === 0 && sizesFromVariants(normalizeColorStock(data.colores, data.stockPorColor)).length === 0)
      throw new BadRequestError('El producto debe tener al menos una talla');
    if (data.stockPorColor !== undefined && !Array.isArray(data.stockPorColor))
      throw new BadRequestError('El stock por color debe ser un arreglo');
  }

  withChanges(changes: Partial<ProductData>): Product {
    const cambianColores = changes.stockPorColor !== undefined || changes.colores !== undefined;
    return new Product({
      ...this,
      ...changes,
      imagenes: changes.imagenes ?? this.imagenes,
      colores: changes.colores ?? this.colores,
      tallas: changes.tallas ?? this.tallas,
      stockPorColor: cambianColores ? changes.stockPorColor : this.stockPorColor,
    });
  }

  publish(): Product {
    if (!this.canBePublished()) {
      throw new BadRequestError('El producto no cumple los requisitos para ser publicado');
    }
    return this.withChanges({ publicado: true, estado: 'Activo' });
  }

  unpublish(): Product {
    return this.withChanges({ publicado: false, estado: 'Inactivo' });
  }

  canBePublished(): boolean {
    return (
      this.nombre.trim() !== '' &&
      this.categoria.trim() !== '' &&
      this.precio > 0 &&
      (this.imagenPrincipal?.trim() !== '' || this.imagenes.length > 0)
    );
  }

  isAvailable(): boolean {
    return this.publicado && this.stock !== 'Agotado';
  }
}

