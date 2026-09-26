import type { Producto, ProductoStockPorColor } from '@/core/types';

export interface ColorStockRow {
  key: string;
  color: string;
  size: string;
  cantidad: string;
}

let rowSequence = 0;

export function createColorRow(color = '', size = '', cantidad: number | string = ''): ColorStockRow {
  rowSequence += 1;
  return {
    key: `variant-${rowSequence}`,
    color,
    size,
    cantidad: String(cantidad),
  };
}

const norm = (value: string | undefined | null) => (value ?? '').trim().toLowerCase();

/** Clave case-insensitive de la variante color + talla. */
export function variantKey(color: string, size?: string): string {
  return `${norm(color)}::${norm(size)}`;
}

/** Etiqueta legible de la variante: "Azul / M". */
export function variantLabel(color: string, size?: string): string {
  const c = (color ?? '').trim();
  const s = (size ?? '').trim();
  return s === '' ? c : `${c} / ${s}`;
}

/**
 * Construye las filas del editor a partir de un producto. Si el producto aun
 * no tiene variantes guardadas, el stock global historico se asigna al primer
 * color para no perder unidades al migrar.
 */
export function colorRowsFromProducto(
  product: Pick<Producto, 'colores' | 'tallas' | 'stockPorColor' | 'cantidadStock'>,
): ColorStockRow[] {
  const variantes = product.stockPorColor ?? [];
  if (variantes.length > 0) {
    return variantes.map((variante) => createColorRow(variante.color, variante.size ?? '', variante.cantidad));
  }
  const colores = product.colores ?? [];
  const tallas = product.tallas ?? [];
  if (colores.length === 0) return [];
  return colores.map((color, index) =>
    createColorRow(color, index === 0 ? (tallas[0] ?? '') : '', index === 0 ? product.cantidadStock : 0),
  );
}

export function totalStockFromRows(rows: ColorStockRow[]): number {
  return rows.reduce((total, row) => total + (Number.parseInt(row.cantidad, 10) || 0), 0);
}

export function colorsFromRows(rows: ColorStockRow[]): string[] {
  const seen = new Set<string>();
  const colores: string[] = [];
  for (const row of rows) {
    const color = row.color.trim();
    if (color === '') continue;
    const key = color.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    colores.push(color);
  }
  return colores;
}

export function sizesFromRows(rows: ColorStockRow[]): string[] {
  return tallasUnicas(rows.map((row) => row.size));
}

function tallasUnicas(valores: string[]): string[] {
  const seen = new Set<string>();
  const tallas: string[] = [];
  for (const valor of valores) {
    const size = (valor ?? '').trim();
    if (size === '' || seen.has(norm(size))) continue;
    seen.add(norm(size));
    tallas.push(size);
  }
  return tallas;
}

/** Devuelve el mensaje de error de la primera fila invalida, o `null` si todas son validas. */
export function validateColorRows(rows: ColorStockRow[]): string | null {
  const nombrados = rows.filter((row) => row.color.trim() !== '');
  if (nombrados.length === 0) return 'Debes añadir al menos un color con su stock.';
  if (nombrados.length !== rows.length) return 'Cada fila de variante necesita un nombre de color.';

  const vistos = new Set<string>();
  for (const row of nombrados) {
    const color = row.color.trim();
    const key = variantKey(color, row.size);
    if (vistos.has(key)) {
      const size = row.size.trim();
      return size === ''
        ? `El color "${color}" está repetido.`
        : `La variante ${variantLabel(color, size)} está repetida.`;
    }
    vistos.add(key);

    const cantidad = Number.parseInt(row.cantidad, 10);
    if (row.cantidad.trim() === '' || Number.isNaN(cantidad)) {
      return `Indica cuántas unidades hay de ${variantLabel(color, row.size)}.`;
    }
    if (cantidad < 0) {
      return `La cantidad de ${variantLabel(color, row.size)} no puede ser negativa.`;
    }
  }
  return null;
}

export function rowsToVariantes(rows: ColorStockRow[]): ProductoStockPorColor[] {
  return rows
    .filter((row) => row.color.trim() !== '')
    .map((row) => ({
      color: row.color.trim(),
      ...(row.size.trim() !== '' ? { size: row.size.trim() } : {}),
      cantidad: Number.parseInt(row.cantidad, 10) || 0,
    }));
}

