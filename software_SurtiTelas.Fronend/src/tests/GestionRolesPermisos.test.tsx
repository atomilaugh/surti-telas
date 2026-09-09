import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { Rol } from '@/infrastructure/api/rolesApi';
import type { Permission } from '@/infrastructure/api/permissionsApi';

vi.mock('@/infrastructure/api/rolesApi', () => ({
  rolesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateStatus: vi.fn(),
    listRolePermissions: vi.fn(),
    assignPermission: vi.fn(),
    removePermission: vi.fn(),
  },
}));

vi.mock('@/infrastructure/api/permissionsApi', () => ({
  permissionsApi: {
    list: vi.fn(),
    listRolePermissions: vi.fn(),
  },
}));

vi.mock('@/infrastructure/api/httpClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

interface MockAction {
  label: string | ((item: Record<string, unknown>) => string);
  onClick: (item: Record<string, unknown>) => void;
  disabled?: boolean | ((item: Record<string, unknown>) => boolean);
}

interface MockDataTableProps {
  data: Array<Record<string, unknown>>;
  columns: unknown[];
  actions: MockAction[] | ((item: Record<string, unknown>) => MockAction[]);
  emptyMessage: string;
}

vi.mock('@/shared/ui/DataTable', () => ({
  DataTable: ({ data, actions, emptyMessage }: MockDataTableProps) => {
    const actionList = typeof actions === 'function' ? [] : (actions ?? []);
    return (
      <div data-testid="datatable">
        <span data-testid="row-count">{data.length}</span>
        <span data-testid="empty-msg">{emptyMessage}</span>
        <div data-testid="action-buttons">
          {data.map((item, i) =>
            actionList.map((action, j) => {
              const label = typeof action.label === 'function' ? action.label(item) : action.label;
              const isDisabled = typeof action.disabled === 'function' ? action.disabled(item) : action.disabled;
              return (
                <button
                  key={`${i}-${j}`}
                  data-testid={`action-${label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => action.onClick(item)}
                  disabled={isDisabled}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  },
  DataTableColumn: class {},
  DataTableAction: class {},
}));

interface BadgeProps {
  children: React.ReactNode;
  _variant?: string;
}

vi.mock('@/shared/ui/Badge', () => ({
  Badge: ({ children, _variant: _v }: BadgeProps) => (
    <span data-testid="badge">{children}</span>
  ),
}));

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSearch: (val: string) => void;
}

vi.mock('@/shared/ui/SearchInput', () => ({
  SearchInput: ({ placeholder, value, onChange }: SearchInputProps) => (
    <input
      data-testid="search-input"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  _variant?: string;
  leftIcon?: React.ReactNode;
  _size?: string;
  type?: string;
}

vi.mock('@/shared/ui/Button', () => ({
  Button: ({ children, onClick, leftIcon, type }: ButtonProps) => (
    <button
      data-testid="button"
      onClick={onClick}
      type={type ?? 'button'}
    >
      {leftIcon}{children}
    </button>
  ),
}));

interface ConfirmationModalProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

vi.mock('@/shared/ui/ConfirmationModal', () => ({
  ConfirmationModal: ({ open, title, description, onConfirm }: ConfirmationModalProps) =>
    open ? (
      <div data-testid="confirmation-modal">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={onConfirm} data-testid="confirm-btn"> Confirmar</button>
      </div>
    ) : null,
}));

vi.mock('@/shared/components/Tooltip', () => ({
  useDelegatedTooltips: () => ({ current: null }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRolesApi = (await import('@/infrastructure/api/rolesApi')).rolesApi as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const mockPermissionsApi = (await import('@/infrastructure/api/permissionsApi')).permissionsApi as {
  list: ReturnType<typeof vi.fn>;
};

const mockRoles: Rol[] = [
  { id: '1', nombre: 'ADMIN', descripcion: 'Administrador', permisos: ['users:read'], usuarios: 5, estado: 'Activo' },
  { id: '2', nombre: 'VENDEDOR', descripcion: 'Vendedor', permisos: [], usuarios: 10, estado: 'Inactivo' },
];

const mockPermisos: Permission[] = [
  { id: 'p1', code: 'employees:read', description: 'Ver empleados', module: 'employees', estado: 'Activo' },
  { id: 'p2', code: 'catalog:create', description: 'Crear productos', module: 'catalog', estado: 'Inactivo' },
];

import { AdminGestionRolesPermisos } from '@/presentation/pages/admin/GestionRolesPermisos';

describe('AdminGestionRolesPermisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolesApi.list.mockResolvedValue(mockRoles);
    mockRolesApi.create.mockResolvedValue(mockRoles[1]);
    mockPermissionsApi.list.mockResolvedValue({ items: mockPermisos, meta: null });
  });

  it('renders page title and tabs', async () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    expect(screen.getByText('Gestión de Roles y Permisos')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Módulos del Sistema')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('renders roles table after loading', async () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    });
  });

  it('renders modules table when switching tabs', async () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('Módulos del Sistema'));

    await waitFor(() => {
      expect(Number(screen.getByTestId('row-count').textContent)).toBeGreaterThan(0);
    });
  });

  it('shows error state when API fails', async () => {
    mockRolesApi.list.mockRejectedValueOnce(new Error('No se pudieron cargar los roles'));

    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no se pudieron cargar los roles/i)).toBeInTheDocument();
    });
  });

  it('calls create when submitting new role form', async () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    });

    const createBtn = screen.getAllByTestId('button').find((b) =>
      b.textContent.includes('Crear rol')
    );
    expect(createBtn).toBeDefined();

    fireEvent.click(createBtn!);

    const form = document.querySelector('form')!;
    const nombreInput = form.querySelector('input[name="nombre"]')!;
    const descInput = form.querySelector('textarea[name="descripcion"]')!;

    fireEvent.change(nombreInput, { target: { value: 'TEST' } });
    fireEvent.change(descInput, { target: { value: 'Test role' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRolesApi.create).toHaveBeenCalledWith({ nombre: 'TEST', descripcion: 'Test role', permisos: [] });
    });
  });

  it('calls delete when confirming role deletion', async () => {
    render(
      <MemoryRouter>
        <AdminGestionRolesPermisos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    });

    const deleteBtn = screen.getByTestId('action-eliminar');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId('confirm-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRolesApi.delete).toHaveBeenCalledWith('2');
    });
  });
});
