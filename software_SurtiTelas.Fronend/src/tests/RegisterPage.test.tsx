import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '@/presentation/pages/auth/RegisterPage';

const mockUseAuth = vi.fn();

vi.mock('@/app/providers/AppProviders', () => ({
  useAuth: () => mockUseAuth(),
  TEST_ACCOUNTS: [],
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      loginWithCredentials: vi.fn().mockResolvedValue({ success: false, error: 'Credenciales incorrectas' }),
      clearReturnTo: vi.fn(),
    });
  });

  it('renders register form fields', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Apellido')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Número telefónico')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('allows typing in form fields', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Nombre'), 'Juan');
    await user.type(screen.getByPlaceholderText('Apellido'), 'Pérez');
    await user.type(screen.getByPlaceholderText('Correo electrónico'), 'juan@test.com');
    await user.type(screen.getByPlaceholderText('Número telefónico'), '3001234567');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'Abc12345');

    expect(screen.getByPlaceholderText('Nombre')).toHaveValue('Juan');
    expect(screen.getByPlaceholderText('Correo electrónico')).toHaveValue('juan@test.com');
  });
});