export interface ColorStockIndex {
  /** `true` cuando el producto tiene stock desglosado por variantes. */
  porColor: boolean;
  /** Unidades disponibles de una variante exacta (color + talla). */
  getVariant: (color: string, size?: string) => number;
  /** Suma de unidades del color entre todas sus tallas. */
  get: (color: string) => number;
  /** Suma de unidades de una talla entre todos sus colores. */
  getSize: (size: string) => number;
  /** `true` cuando el color no tiene unidades en ninguna talla. */
  colorAgotado: (color: string) => boolean;
  /** `true` cuando la combinación color + talla no tiene unidades. */
  variantAgotado: (color: string, size?: string) => boolean;
  /** Variantes ordenadas, lista para pintar. */
  variantes: ProductoStockPorColor[];
  /** Colores distintos con stock, en orden de aparición. */
  colores: string[];
  /** Tallas distintas con stock, en orden de aparición. */
  tallas: string[];
}

/**
 * Índice de disponibilidad por variante. Si el producto no tiene variantes
 * guardadas, se usa el stock global para cualquier combinación (comportamiento
 * heredado de los productos sin inventario multivariable).
 */
export function buildColorStockIndex(
  producto: Pick<Producto, 'colores' | 'tallas' | 'stockPorColor' | 'cantidadStock'>,
): ColorStockIndex {
  const variantes = (producto.stockPorColor ?? []).filter((v) => v.color.trim() !== '');
  const colores = coloresUnicos(variantes.map((v) => v.color));
  const tallas = tallasUnicas(variantes.map((v) => v.size ?? ''));

  if (variantes.length === 0) {
    const global = producto.cantidadStock ?? 0;
    return {
      porColor: false,
      variantes: [],
      getVariant: () => global,
      get: () => global,
      getSize: () => global,
      colorAgotado: () => global <= 0,
      variantAgotado: () => global <= 0,
      colores: producto.colores ?? [],
      tallas: producto.tallas ?? [],
    };
  }

  const porVariante = new Map(variantes.map((v) => [variantKey(v.color, v.size), v.cantidad]));
  const sumBy = (selector: (v: ProductoStockPorColor) => string, valor: string) =>
    variantes
      .filter((v) => norm(selector(v)) === norm(valor))
      .reduce((total, v) => total + v.cantidad, 0);

  return {
    porColor: true,
    variantes: [...variantes].sort(
      (a, b) => a.color.localeCompare(b.color, 'es') || (a.size ?? '').localeCompare(b.size ?? '', 'es'),
    ),
    /**
     * Unidades de la combinación exacta. Sin talla indicada devuelve la variante
     * "sin talla" o, si no existe, la suma del color. Una talla que no existe
     * en el inventario devuelve 0: esa combinación no se puede pedir.
     */
    getVariant: (color, size) => {
      const talla = (size ?? '').trim();
      if (talla === '') {
        const sinTalla = porVariante.get(variantKey(color, ''));
        return sinTalla !== undefined ? sinTalla : sumBy((v) => v.color, color);
      }
      return porVariante.get(variantKey(color, talla)) ?? 0;
    },
    get: (color) => sumBy((v) => v.color, color),
    getSize: (size) => sumBy((v) => v.size ?? '', size),
    colorAgotado: (color) => sumBy((v) => v.color, color) <= 0,
    variantAgotado: (color, size) => porVariante.get(variantKey(color, size)) === undefined
      ? (size ?? '').trim() === '' && sumBy((v) => v.color, color) > 0
      : (porVariante.get(variantKey(color, size)) ?? 0) <= 0,
    colores,
    tallas,
  };
}

function coloresUnicos(valores: string[]): string[] {
  const seen = new Set<string>();
  const salida: string[] = [];
  for (const valor of valores) {
    const limpio = (valor ?? '').trim();
    if (limpio === '' || seen.has(norm(limpio))) continue;
    seen.add(norm(limpio));
    salida.push(limpio);
  }
  return salida;
}
