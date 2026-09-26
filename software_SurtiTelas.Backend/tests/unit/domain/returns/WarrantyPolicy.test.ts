import { describe, it, expect, vi } from 'vitest';
import { WarrantyPolicy } from '@/modules/returns/domain/entities/WarrantyPolicy';
import { BadRequestError } from '@/shared/domain/errors';

describe('WarrantyPolicy — Domain Logic', () => {
  it('should create with defaults', () => {
    const policy = new WarrantyPolicy({
      id: 'wp-1',
      tipo: 'VENTA',
      diasGarantia: 30,
    });

    expect(policy.activa).toBe(true);
    expect(policy.descripcion).toBeNull();
  });

  it('should create with all fields', () => {
    const policy = new WarrantyPolicy({
      id: 'wp-2',
      tipo: 'FABRICANTE',
      diasGarantia: 90,
      activa: false,
      descripcion: 'Garantía extendida fabricante',
    });

    expect(policy.activa).toBe(false);
    expect(policy.descripcion).toBe('Garantía extendida fabricante');
  });

  it('should throw on invalid tipo', () => {
    expect(() =>
      new WarrantyPolicy({
        id: 'wp-3',
        tipo: 'INVALID' as never,
        diasGarantia: 30,
      })
    ).toThrow(BadRequestError);
  });

  it('should throw on non-integer diasGarantia', () => {
    expect(() =>
      new WarrantyPolicy({
        id: 'wp-4',
        tipo: 'VENTA',
        diasGarantia: 3.5,
      })
    ).toThrow(BadRequestError);
  });

  describe('isApplicable', () => {
    it('should return true when activa and tipo is VENTA', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-5',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: true,
      });

      expect(policy.isApplicable()).toBe(true);
    });

    it('should return true when activa and tipo is FABRICANTE', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-6',
        tipo: 'FABRICANTE',
        diasGarantia: 90,
        activa: true,
      });

      expect(policy.isApplicable()).toBe(true);
    });

    it('should return false when not activa', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-7',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: false,
      });

      expect(policy.isApplicable()).toBe(false);
    });

    it('should return false when tipo is NINGUNA', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-8',
        tipo: 'NINGUNA',
        diasGarantia: 0,
        activa: true,
      });

      expect(policy.isApplicable()).toBe(false);
    });
  });

  describe('calcularVencimiento', () => {
    it('should compute vencimiento = fechaInicio + diasGarantia', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-9',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: true,
      });

      const fechaOrden = new Date('2026-09-20T10:00:00.000Z');
      const vencimiento = policy.calcularVencimiento(fechaOrden);

      expect(vencimiento).toEqual(new Date('2026-10-20T10:00:00.000Z'));
    });

    it('should compute vencimiento for 90 days', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-10',
        tipo: 'FABRICANTE',
        diasGarantia: 90,
        activa: true,
      });

      const fechaOrden = new Date('2026-09-20T10:00:00.000Z');
      const vencimiento = policy.calcularVencimiento(fechaOrden);

      expect(vencimiento).toEqual(new Date('2026-12-19T10:00:00.000Z'));
    });

    it('should compute vencimiento for 0 days (NINGUNA)', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-11',
        tipo: 'NINGUNA',
        diasGarantia: 0,
        activa: true,
      });

      const fechaOrden = new Date('2026-09-20T10:00:00.000Z');
      const vencimiento = policy.calcularVencimiento(fechaOrden);

      expect(vencimiento).toEqual(new Date('2026-09-20T10:00:00.000Z'));
    });
  });

  describe('isActive getter', () => {
    it('should return true when activa is true', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-12',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: true,
      });

      expect(policy.isActive).toBe(true);
    });

    it('should return false when activa is false', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-13',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: false,
      });

      expect(policy.isActive).toBe(false);
    });
  });

  describe('tipo validation', () => {
    it('should accept VENTA', () => {
      const policy = new WarrantyPolicy({ id: 'wp-14', tipo: 'VENTA', diasGarantia: 30 });
      expect(policy.tipo).toBe('VENTA');
    });

    it('should accept FABRICANTE', () => {
      const policy = new WarrantyPolicy({ id: 'wp-15', tipo: 'FABRICANTE', diasGarantia: 90 });
      expect(policy.tipo).toBe('FABRICANTE');
    });

    it('should accept NINGUNA', () => {
      const policy = new WarrantyPolicy({ id: 'wp-16', tipo: 'NINGUNA', diasGarantia: 0 });
      expect(policy.tipo).toBe('NINGUNA');
    });
  });

  describe('toDTO', () => {
    it('should convert to DTO', () => {
      const policy = new WarrantyPolicy({
        id: 'wp-17',
        tipo: 'VENTA',
        diasGarantia: 30,
        activa: true,
        descripcion: 'Test desc',
      });

      const dto = policy.toDTO();
      expect(dto.id).toBe('wp-17');
      expect(dto.tipo).toBe('VENTA');
      expect(dto.diasGarantia).toBe(30);
      expect(dto.activa).toBe(true);
      expect(dto.descripcion).toBe('Test desc');
    });
  });
});
