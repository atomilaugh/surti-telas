import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/infrastructure/api/catalogApi', () => ({
  catalogApi: {
    list: vi.fn(),
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

vi.mock('@/presentation/pages/components/FilterDrawer', () => ({
  FilterDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="filter-drawer">
        <button onClick={onClose}>Cerrar filtros</button>
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

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalogList.mockImplementation(async (query?: Record<string, unknown>) => {
      const search = (query?.search as string | undefined)?.toLowerCase() || '';
      const filtered = search
        ? mockProducts.filter(p => (p.nombre ?? '').toLowerCase().includes(search))
        : mockProducts;
      return { data: filtered, meta: { totalRecords: filtered.length, page: 1, limit: 50, totalPages: 1 } };
    });
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
