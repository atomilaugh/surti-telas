import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('@/infrastructure/api/catalogApi', () => ({
  catalogApi: {
    list: vi.fn(),
    getBrands: vi.fn().mockResolvedValue(['SurtiTelas']),
    getCategories: vi.fn().mockResolvedValue(['DIMANTE', 'BLUSAS DAMA', 'CAMISETAS', 'ZAFIRO']),
  },
}));

vi.mock('@/presentation/components/ProductDetailModal', () => ({
  ProductDetailModal: ({ product, isOpen, onClose }: { product?: { nombre?: string }; isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="product-modal">
        <p>{product?.nombre}</p>
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null,
}));

// El drawer real se abre por estado interno; este mock expone directamente los
// valores de FilterState para poder verificar la lógica de CatalogPage.
vi.mock('@/presentation/pages/components/FilterDrawer', () => ({
  FilterDrawer: ({
    isOpen,
    onClose,
    onApplyFilters,
    onResetFilters,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilters: (f: { tallas: string[]; marcas: string[]; categoriasEspeciales: string[] }) => void;
    onResetFilters?: () => void;
  }) =>
    isOpen ? (
      <div data-testid="filter-drawer">
        <button onClick={onClose}>Cerrar filtros</button>
        <button onClick={() => onApplyFilters({ tallas: ['M'], marcas: [], categoriasEspeciales: [] })}>
          aplicar tallas
        </button>
        <button onClick={() => onApplyFilters({ tallas: [], marcas: ['SurtiTelas'], categoriasEspeciales: [] })}>
          aplicar marcas
        </button>
        <button
          onClick={() =>
            onApplyFilters({ tallas: [], marcas: [], categoriasEspeciales: ['Camisas', 'Pantalones'] })
          }
        >
          aplicar varias especiales
        </button>
        <button onClick={() => onResetFilters?.()}>restablecer drawer</button>
      </div>
    ) : null,
}));

const { catalogApi } = await import('@/infrastructure/api/catalogApi');
const mockCatalogList = catalogApi.list as ReturnType<typeof vi.fn>;

import CatalogPage from '@/presentation/pages/features/CatalogPage';

const mockProducts = [
  {
    id: '1',
    ref: '1',
    nombre: 'Camiseta Premium',
    categoria: 'Camisas',
    precio: 45000,
    imagenPrincipal: '',
    imagenes: [],
    marca: 'SurtiTelas',
    tallas: ['M', 'L'],
    colores: ['Azul'],
    stock: 10,
    cantidadStock: 10,
    destacado: true,
    nuevo: true,
    publicado: true,
    estado: 'Activo',
  },
  {
    id: '2',
    ref: '2',
    nombre: 'Pantaloneta Deportiva',
    categoria: 'Pantalones',
    precio: 35000,
    imagenPrincipal: '',
    imagenes: [],
    marca: 'SurtiTelas',
    tallas: ['S', 'M'],
    colores: ['Negro'],
    stock: 0,
    cantidadStock: 0,
    destacado: false,
    nuevo: false,
    publicado: true,
    estado: 'Activo',
  },
];

// Réplica del contrato real del backend (PrismaProductRepository.list):
// search = contains simple sobre nombre/ref/codigo; categoria = coincidencia
// exacta; marcas/tallas/categoriasEspeciales = semántica OR.
const installCatalogMock = () => {
  mockCatalogList.mockImplementation(async (query?: Record<string, unknown>) => {
    const q = query ?? {};
    const search = (q.search as string | undefined)?.toLowerCase() ?? '';
    const categoria = (q.categoria as string | undefined) ?? '';
    const marcas = (q.marcas as string[] | undefined) ?? [];
    const tallas = (q.tallas as string[] | undefined) ?? [];
    const especiales = (q.categoriasEspeciales as string[] | undefined) ?? [];

    const filtered = mockProducts.filter((p) => {
      if (search) {
        const hay = [p.nombre, p.ref].join(' ').toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (categoria && p.categoria !== categoria) return false;
      if (marcas.length > 0 && !marcas.includes(p.marca)) return false;
      if (tallas.length > 0 && !p.tallas.some((t) => tallas.includes(t))) return false;
      if (especiales.length > 0 && !especiales.some((c) => p.categoria.toLowerCase().includes(c.toLowerCase()))) {
        return false;
      }
      return true;
    });
    return { data: filtered, meta: { totalRecords: filtered.length, page: 1, limit: 12, totalPages: 1 } };
  });

  // Taxonomía estable: independiente de los productos filtrados.
  (catalogApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue(
    Array.from(new Set(mockProducts.map((p) => p.categoria))),
  );
  (catalogApi.getBrands as ReturnType<typeof vi.fn>).mockResolvedValue(['SurtiTelas']);
};

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installCatalogMock();
    window.localStorage.clear();
  });

  it('renders product grid after loading', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
      expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument();
    });
  });

  it('filters products by search term', async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar productos, marcas, categorías...');
    fireEvent.change(searchInput, { target: { value: 'Pantaloneta' } });

    await waitFor(() => {
      const products = screen.getAllByRole('heading', { name: /Camiseta Premium|Pantaloneta Deportiva/ });
      expect(products).toHaveLength(1);
      expect(products[0]).toHaveTextContent('Pantaloneta Deportiva');
    });
  });

  it('opens product detail modal on click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    });

    const productCards = screen.getAllByText('Camiseta Premium');
    await user.click(productCards[0]);

    expect(screen.getByTestId('product-modal')).toBeInTheDocument();
    expect(screen.getByText('Cerrar')).toBeInTheDocument();
  });

  it('toggles favorite and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    });

    const favoriteButtons = screen.getAllByLabelText('Agregar a favoritos');
    await user.click(favoriteButtons[0]);

    const stored = JSON.parse(window.localStorage.getItem('surtitelas.favorites') || '[]');
    expect(stored).toContain('1');
  });

  it('shows empty state when no products match', async () => {
    mockCatalogList.mockResolvedValue({ data: [], meta: { totalRecords: 0, page: 1, limit: 50, totalPages: 1 } });
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No se encontraron productos')).toBeInTheDocument();
    });
  });

  it('never shows the empty state while the request is still in flight', async () => {
    let resolveList: (value: unknown) => void = () => {};
    mockCatalogList.mockImplementation(
      () => new Promise((resolve) => { resolveList = resolve; })
    );

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    // La consulta está en curso: no debe aparecer el mensaje de "sin resultados".
    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();
    expect(mockCatalogList).toHaveBeenCalled();

    resolveList({ data: mockProducts, meta: { totalRecords: 2, page: 1, limit: 12, totalPages: 1 } });

    await waitFor(() => {
      expect(screen.getByText('Camiseta Premium')).toBeInTheDocument();
    });
    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Escenarios de filtros                                               */
/* ------------------------------------------------------------------ */

const lastQuery = () => mockCatalogList.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;

const renderCatalog = (initialEntry = '/catalogo') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CatalogPage />
    </MemoryRouter>
  );

const openDrawer = async () => {
  // Ancla exacta: "Limpiar filtros" también contiene la palabra "filtros".
  fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
  await screen.findByTestId('filter-drawer');
};

describe('CatalogPage - filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installCatalogMock();
    window.localStorage.clear();
  });

  it('1. carga inicial sin pulsar ningún botón', async () => {
    renderCatalog();
    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    expect(lastQuery()).toMatchObject({ page: 1, limit: 12, sort: 'createdAt', order: 'desc' });
    expect(lastQuery()).not.toHaveProperty('categoria');
    expect(lastQuery()).not.toHaveProperty('search');
  });

  it('2. selecciona una categoría y filtra', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Pantalones' }));

    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'Pantalones'));
    expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument();
    expect(screen.queryByText('Camiseta Premium')).not.toBeInTheDocument();
  });

  it('3. vuelve de una categoría a "Todas" y la petición queda sin filtros', async () => {
    // Caso crítico: la URL trae la categoría, igual que al recibir un enlace.
    renderCatalog('/catalogo?categoria=Camisas');
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));

    await waitFor(() => {
      expect(lastQuery()).not.toHaveProperty('categoria');
    });
    expect(lastQuery()).toMatchObject({ page: 1, limit: 12, sort: 'createdAt', order: 'desc' });
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
    expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument();
  });

  it('4. "Limpiar filtros" elimina todos los parámetros residuales', async () => {
    renderCatalog('/catalogo?categoria=Camisas');
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'aplicar tallas' }));
    await waitFor(() => expect(lastQuery()).toHaveProperty('tallas'));

    fireEvent.change(screen.getByPlaceholderText('Buscar productos, marcas, categorías...'), {
      target: { value: 'Pantaloneta' },
    });
    await waitFor(() => expect(lastQuery()).toHaveProperty('search', 'Pantaloneta'));

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => {
      const q = lastQuery() ?? {};
      expect(q).not.toHaveProperty('categoria');
      expect(q).not.toHaveProperty('search');
      expect(q).not.toHaveProperty('tallas');
      expect(q).not.toHaveProperty('marcas');
      expect(q).not.toHaveProperty('categoriasEspeciales');
      expect(q).not.toHaveProperty('marca');
    });

    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
    expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar productos, marcas, categorías...')).toHaveValue('');
  });

  it('5. la búsqueda espera al debounce antes de consultar', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
    const callsBefore = mockCatalogList.mock.calls.length;

    const input = screen.getByPlaceholderText('Buscar productos, marcas, categorías...');
    fireEvent.change(input, { target: { value: 'cami' } });

    // Antes de cumplir el debounce no debe existir ninguna petición nueva.
    await new Promise((r) => setTimeout(r, 200));
    expect(mockCatalogList.mock.calls.length).toBe(callsBefore);

    await waitFor(() => expect(lastQuery()).toHaveProperty('search', 'cami'), { timeout: 2000 });
    expect(mockCatalogList.mock.calls.length).toBe(callsBefore + 1);
  });

  it('6. no hace una petición por cada carácter escrito', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
    const callsBefore = mockCatalogList.mock.calls.length;

    const input = screen.getByPlaceholderText('Buscar productos, marcas, categorías...');
    for (const value of ['c', 'ca', 'cam', 'cami', 'camis', 'camisa']) {
      fireEvent.change(input, { target: { value } });
    }

    await waitFor(() => expect(lastQuery()).toHaveProperty('search', 'camisa'), { timeout: 2000 });
    // Una sola petición para las 6 pulsaciones de tecla.
    expect(mockCatalogList.mock.calls.length).toBe(callsBefore + 1);
  });

  it('7. muestra loading y no el estado vacío mientras busca', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    let resolveList: (value: unknown) => void = () => {};
    mockCatalogList.mockImplementation(
      () => new Promise((resolve) => { resolveList = resolve; })
    );

    fireEvent.change(screen.getByPlaceholderText('Buscar productos, marcas, categorías...'), {
      target: { value: 'inexistente' },
    });

    await waitFor(() => expect(mockCatalogList).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();

    resolveList({ data: [], meta: { totalRecords: 0, page: 1, limit: 12, totalPages: 1 } });
    await waitFor(() => expect(screen.getByText('No se encontraron productos')).toBeInTheDocument());
  });

  it('8. el estado vacío solo aparece al terminar la petición', async () => {
    let resolveList: (value: unknown) => void = () => {};
    mockCatalogList.mockImplementation(
      () => new Promise((resolve) => { resolveList = resolve; })
    );

    renderCatalog();

    expect(screen.queryByText('No se encontraron productos')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.product-card-skeleton').length).toBeGreaterThan(0);

    resolveList({ data: mockProducts, meta: { totalRecords: 2, page: 1, limit: 12, totalPages: 1 } });
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
  });

  it('9. aplica varios filtros simultáneos', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Pantalones' }));
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'Pantalones'));

    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'aplicar marcas' }));
    await waitFor(() => expect(lastQuery()).toHaveProperty('marcas', ['SurtiTelas']));
    expect(lastQuery()).toHaveProperty('categoria', 'Pantalones');

    await waitFor(() => expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument());
  });

  it('10. varias categorías especiales: no ignora ninguna', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'aplicar varias especiales' }));

    await waitFor(() =>
      expect(lastQuery()).toHaveProperty('categoriasEspeciales', ['Camisas', 'Pantalones'])
    );
    // Con el bug de [0] solo se conservaba la primera categoría.
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());
    expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument();
  });

  it('11. reinicia la página a 1 al cambiar cualquier filtro', async () => {
    renderCatalog();
    await waitFor(() => expect(screen.getByText('Camiseta Premium')).toBeInTheDocument());

    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'aplicar tallas' }));
    await waitFor(() => expect(lastQuery()).toHaveProperty('tallas'));
    expect(lastQuery()).toHaveProperty('page', 1);

    fireEvent.click(screen.getByRole('button', { name: 'Camisas' }));
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'Camisas'));
    expect(lastQuery()).toHaveProperty('page', 1);
  });

  it('12. entra directo por URL con categoría y la aplica sola', async () => {
    renderCatalog('/catalogo?categoria=Pantalones');

    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'Pantalones'));
    await waitFor(() => expect(screen.getByText('Pantaloneta Deportiva')).toBeInTheDocument());
    expect(screen.queryByText('Camiseta Premium')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver todos los productos')).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Sincronización URL <-> estado (regresión de transiciones)           */
/* ------------------------------------------------------------------ */

const CATALOG_PRODUCTS = [
  { id: '1', ref: 'R1', nombre: 'PREMIUN', categoria: 'DIMANTE', marca: 'SurtiTelas', precio: 45000, imagenPrincipal: '', imagenes: [], tallas: ['M', 'L'], publicado: true, estado: 'Activo' },
  { id: '2', ref: 'R2', nombre: 'CLASICA', categoria: 'BLUSAS DAMA', marca: 'SurtiTelas', precio: 39000, imagenPrincipal: '', imagenes: [], tallas: ['S', 'M'], publicado: true, estado: 'Activo' },
  { id: '3', ref: 'R3', nombre: 'URBANA', categoria: 'CAMISETAS', marca: 'SurtiTelas', precio: 32000, imagenPrincipal: '', imagenes: [], tallas: ['M'], publicado: true, estado: 'Activo' },
];

/** Componente auxiliar para observar la URL real tras cada transición. */
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="url">{location.pathname + location.search}</div>;
};

