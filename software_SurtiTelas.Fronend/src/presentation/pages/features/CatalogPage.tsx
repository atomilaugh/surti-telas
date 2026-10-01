import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, ShoppingBag, RefreshCcw } from 'lucide-react';
import { FilterDrawer } from '@presentation/pages/components/FilterDrawer';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { toast } from 'sonner';
import '../styles/CatalogPage.css';
import { Tooltip } from '@/shared/components/Tooltip';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { favoritesApi } from '@/infrastructure/api/favoritesApi';
import type { Producto as ProductoCore } from '@/core/types';
import { useCatalogFilters, TODAS, type CatalogFilterState } from './useCatalogFilters';
import { useCatalogProducts } from './useCatalogProducts';
import ProductCard from './ProductCard';

const FAVORITES_STORAGE_KEY = 'surtitelas.favorites';
const SEARCH_DEBOUNCE_MS = 450;
const PAGE_SIZE = 12;

const readFavoriteIds = () => {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string' && id.trim() !== '') : [];
  } catch {
    return [] as string[];
  }
};

const writeFavoriteIds = (favoriteIds: string[]) => {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
};

const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  // El texto que el usuario escribe vive aquí (estado de UI puro). Lo que
  // filtra de verdad es `filters.search`, que vive en la URL y se escribe
  // tras el debounce: el input es inmediato, la consulta no.
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductoCore | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [heroConfig] = useState({
    badge: 'Colección Premium',
    titulo: 'Bienvenido a',
    destacado: 'Surticamisetas',
    subtitulo: 'Explora una colección premium diseñada para quienes buscan estilo, calidad y exclusividad.',
  });

  const [brands, setBrands] = useState<string[]>([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);

  // La URL es la única fuente de verdad de los filtros (ver useCatalogFilters).
  const {
    filters,
    setCategoria,
    setSearch,
    setFiltrosAvanzados,
    reset: resetFilters,
    setPage,
    totalActivos,
  } = useCatalogFilters();

  const query = useMemo(
    () => ({
      sort: 'createdAt',
      order: 'desc',
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.categoria !== TODAS ? { categoria: filters.categoria } : {}),
      ...(filters.marcas.length > 0 ? { marcas: filters.marcas } : {}),
      ...(filters.tallas.length > 0 ? { tallas: filters.tallas } : {}),
      ...(filters.categoriasEspeciales.length > 0 ? { categoriasEspeciales: filters.categoriasEspeciales } : {}),
    }),
    [
      filters.search,
      filters.categoria,
      filters.marcas,
      filters.tallas,
      filters.categoriasEspeciales,
    ],
  );

  const {
    products,
    totalPages,
    status,
    isInitialLoading,
    isRefetching,
    error,
    reload,
  } = useCatalogProducts(query, { page: filters.page, limit: PAGE_SIZE });

  // Debounce real: una sola petición por ráfaga de escritura, no una por tecla.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearch]);

  useEffect(() => {
    let cancelled = false;
    const loadTaxonomies = async () => {
      try {
        const [brandsData, categoriasData, subcategoriasData] = await Promise.all([
          catalogApi.getBrands(),
          catalogApi.getCategories(),
          // Si esta faceta no está disponible, no debe tumbar la página.
          catalogApi.getSubcategories().catch(() => [] as string[]),
        ]);
        if (cancelled) return;
        setBrands(brandsData);
        setCategoriasDisponibles(categoriasData);
        setSubcategorias(subcategoriasData);
      } catch {
        if (cancelled) return;
        setBrands([]);
        setCategoriasDisponibles([]);
        setSubcategorias([]);
      }
    };
    loadTaxonomies();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const stored = readFavoriteIds();
    setFavoriteIds(stored);
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // El input puede venir con texto (recarga, "atrás") que el estado local no
  // conoce. Se sincroniza sin escribir en la URL para no realimentar el ciclo.
  useEffect(() => {
    setSearchInput((current) => (current === filters.search ? current : filters.search));
  }, [filters.search]);

  // Las píldoras se construyen con la lista estable del catálogo, NUNCA con
  // los productos filtrados: al elegir una categoría, los productos cargados
  // son solo de esa categoría y derivar de ellos haría desaparecer el resto.
  const categoriasUnicas = useMemo(() => {
    if (filters.categoria !== TODAS && !categoriasDisponibles.includes(filters.categoria)) {
      return [TODAS, ...categoriasDisponibles, filters.categoria];
    }
    return [TODAS, ...categoriasDisponibles];
  }, [categoriasDisponibles, filters.categoria]);

  // El backend resuelve TODOS los criterios y pagina en el servidor. Re-aplicar
  // los mismos filtros en el cliente era una segunda implementación de la misma
  // regla con otra semántica (más estricta), lo que descartaba productos que el
  // servidor acababa de devolver y obligaba a desactivar "cargar más" en cuanto
  // había un filtro avanzado. Ahora hay una sola implementación: la del servidor.
  const hayFiltrosActivos = totalActivos > 0 || filters.search !== '';
  // Durante un refetch se conserva la cuadrícula anterior: solo se muestra el
  // skeleton si aún no hay nada que conservar. Es lo que garantiza que las
  // píldoras de categoría sigan disponibles mientras llega la respuesta.
  const mostrarSkeleton = status !== 'idle' && products.length === 0;
  const hasMore = filters.page < totalPages && products.length > 0;

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    setSearch('');
  }, [setSearch]);

  const handleOpenDetail = useCallback((producto: ProductoCore) => {
    setSelectedProduct(producto);
    setIsModalOpen(true);
  }, []);
  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  }, []);

  const handleApplyFilters = useCallback(
    (next: CatalogFilterState) => setFiltrosAvanzados(next),
    [setFiltrosAvanzados],
  );

  const handleResetFilters = useCallback(() => {
    // Cancelar el debounce pendiente es imprescindible: si no, un instante
    // después del reset el texto anterior se escribiría en la URL y el filtro
    // de búsqueda reaparecería solo.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    resetFilters();
  }, [resetFilters]);

  const toggleFavorite = useCallback(async (producto: ProductoCore) => {
    const productId = producto.id || producto.ref;
    setFavoriteIds(current => {
      const exists = current.includes(productId);
      const next = exists ? current.filter(id => id !== productId) : [...current, productId];
      writeFavoriteIds(next);
      return next;
    });
    try {
      await favoritesApi.toggle(productId);
      const added = !favoriteIds.includes(productId);
      toast.success(
        added
          ? `"${producto.nombre}" se agregó a favoritos.`
          : `"${producto.nombre}" se eliminó de favoritos.`,
      );
    } catch {
      toast.error('No se pudo sincronizar el favorito con el servidor');
    }
  }, [favoriteIds]);

  if (isInitialLoading) {
    return (
      <div className="catalog-page">
        <div className="catalog-hero">
          <div className="hero-content">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-subtitle" />
            <div className="skeleton skeleton-search" />
          </div>
        </div>
        <div className="products-section">
          <div className="products-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="product-card-skeleton">
                <div className="skeleton skeleton-img" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text-short" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="catalog-page">
        <div className="catalog-hero">
          <div className="hero-content">
            <h1>Catálogo</h1>
            <p className="text-red-500">{error}</p>
            <button className="retry-btn" onClick={reload} type="button">
              <RefreshCcw size={16} />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      {/* HERO SECTION CINEMATOGRÁFICA */}
      <section className="catalog-hero" data-testid="catalog-hero">
        <div className="hero-bg-overlay" />
        <div className="hero-decoration hero-dot-1" />
        <div className="hero-decoration hero-dot-2" />
        <div className="hero-decoration hero-line" />
        <div className="hero-decoration hero-shape-1" />
        <div className="hero-decoration hero-shape-2" />

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>{heroConfig.badge}</span>
          </div>

          <h1 className="hero-title">
            {heroConfig.titulo}<br />
            <span className="title-highlight">{heroConfig.destacado}</span>
          </h1>

          <p className="hero-subtitle">{heroConfig.subtitulo}</p>

          {/* SEARCH EXPERIENCE PREMIUM */}
          <div className="hero-controls-row">
            <div className="glass-search-wrapper">
              <div className="glass-search-bar">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  className="glass-search-input"
                  placeholder="Buscar productos, marcas, categorías..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {searchInput && (
                  <button className="glass-clear-btn" onClick={handleClearSearch} type="button">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <button
              className="filter-toggle-btn"
              onClick={() => setFiltrosAbierto(true)}
              data-active={totalActivos > 0}
              type="button"
            >
              <SlidersHorizontal size={20} />
              <span>Filtros</span>
              {totalActivos > 0 && <span className="filter-badge">{totalActivos}</span>}
            </button>
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="category-pills-container">
          <div className="category-pills-scroll">
            {categoriasUnicas.map(cat => (
              <button
                key={cat}
                className={`category-pill ${filters.categoria === cat ? 'active' : ''}`}
                onClick={() => setCategoria(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="controls-section">
        <div className="catalog-controls-bar">
          <div className="controls-left">
            <span className="results-count">
              {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </span>
            {isRefetching && (
              <span className="results-loading" aria-live="polite">
                Actualizando…
              </span>
            )}
          </div>
          <div className="controls-right">
            {hayFiltrosActivos && (
              <button
                className="btn-clear-filters"
                onClick={handleResetFilters}
                type="button"
                aria-label="Limpiar filtros"
              >
                <X size={14} aria-hidden="true" />
                <span>Limpiar filtros</span>
              </button>
            )}
            <Tooltip title="Ver carrito">
              <button className="nav-to-cart-btn" onClick={() => navigate('/carrito')} type="button">
                <ShoppingBag size={18} />
                <span>Ver carrito</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </section>

      <section className="products-section" data-testid="products-grid">
        {mostrarSkeleton ? (
          <div className="products-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="product-card-skeleton">
                <div className="skeleton skeleton-img" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text-short" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-catalog">
            <div className="empty-icon"><Search size={48} /></div>
            <h3>No se encontraron productos</h3>
            <p>Intenta ajustar tus filtros o términos de búsqueda</p>
            {hayFiltrosActivos && (
              <button className="btn-clear-filters btn-outline" onClick={handleResetFilters} type="button">
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map((producto, idx) => (
                <ProductCard
                  key={producto.id || producto.ref}
                  producto={producto}
                  isFavorite={favoriteIds.includes(producto.id || producto.ref)}
                  onToggleFavorite={toggleFavorite}
                  onOpenDetail={handleOpenDetail}
                  animationDelay={idx * 0.05}
                />
              ))}
            </div>
            {hasMore && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={() => setPage(filters.page + 1)}
                  disabled={isRefetching}
                  type="button"
                >
                  {isRefetching ? 'Cargando...' : 'Cargar más productos'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* `currentFilters` es obligatorio: sin él el drawer se abriría vacío y
          pulsar "Aplicar" borraría todos los filtros ya activos. */}
      <FilterDrawer
        isOpen={filtrosAbierto}
        onClose={() => setFiltrosAbierto(false)}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        currentFilters={{
          tallas: filters.tallas,
          marcas: filters.marcas,
          categoriasEspeciales: filters.categoriasEspeciales,
        }}
        brandOptions={brands}
        specialOptions={subcategorias}
      />

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default CatalogPage;