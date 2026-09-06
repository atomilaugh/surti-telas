import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, ShoppingBag, RefreshCcw } from 'lucide-react';
import { FilterDrawer, type FilterState } from '@presentation/pages/components/FilterDrawer';
import { ProductDetailModal } from '@presentation/components/ProductDetailModal';
import { toast } from 'sonner';
import '../styles/CatalogPage.css';
import { Tooltip } from '@/shared/components/Tooltip';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { favoritesApi } from '@/infrastructure/api/favoritesApi';
import { useServerPagination } from '@/hooks/useServerPagination';
import type { Producto as ProductoCore } from '@/core/types';
import { buildProductHaystack, matchesAllTerms, tokenize } from '@/shared/utils/textSearch';
import ProductCard from './ProductCard';

const _formatPrice = (price: number) => `$${price.toLocaleString('es-CO')}`;

const FAVORITES_STORAGE_KEY = 'surtitelas.favorites';

const readFavoriteIds = () => {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string' && id.trim() !== '') : [];
  } catch {
    return [];
  }
};

const writeFavoriteIds = (favoriteIds: string[]) => {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
};

const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const initialCategoria = searchParams.get('categoria') || 'Todas';
  const [categoriaActiva, setCategoriaActiva] = useState(initialCategoria);
  const [marcaActiva, setMarcaActiva] = useState('Todas');
  const [filtrosAvanzados, setFiltrosAvanzados] = useState<FilterState>({ tallas: [], marcas: [], categoriasEspeciales: [] });
  const [allProducts, setAllProducts] = useState<ProductoCore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductoCore | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [heroConfig, _setHeroConfig] = useState({ badge: 'Colección Premium', titulo: 'Bienvenido a', destacado: 'Surticamisetas', subtitulo: 'Explora una colección premium diseñada para quienes buscan estilo, calidad y exclusividad.' });

  const [brands, setBrands] = useState<string[]>([]);
  const pagination = useServerPagination(12);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    const isFirstLoad = allProducts.length === 0;
    if (isFirstLoad) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    setError(null);
    try {
      const query: Record<string, string | number | boolean | Array<string | number | boolean> | undefined | null> = {
        page: pagination.page,
        limit: pagination.limit,
        sort: 'createdAt',
        order: 'desc',
      };
      if (searchQuery.trim()) query.search = searchQuery.trim();
      if (categoriaActiva !== 'Todas') query.categoria = categoriaActiva;
      if (marcaActiva !== 'Todas') query.marca = marcaActiva;

      if (filtrosAvanzados.marcas.length > 0) {
        query.marcas = filtrosAvanzados.marcas;
      }
      if (filtrosAvanzados.categoriasEspeciales.length > 0) {
        query.categoriasEspeciales = filtrosAvanzados.categoriasEspeciales;
      }
      if (filtrosAvanzados.tallas.length > 0) {
        query.tallas = filtrosAvanzados.tallas;
      }

      const result = await catalogApi.list(query);

      if (pagination.page === 1) {
        setAllProducts(result.data);
      } else {
        setAllProducts(prev => [...prev, ...result.data]);
      }

      pagination.setTotalRecords(result.meta.totalRecords);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los productos';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, searchQuery, categoriaActiva, marcaActiva, filtrosAvanzados, pagination.setTotalRecords]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setAllProducts([]);
    pagination.setPage(1);
  }, [categoriaActiva, marcaActiva, filtrosAvanzados, searchQuery, pagination]);

  useEffect(() => {
    let cancelled = false;
    const loadBrands = async () => {
      try {
        const data = await catalogApi.getBrands();
        if (!cancelled) setBrands(data);
      } catch {
        if (!cancelled) setBrands([]);
      }
    };
    loadBrands();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (categoriaActiva && categoriaActiva !== 'Todas') {
      setSearchParams((prev) => {
        if (prev.get('categoria') === categoriaActiva) return prev;
        const next = new URLSearchParams(prev);
        next.set('categoria', categoriaActiva);
        return next;
      });
    } else {
      setSearchParams((prev) => {
        if (!prev.has('categoria')) return prev;
        const next = new URLSearchParams(prev);
        next.delete('categoria');
        return next;
      });
    }
  }, [categoriaActiva, setSearchParams]);

  useEffect(() => {
    const cat = searchParams.get('categoria');
    if (cat && cat !== categoriaActiva) {
      setCategoriaActiva(cat);
    }
  }, [searchParams, categoriaActiva]);

  useEffect(() => {
    const stored = readFavoriteIds();
    setFavoriteIds(stored);
  }, []);

  const categoriasUnicas = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.categoria).filter((c): c is string => typeof c === 'string' && c.trim() !== ''));
    return ['Todas', ...Array.from(cats)];
  }, [allProducts]);

  const searchTerms = useMemo(() => tokenize(searchInput), [searchInput]);

  const productosFiltrados = useMemo(() => {
    return allProducts.filter(p => {
      const matchCategoria = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
      const matchMarca = marcaActiva === 'Todas' || p.marca === marcaActiva;
      const matchTalla = filtrosAvanzados.tallas.length === 0 || (p.tallas && p.tallas.some(t => filtrosAvanzados.tallas.includes(t)));
      const matchCategoriaEspecial = filtrosAvanzados.categoriasEspeciales.length === 0 || (p.categoria ?? '').toLowerCase().includes(filtrosAvanzados.categoriasEspeciales[0]?.toLowerCase() || '');
      const matchSearch = searchTerms.length === 0 || matchesAllTerms(buildProductHaystack(p as unknown as Record<string, unknown>), searchTerms);
      return matchCategoria && matchMarca && matchTalla && matchCategoriaEspecial && matchSearch;
    });
  }, [allProducts, categoriaActiva, marcaActiva, filtrosAvanzados, searchTerms]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
  }, []);
  const handleOpenDetail = useCallback((product: ProductoCore) => { setSelectedProduct(product); setIsModalOpen(true); }, []);
  const handleCloseModal = useCallback(() => { setIsModalOpen(false); setSelectedProduct(null); }, []);
  const handleApplyFilters = useCallback((filters: FilterState) => setFiltrosAvanzados(filters), []);
  const handleResetFilters = useCallback(() => {
    setCategoriaActiva('Todas');
    setMarcaActiva('Todas');
    setFiltrosAvanzados({ tallas: [], marcas: [], categoriasEspeciales: [] });
    setSearchInput('');
    setSearchQuery('');
    setSearchParams({});
    pagination.setPage(1);
  }, [pagination, setSearchParams]);
  const handleLoadMore = useCallback(() => pagination.setPage(pagination.page + 1), [pagination]);

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
      toast.success(added ? `"${producto.nombre}" se agregó a favoritos.` : `"${producto.nombre}" se eliminó de favoritos.`);
    } catch {
      toast.error('No se pudo sincronizar el favorito con el servidor');
    }
  }, [favoriteIds]);

  const countFiltrosActivos = useCallback(() => {
    let count = 0;
    if (categoriaActiva !== 'Todas') count++;
    if (marcaActiva !== 'Todas') count++;
    count += filtrosAvanzados.tallas.length;
    count += filtrosAvanzados.marcas.length;
    count += filtrosAvanzados.categoriasEspeciales.length;
    return count;
  }, [categoriaActiva, marcaActiva, filtrosAvanzados]);

  const totalFiltrosActivos = countFiltrosActivos();

  const hasMore = useMemo(() => {
    if (pagination.page >= pagination.totalPages) return false;
    if (productosFiltrados.length === 0) return false;
    if (filtrosAvanzados.tallas.length > 0 || filtrosAvanzados.marcas.length > 0 || filtrosAvanzados.categoriasEspeciales.length > 0) {
      return false;
    }
    return true;
  }, [pagination.page, pagination.totalPages, productosFiltrados.length, filtrosAvanzados]);

  if (isLoading && pagination.page === 1) {
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

  if (error) {
    return (
      <div className="catalog-page">
        <div className="catalog-hero">
          <div className="hero-content">
            <h1>Catálogo</h1>
            <p className="text-red-500">{error}</p>
            <button className="retry-btn" onClick={fetchProducts} type="button">
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
      {/* HERO SECTION CINEMATOGRÁFICO */}
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

          <p className="hero-subtitle">
            {heroConfig.subtitulo}
          </p>

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
              data-active={totalFiltrosActivos > 0}
              type="button"
            >
              <SlidersHorizontal size={20} />
              <span>Filtros</span>
              {totalFiltrosActivos > 0 && (
                <span className="filter-badge">{totalFiltrosActivos}</span>
              )}
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
                className={`category-pill ${categoriaActiva === cat ? 'active' : ''}`}
                onClick={() => {
                  setCategoriaActiva(cat);
                }}
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
              {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
            </span>
            {isRefetching && (
              <span className="results-loading" aria-live="polite">
                Actualizando…
              </span>
            )}
          </div>
          <div className="controls-right">
            {totalFiltrosActivos > 0 && (
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
        {productosFiltrados.length === 0 ? (
          <div className="empty-catalog">
            <div className="empty-icon"><Search size={48} /></div>
            <h3>No se encontraron productos</h3>
            <p>Intenta ajustar tus filtros o términos de búsqueda</p>
            <button className="btn-clear-filters btn-clear-filters--solid" onClick={handleResetFilters} type="button">Ver todos los productos</button>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {productosFiltrados.map((producto, idx) => (
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
                <button className="load-more-btn" onClick={handleLoadMore} disabled={isLoading} type="button">
                  {isLoading ? 'Cargando...' : 'Cargar más productos'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <FilterDrawer isOpen={filtrosAbierto} onClose={() => setFiltrosAbierto(false)} onApplyFilters={handleApplyFilters} onResetFilters={handleResetFilters} brandOptions={brands} />

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