const renderWithProbe = (initialEntry = '/catalogo') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <CatalogPage />
    </MemoryRouter>
  );

const url = () => screen.getByTestId('url').textContent ?? '';
const pill = (name: string) => screen.getByRole('button', { name });
const waitInitial = () => waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

describe('CatalogPage - sincronización URL/estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (catalogApi.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue([
      'DIMANTE',
      'BLUSAS DAMA',
      'CAMISETAS',
      'ZAFIRO',
    ]);
    (catalogApi.getBrands as ReturnType<typeof vi.fn>).mockResolvedValue(['SurtiTelas']);
    mockCatalogList.mockImplementation(async (query?: Record<string, unknown>) => {
      const categoria = (query?.categoria as string | undefined) ?? '';
      const data = categoria
        ? CATALOG_PRODUCTS.filter((p) => p.categoria === categoria)
        : [...CATALOG_PRODUCTS];
      return { data, meta: { totalRecords: data.length, page: 1, limit: 12, totalPages: 1 } };
    });
    window.localStorage.clear();
  });

  it('1. /catalogo → seleccionar DIMANTE actualiza estado, API y URL', async () => {
    renderWithProbe();
    await waitInitial();

    fireEvent.click(pill('DIMANTE'));

    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE'));
    await waitFor(() => expect(url()).toBe('/catalogo?categoria=DIMANTE'));
    expect(screen.getByText('PREMIUN')).toBeInTheDocument();
    expect(screen.queryByText('URBANA')).not.toBeInTheDocument();
  });

  it('2. DIMANTE → Todas deja la URL en /catalogo sin parámetro', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE'));

    fireEvent.click(pill('Todas'));

    await waitFor(() => expect(url()).toBe('/catalogo'));
    await waitFor(() => expect(lastQuery()).not.toHaveProperty('categoria'));
    expect(screen.getByText('URBANA')).toBeInTheDocument();
    expect(screen.getByText('CLASICA')).toBeInTheDocument();
  });

  it('3. DIMANTE → CAMISETAS sin restaurar DIMANTE en ningún momento', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE'));

    // La opción debe seguir existiendo aunque el resultado filtrado sea DIMANTE.
    expect(pill('CAMISETAS')).toBeInTheDocument();

    mockCatalogList.mockClear();
    fireEvent.click(pill('CAMISETAS'));

    await waitFor(() => expect(url()).toBe('/catalogo?categoria=CAMISETAS'));
    // Ninguna petición intermedia debe volver a pedir DIMANTE.
    const categoriasPedidas = mockCatalogList.mock.calls
      .map((c) => (c[0] as Record<string, unknown> | undefined)?.categoria)
      .filter(Boolean);
    expect(categoriasPedidas.every((c) => c === 'CAMISETAS')).toBe(true);
    expect(categoriasPedidas).not.toContain('DIMANTE');
    await waitFor(() => expect(screen.getByText('URBANA')).toBeInTheDocument());
  });

  it('4. CAMISETAS → DIMANTE y vuelta', async () => {
    renderWithProbe('/catalogo?categoria=CAMISETAS');
    await waitFor(() => expect(screen.getByText('URBANA')).toBeInTheDocument());

    fireEvent.click(pill('DIMANTE'));
    await waitFor(() => expect(url()).toBe('/catalogo?categoria=DIMANTE'));

    fireEvent.click(pill('Todas'));
    await waitFor(() => expect(url()).toBe('/catalogo'));

    fireEvent.click(pill('DIMANTE'));
    await waitFor(() => expect(url()).toBe('/catalogo?categoria=DIMANTE'));
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());
  });

  it('5. encadena varias categorías consecutivamente', async () => {
    renderWithProbe();
    await waitInitial();

    for (const cat of ['DIMANTE', 'CAMISETAS', 'BLUSAS DAMA', 'DIMANTE', 'Todas']) {
      fireEvent.click(pill(cat));
      const esperado = cat === 'Todas' ? '/catalogo' : `/catalogo?categoria=${encodeURIComponent(cat).replace(/%20/g, '+')}`;
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(url()).toBe(esperado));
    }

    expect(screen.getByText('PREMIUN')).toBeInTheDocument();
    expect(screen.getByText('URBANA')).toBeInTheDocument();
  });

  it('6. combina categoría + marca', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    await screen.findByTestId('filter-drawer');
    fireEvent.click(screen.getByRole('button', { name: 'aplicar marcas' }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ categoria: 'DIMANTE', marcas: ['SurtiTelas'] }));
  });

  it('7. quitar solo la categoría conserva los demás parámetros de la URL', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE&talla=M');
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE'));

    fireEvent.click(pill('Todas'));

    // La categoría se borra; el resto de parámetros NO se tocan.
    await waitFor(() => expect(url()).toBe('/catalogo?talla=M'));
  });

  it('8. combina categoría + talla', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    await screen.findByTestId('filter-drawer');
    fireEvent.click(screen.getByRole('button', { name: 'aplicar tallas' }));

    await waitFor(() => expect(lastQuery()).toMatchObject({ categoria: 'DIMANTE', tallas: ['M'] }));
  });

  it('9. "Limpiar filtros" restablece todo y deja /catalogo exacto', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE&talla=M');
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Buscar productos, marcas, categorías...'), {
      target: { value: 'PREMIUN' },
    });
    await waitFor(() => expect(lastQuery()).toHaveProperty('search', 'PREMIUN'), { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => expect(url()).toBe('/catalogo'));
    await waitFor(() => {
      const q = lastQuery() ?? {};
      expect(q).not.toHaveProperty('categoria');
      expect(q).not.toHaveProperty('talla');
      expect(q).not.toHaveProperty('tallas');
      expect(q).not.toHaveProperty('search');
      expect(q).toMatchObject({ page: 1, limit: 12 });
    });
  });

  it('10. entrada directa por URL aplica DIMANTE al montar', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');

    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());
    expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE');
    expect(url()).toBe('/catalogo?categoria=DIMANTE');
    expect(screen.queryByText('URBANA')).not.toBeInTheDocument();
  });

  it('11. la URL refleja cada transición', async () => {
    renderWithProbe();
    await waitInitial();
    expect(url()).toBe('/catalogo');

    fireEvent.click(pill('DIMANTE'));
    await waitFor(() => expect(url()).toBe('/catalogo?categoria=DIMANTE'));

    fireEvent.click(pill('CAMISETAS'));
    await waitFor(() => expect(url()).toBe('/catalogo?categoria=CAMISETAS'));

    fireEvent.click(pill('Todas'));
    await waitFor(() => expect(url()).toBe('/catalogo'));
  });

  it('12. nunca se restaura automáticamente el filtro anterior', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    fireEvent.click(pill('CAMISETAS'));
    await waitFor(() => expect(screen.getByText('URBANA')).toBeInTheDocument());

    // Tras estabilizarse, ninguna consulta posterior debe volver a DIMANTE.
    const pedidas = () =>
      mockCatalogList.mock.calls.map((c) => (c[0] as Record<string, unknown> | undefined)?.categoria);
    const desde = pedidas().indexOf('CAMISETAS');
    expect(pedidas().slice(desde).filter(Boolean).every((c) => c === 'CAMISETAS')).toBe(true);
    expect(url()).toBe('/catalogo?categoria=CAMISETAS');
  });

  it('13. las opciones siguen disponibles tras filtrar (píldoras estables)', async () => {
    renderWithProbe();
    await waitInitial();

    fireEvent.click(pill('DIMANTE'));
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    // Ninguna opción puede desaparecer por el filtrado.
    expect(pill('Todas')).toBeInTheDocument();
    expect(pill('DIMANTE')).toBeInTheDocument();
    expect(pill('BLUSAS DAMA')).toBeInTheDocument();
    expect(pill('CAMISETAS')).toBeInTheDocument();
    // Categoría de la taxonomía sin productos: también disponible.
    expect(pill('ZAFIRO')).toBeInTheDocument();
  });

  it('14. la URL nunca queda como ?categoria=Todas', async () => {
    renderWithProbe('/catalogo?categoria=DIMANTE');
    await waitFor(() => expect(screen.getByText('PREMIUN')).toBeInTheDocument());

    fireEvent.click(pill('Todas'));

    await waitFor(() => expect(url()).toBe('/catalogo'));
    expect(url()).not.toContain('Todas');
  });

  it('15. la búsqueda pendiente no reaparece tras "Limpiar filtros"', async () => {
    renderWithProbe();
    await waitInitial();

    // Con un filtro activo existe el botón "Limpiar filtros".
    fireEvent.click(pill('DIMANTE'));
    await waitFor(() => expect(lastQuery()).toHaveProperty('categoria', 'DIMANTE'));

    const input = screen.getByPlaceholderText('Buscar productos, marcas, categorías...');
    fireEvent.change(input, { target: { value: 'URBANA' } });
    // Se limpia antes de que venza el debounce de 450 ms.
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await new Promise((r) => setTimeout(r, 800));

    expect(lastQuery()).not.toHaveProperty('search');
    expect(input).toHaveValue('');
    expect(url()).toBe('/catalogo');
    expect(screen.getByText('PREMIUN')).toBeInTheDocument();
    expect(screen.getByText('URBANA')).toBeInTheDocument();
  });
});
