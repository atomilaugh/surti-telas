import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalogApi, type ProductsListQuery } from '@/infrastructure/api/catalogApi';
import { isAbortError } from '@/infrastructure/api/httpClient';
import type { Producto } from '@/core/types';

export type CatalogStatus = 'loading' | 'refetching' | 'idle';

export interface UseCatalogProductsResult {
  products: Producto[];
  totalRecords: number;
  totalPages: number;
  status: CatalogStatus;
  /** Skeleton a pantalla completa: solo en la PRIMERA carga, nunca al filtrar. */
  isInitialLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  reload: () => void;
}

type CatalogListQuery = Omit<ProductsListQuery, 'signal' | 'page' | 'limit'>;

/**
 * Dueño único de los productos del catálogo.
 *
 * Sustituye al par `useEffect(fetch)` + `useEffect(setAllProducts([]))` que
 * tenía `CatalogPage`. Ese par era la fuente estructural de los filtros
 * inconsistentes, por cuatro motivos, todos resueltos aquí:
 *
 *  1. SIN CANCELACIÓN: dos cambios de filtro solapaban dos peticiones y la que
 *     respondía última ganaba, dejando productos de un filtro junto al estado
 *     de otro. Aquí cada petición aborta la anterior (`AbortController`).
 *  2. SIN IDENTIDAD DE CONSULTA: el efecto dependía de un objeto `pagination`
 *     cuyo `useMemo` cambia de identidad con `totalRecords`, así que la propia
 *     respuesta de la petición disparaba la siguiente. Aquí la dependencia es
 *     una clave `string` derivada del contenido de la consulta.
 *  3. ACUMULACIÓN INCORRECTA: al cambiar de filtro se acumulaba sobre los
 *     productos de la consulta anterior. Aquí los productos están etiquetados
 *     con su `queryKey` y una acumulación sobre una clave distinta se descarta.
 *  4. SKELETON QUE OCULTA LOS CONTROLES: al vaciar los productos durante el
 *     refetch, la página renderizaba el skeleton completo y con él
 *     desaparecían las píldoras de categoría, siendo imposible cambiar de
 *     categoría. Aquí los resultados anteriores se mantienen visibles
 *     (carga escalonada) y el skeleton completo solo aparece en la primera
 *     carga, cuando no hay nada que conservar.
 */
export function useCatalogProducts(
  query: CatalogListQuery,
  options: { page: number; limit: number },
): UseCatalogProductsResult {
  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  const { page, limit } = options;

  const [items, setItems] = useState<Producto[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Espejo de `items` para leerlo dentro de `load` sin depender de él.
  const itemsRef = useRef<Producto[]>([]);
  itemsRef.current = items;

  // Número de secuencia: descarta respuestas obsoletas aunque la cancelación
  // llegue tarde (el servidor pudo responder antes de que se abortara).
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef<Map<string, Producto[]>>(new Map());

  const load = useCallback(
    async (mode: 'replace' | 'append') => {
      seqRef.current += 1;
      const seq = seqRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus(itemsRef.current.length > 0 ? 'refetching' : 'loading');
      setError(null);

      const isFirstPage = page <= 1;

      try {
        const result = await catalogApi.list({ ...query, page, limit, signal: controller.signal });

        // La respuesta ya no corresponde a la petición vigente.
        if (seq !== seqRef.current || controller.signal.aborted) return;

        let products: Producto[];
        if (isFirstPage || mode === 'replace') {
          products = result.data;
        } else {
          const previous = accumulatedRef.current.get(queryKey) ?? [];
          // Deduplicar por id: una página repetida no debe duplicar tarjetas.
          const merged = new Map(previous.map((p) => [p.id, p]));
          for (const p of result.data) merged.set(p.id, p);
          products = Array.from(merged.values());
        }

        accumulatedRef.current.set(queryKey, products);
        itemsRef.current = products;
        setItems(products);
        setTotalRecords(result.meta.totalRecords);
        setTotalPages(result.meta.totalPages);
        setHasLoaded(true);
        setStatus('idle');
      } catch (err) {
        if (isAbortError(err) || seq !== seqRef.current) return;
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los productos';
        setError(message);
        setStatus('idle');
      }
    },
    // `queryKey` cubre el contenido de `query`; `state` deliberadamente no
    // participa para que la respuesta de una petición no dispare la siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey, page, limit, reloadToken],
  );

  useEffect(() => {
    void load(page <= 1 ? 'replace' : 'append');
    return () => abortRef.current?.abort();
  }, [load, page]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return {
    products: items,
    totalRecords,
    totalPages,
    status,
    isInitialLoading: !hasLoaded && status === 'loading',
    isRefetching: status === 'refetching',
    error,
    reload,
  };
}