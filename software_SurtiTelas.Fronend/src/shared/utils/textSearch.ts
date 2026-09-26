/**
 * Normaliza un texto para comparaciones de búsqueda:
 * - Convierte a string
 * - Minúsculas
 * - Quita acentos / diacríticos
 * - Colapsa espacios múltiples
 * - Recorta extremos
 */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Devuelve los tokens normalizados de un texto (palabras separadas por espacios).
 * Si el texto queda vacío devuelve [].
 */
export function tokenize(value: unknown): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [] as string[];
  return normalized.split(' ').filter(Boolean);
}

/**
 * Indica si un texto candidato contiene TODOS los términos dados
 * (coincidencia parcial, insensible a acentos/mayúsculas).
 */
export function matchesAllTerms(candidate: unknown, terms: string[]): boolean {
  if (!terms || terms.length === 0) return true;
  const haystack = normalizeText(candidate);
  if (!haystack) return false;
  return terms.every((term) => haystack.includes(term));
}

/**
 * Devuelve un string "agregado" con todos los campos textuales relevantes
 * de un producto, ya normalizado, listo para hacer `includes()` por término.
 */
export function buildProductHaystack(product: Record<string, unknown>): string {
  const fields: unknown[] = [
    product.nombre,
    product.ref,
    product.codigo,
    product.marca,
    product.categoria,
    product.subcategoria,
    product.tela,
    product.descripcion,
    product.descripcionCorta,
  ];

  const arrayFields: string[] = [];
  const colores = product.colores;
  if (Array.isArray(colores)) arrayFields.push(...colores.map(String));
  const tallas = product.tallas;
  if (Array.isArray(tallas)) arrayFields.push(...tallas.map(String));

  const all = [...fields, ...arrayFields].map(normalizeText).filter(Boolean);
  return all.join(' ');
}