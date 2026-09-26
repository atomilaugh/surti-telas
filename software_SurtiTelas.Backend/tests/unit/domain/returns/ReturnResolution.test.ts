import { describe, it, expect, vi } from 'vitest';
import { ReturnResolution } from '@/modules/returns/domain/entities/ReturnResolution';
import { BadRequestError } from '@/shared/domain/errors';

describe('ReturnResolution — Domain Logic', () => {
  it('should create with all fields', () => {
    const resolution = new ReturnResolution({
      id: 'rr-1',
      returnRequestId: 'req-1',
      tipo: 'REPARACION',
      cantidad: 5,
      responsable: 'operador1',
      observaciones: 'Reparar y reingresar',
      fecha: new Date('2026-09-24T10:00:00.000Z'),
    });

    expect(resolution.id).toBe('rr-1');
    expect(resolution.returnRequestId).toBe('req-1');
    expect(resolution.tipo).toBe('REPARACION');
    expect(resolution.cantidad).toBe(5);
    expect(resolution.responsable).toBe('operador1');
    expect(resolution.observaciones).toBe('Reparar y reingresar');
    expect(resolution.fecha).toEqual(new Date('2026-09-24T10:00:00.000Z'));
  });

  it('should use current date as fecha if not provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'));

    const resolution = new ReturnResolution({
      id: 'rr-2',
      returnRequestId: 'req-2',
      tipo: 'DEVOLUCION_PROVEEDOR',
      cantidad: 3,
      fecha: undefined as never,
    });

    expect(resolution.fecha).toEqual(new Date('2026-09-24T10:00:00.000Z'));
    vi.useRealTimers();
  });

  it('should throw on empty returnRequestId', () => {
    expect(() =>
      new ReturnResolution({
        id: 'rr-3',
        returnRequestId: '',
        tipo: 'DESCARTE',
        cantidad: 1,
        fecha: new Date(),
      })
    ).toThrow(BadRequestError);
  });

  it('should throw on invalid tipo', () => {
    expect(() =>
      new ReturnResolution({
        id: 'rr-4',
        returnRequestId: 'req-4',
        tipo: 'INVALID' as never,
        cantidad: 1,
        fecha: new Date(),
      })
    ).toThrow(BadRequestError);
  });

  it('should throw on negative cantidad', () => {
    expect(() =>
      new ReturnResolution({
        id: 'rr-5',
        returnRequestId: 'req-5',
        tipo: 'DESCARTE',
        cantidad: -1,
        fecha: new Date(),
      })
    ).toThrow(BadRequestError);
  });

  it('should accept zero cantidad', () => {
    const resolution = new ReturnResolution({
      id: 'rr-6',
      returnRequestId: 'req-6',
      tipo: 'DESCARTE',
      cantidad: 0,
      fecha: new Date(),
    });

    expect(resolution.cantidad).toBe(0);
  });

  describe('tipo acceptance', () => {
    it('should accept REINGRESO_EXISTENCIAS', () => {
      const resolution = new ReturnResolution({
        id: 'rr-7',
        returnRequestId: 'req-7',
        tipo: 'REINGRESO_EXISTENCIAS',
        cantidad: 10,
        fecha: new Date(),
      });
      expect(resolution.tipo).toBe('REINGRESO_EXISTENCIAS');
    });

    it('should accept REPARACION', () => {
      const resolution = new ReturnResolution({
        id: 'rr-8',
        returnRequestId: 'req-8',
        tipo: 'REPARACION',
        cantidad: 2,
        fecha: new Date(),
      });
      expect(resolution.tipo).toBe('REPARACION');
    });

    it('should accept DESCARTE', () => {
      const resolution = new ReturnResolution({
        id: 'rr-9',
        returnRequestId: 'req-9',
        tipo: 'DESCARTE',
        cantidad: 8,
        fecha: new Date(),
      });
      expect(resolution.tipo).toBe('DESCARTE');
    });

    it('should accept DEVOLUCION_PROVEEDOR', () => {
      const resolution = new ReturnResolution({
        id: 'rr-10',
        returnRequestId: 'req-10',
        tipo: 'DEVOLUCION_PROVEEDOR',
        cantidad: 15,
        fecha: new Date(),
      });
      expect(resolution.tipo).toBe('DEVOLUCION_PROVEEDOR');
    });
  });

  it('should accept null responsable and observaciones', () => {
    const resolution = new ReturnResolution({
      id: 'rr-11',
      returnRequestId: 'req-11',
      tipo: 'DESCARTE',
      cantidad: 3,
      responsable: null,
      observaciones: null,
      fecha: new Date(),
    });

    expect(resolution.responsable).toBeNull();
    expect(resolution.observaciones).toBeNull();
  });

  it('should default responsable and observaciones to null when omitted', () => {
    const resolution = new ReturnResolution({
      id: 'rr-12',
      returnRequestId: 'req-12',
      tipo: 'REPARACION',
      cantidad: 4,
      fecha: new Date(),
    });

    expect(resolution.responsable).toBeNull();
    expect(resolution.observaciones).toBeNull();
  });

  it('should getTipos return all valid tipos', () => {
    const tipos = ReturnResolution.getTipos();
    expect(tipos).toEqual(['REINGRESO_EXISTENCIAS', 'REPARACION', 'DESCARTE', 'DEVOLUCION_PROVEEDOR']);
  });

  it('should convert to DTO', () => {
    const resolution = new ReturnResolution({
      id: 'rr-13',
      returnRequestId: 'req-13',
      tipo: 'REINGRESO_EXISTENCIAS',
      cantidad: 7,
      responsable: 'operador2',
      observaciones: 'Reingresar a existencias',
      fecha: new Date('2026-09-24T10:00:00.000Z'),
    });

    const dto = resolution.toDTO();
    expect(dto.id).toBe('rr-13');
    expect(dto.returnRequestId).toBe('req-13');
    expect(dto.tipo).toBe('REINGRESO_EXISTENCIAS');
    expect(dto.cantidad).toBe(7);
    expect(dto.responsable).toBe('operador2');
    expect(dto.observaciones).toBe('Reingresar a existencias');
    expect(dto.fecha).toEqual(new Date('2026-09-24T10:00:00.000Z'));
  });
});
