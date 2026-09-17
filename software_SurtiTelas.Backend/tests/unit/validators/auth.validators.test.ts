import { describe, it, expect } from 'vitest';
import { RegisterSchema } from '@/modules/auth/presentation/validators/auth.validators';

describe('RegisterSchema', () => {
  it('acepta apellidos sin eliminarlo', () => {
    const result = RegisterSchema.safeParse({
      nombre: 'Carlos',
      apellidos: 'Prueba',
      email: 'test@test.com',
      password: 'Password123!',
      role: 'CLIENTE',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apellidos).toBe('Prueba');
    }
  });

  it('acepta ciudad', () => {
    const result = RegisterSchema.safeParse({
      nombre: 'Carlos',
      email: 'test@test.com',
      password: 'Password123!',
      role: 'CLIENTE',
      ciudad: 'Medellin',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ciudad).toBe('Medellin');
    }
  });

  it('ignora campos desconocidos que no estan en schema', () => {
    const result = RegisterSchema.safeParse({
      nombre: 'Carlos',
      email: 'test@test.com',
      password: 'Password123!',
      role: 'CLIENTE',
      campoExtra: 'eliminado',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).campoExtra).toBeUndefined();
    }
  });
});
