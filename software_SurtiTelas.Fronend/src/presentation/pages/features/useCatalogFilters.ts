import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Estado de filtros del catálogo.
 *
 * REGLA ESTRUCTURAL: la URL es la ÚNICA fuente de verdad. No existe estado
 * duplicado en el componente ni un efecto que "refleje" la URL. Consecuencias
 * directas: recargar, compartir el enlace y el botón "atrás" funcionan sin
 * código adicional, y es imposible que el estado interno y la URL diverjan.
 */

export const TODAS = 'Todas';

/** Subconjunto que manipula el drawer de filtros. */
export interface CatalogFilterState {
  tallas: string[];
  marcas: string[];
  categoriasEspeciales: string[];
}

export const EMPTY_FILTERS: CatalogFilterState = {
  tallas: [],
  marcas: [],
  categoriasEspeciales: [],
};

export interface CatalogFilters extends CatalogFilterState {
  /** 'Todas' o el nombre exacto de una categoría de la taxonomía. */
  categoria: string;
  /** Texto de búsqueda ya normalizado (sin espacios extremos). */
  search: string;
  page: number;
}

/** Normaliza una lista de facetas: sin vacíos, sin duplicados, sin espacios. */
const normalizeList = (values: string[]): string[] =>
  Array.from(
    new Set(values.map((v) => (typeof v === 'string' ? v.trim() : '')).filter((v) => v !== '')),
  );

/**
 * Nombres de parámetro en la URL. Centralizados aquí para que leer y escribir
 * no puedan desalinearse (ese desalineamiento era la causa de filtros que
 * reaparecían solos).
 */
export const CATALOG_PARAMS = {
  categoria: 'categoria',
  search: 'q',
  tallas: 'talla',
  marcas: 'marca',
  especiales: 'especial',
  page: 'page',
} as const;

/** Función pura y simétrica con `buildCatalogSearch`. */
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  const page = Number.parseInt(params.get(CATALOG_PARAMS.page) ?? '1', 10);
  const search = (params.get(CATALOG_PARAMS.search) ?? '').trim();
  return {
    categoria: (params.get(CATALOG_PARAMS.categoria) ?? '').trim() || TODAS,
    search,
    tallas: normalizeList(params.getAll(CATALOG_PARAMS.tallas)),
    marcas: normalizeList(params.getAll(CATALOG_PARAMS.marcas)),
    categoriasEspeciales: normalizeList(params.getAll(CATALOG_PARAMS.especiales)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * Serializa el estado completo. Siempre REEMPLAZA la query entera en lugar de
 * parchear parámetros sueltos: como la URL es la fuente de verdad, escribirlas
 * todas de golpe elimina cualquier estado intermedio imposible (por ejemplo
 * `?categoria=Todas`) y evita merges que unos filtros borran otros.
 */
export function buildCatalogSearch(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.categoria && filters.categoria !== TODAS) {
    params.set(CATALOG_PARAMS.categoria, filters.categoria);
  }
  if (filters.search) params.set(CATALOG_PARAMS.search, filters.search);
  for (const talla of normalizeList(filters.tallas)) params.append(CATALOG_PARAMS.tallas, talla);
  for (const marca of normalizeList(filters.marcas)) params.append(CATALOG_PARAMS.marcas, marca);
  for (const esp of normalizeList(filters.categoriasEspeciales)) {
    params.append(CATALOG_PARAMS.especiales, esp);
  }
  // La página solo se escribe a partir de la segunda: `/catalogo` es el
  // estado neutro y las pruebas lo comparan de forma literal.
  if (filters.page > 1) params.set(CATALOG_PARAMS.page, String(filters.page));
  return params;
}

export interface UseCatalogFiltersResult {
  filters: CatalogFilters;
  setCategoria: (categoria: string) => void;
  setSearch: (search: string) => void;
  setFiltrosAvanzados: (next: CatalogFilterState) => void;
  reset: () => void;
  setPage: (page: number) => void;
  /** Total de facetas activas, para el badge del botón "Filtros". */
  totalActivos: number;
}

export function useCatalogFilters(): UseCatalogFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseCatalogFilters(searchParams), [searchParams]);

  const commit = useCallback(
    (next: CatalogFilters) => {
      // `replace` evita ensuciar el historial con cada tecla de búsqueda y con
      // cada píldora; el botón "atrás" sigue devolviendo a la página anterior
      // del sitio, no a un histórico de filtros.
      setSearchParams(buildCatalogSearch(next), { replace: true });
    },
    [setSearchParams],
  );

  /**
   * Toda mutación de filtro reinicia la página a 1 EN LA MISMA transición de
   * estado. Antes era un `useEffect` aparte que corría después de la petición,
   * de modo que se disparaban dos consultas (la de la página 3 con el filtro
   * viejo y la de la página 1 con el nuevo) y sus respuestas se mezclaban.
   */
  const changeFilters = useCallback(
    (patch: Partial<CatalogFilters>) => commit({ ...filters, ...patch, page: 1 }),
    [commit, filters],
  );

  const setCategoria = useCallback(
    (categoria: string) => changeFilters({ categoria: categoria || TODAS }),
    [changeFilters],
  );

  const setSearch = useCallback(
    (search: string) => changeFilters({ search: search.trim() }),
    [changeFilters],
  );

  const setFiltrosAvanzados = useCallback(
    (next: CatalogFilterState) =>
      changeFilters({
        tallas: normalizeList(next.tallas),
        marcas: normalizeList(next.marcas),
        categoriasEspeciales: normalizeList(next.categoriasEspeciales),
      }),
    [changeFilters],
  );

  const reset = useCallback(
    () =>
      commit({ categoria: TODAS, search: '', ...EMPTY_FILTERS, page: 1 }),
    [commit],
  );

  const setPage = useCallback((page: number) => commit({ ...filters, page }), [commit, filters]);

  const totalActivos =
    (filters.categoria !== TODAS ? 1 : 0) +
    filters.tallas.length +
    filters.marcas.length +
    filters.categoriasEspeciales.length;

  return { filters, setCategoria, setSearch, setFiltrosAvanzados, reset, setPage, totalActivos };
}