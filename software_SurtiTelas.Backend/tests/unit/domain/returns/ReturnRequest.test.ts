import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReturnRequest, ReturnRequestStatus } from '@/modules/returns/domain/entities/ReturnRequest';
import { WarrantyPolicy, WarrantyPolicyTipo } from '@/modules/returns/domain/entities/WarrantyPolicy';

describe('ReturnRequest — State Machine', () => {
  let policy: WarrantyPolicy;
  let request: ReturnRequest;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'));

    policy = new WarrantyPolicy({
      id: 'wp-1',
      tipo: 'VENTA',
      diasGarantia: 30,
      activa: true,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
    });

    request = new ReturnRequest({
      id: 'rr-1',
      numeroDevolucion: 'DEV-000001',
      orderId: 'ord-1',
      cantidadTotal: 5,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: policy.tipo,
      diasGarantiaSnapshot: policy.diasGarantia,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: policy.calcularVencimiento(new Date('2026-09-20T10:00:00.000Z')),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canTransitionTo', () => {
    it('should allow SOLICITADA -> EN_REVISION', () => {
      expect(request.canTransitionTo('EN_REVISION')).toBe(true);
    });

    it('should allow SOLICITADA -> RECHAZADA', () => {
      expect(request.canTransitionTo('RECHAZADA')).toBe(true);
    });

    it('should allow EN_REVISION -> APROBADA', () => {
      request.cambiarEstado('EN_REVISION');
      expect(request.canTransitionTo('APROBADA')).toBe(true);
    });

    it('should allow EN_REVISION -> RECHAZADA', () => {
      request.cambiarEstado('EN_REVISION');
      expect(request.canTransitionTo('RECHAZADA')).toBe(true);
    });

    it('should allow APROBADA -> PRODUCTO_RECIBIDO', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('APROBADA');
      expect(request.canTransitionTo('PRODUCTO_RECIBIDO')).toBe(true);
    });

    it('should allow PRODUCTO_RECIBIDO -> EN_INSPECCION', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('APROBADA');
      request.cambiarEstado('PRODUCTO_RECIBIDO');
      expect(request.canTransitionTo('EN_INSPECCION')).toBe(true);
    });

    it('should allow EN_INSPECCION -> RESUELTA', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('APROBADA');
      request.cambiarEstado('PRODUCTO_RECIBIDO');
      request.cambiarEstado('EN_INSPECCION');
      expect(request.canTransitionTo('RESUELTA')).toBe(true);
    });

    it('should reject EN_REVISION -> PRODUCTO_RECIBIDO', () => {
      request.cambiarEstado('EN_REVISION');
      expect(request.canTransitionTo('PRODUCTO_RECIBIDO')).toBe(false);
    });

    it('should reject SOLICITADA -> PRODUCTO_RECIBIDO', () => {
      expect(request.canTransitionTo('PRODUCTO_RECIBIDO')).toBe(false);
    });

    it('should reject APROBADA -> EN_REVISION (no backward)', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('APROBADA');
      expect(request.canTransitionTo('EN_REVISION')).toBe(false);
    });

    it('should reject RECHAZADA -> any', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('RECHAZADA');
      expect(request.canTransitionTo('APROBADA')).toBe(false);
      expect(request.canTransitionTo('RESUELTA')).toBe(false);
    });

    it('should reject RESUELTA -> any', () => {
      request.cambiarEstado('EN_REVISION');
      request.cambiarEstado('APROBADA');
      request.cambiarEstado('PRODUCTO_RECIBIDO');
      request.cambiarEstado('EN_INSPECCION');
      request.cambiarEstado('RESUELTA');
      expect(request.canTransitionTo('EN_REVISION')).toBe(false);
      expect(request.canTransitionTo('APROBADA')).toBe(false);
    });

    it('should allow same state transition', () => {
      expect(request.canTransitionTo('SOLICITADA')).toBe(true);
    });
  });

  describe('cambiarEstado', () => {
    it('should throw on invalid transition', () => {
      expect(() => request.cambiarEstado('APROBADA')).toThrow('No se puede transitar');
    });

    it('should apply valid transition', () => {
      request.cambiarEstado('EN_REVISION');
      expect(request.estado).toBe('EN_REVISION');
    });
  });
});

describe('ReturnRequest — Warranty Snapshot', () => {
  let policy: WarrantyPolicy;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'));

    policy = new WarrantyPolicy({
      id: 'wp-2',
      tipo: 'FABRICANTE',
      diasGarantia: 90,
      activa: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should snapshot warranty policy fields at creation', () => {
    const request = new ReturnRequest({
      id: 'rr-2',
      numeroDevolucion: 'DEV-000002',
      orderId: 'ord-2',
      cantidadTotal: 3,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: policy.tipo,
      diasGarantiaSnapshot: policy.diasGarantia,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: policy.calcularVencimiento(new Date('2026-09-20T10:00:00.000Z')),
    });

    expect(request.tipoGarantiaSnapshot).toBe('FABRICANTE');
    expect(request.diasGarantiaSnapshot).toBe(90);
  });

  it('should compute warranty dates from order date + policy days', () => {
    const request = new ReturnRequest({
      id: 'rr-3',
      numeroDevolucion: 'DEV-000003',
      orderId: 'ord-3',
      cantidadTotal: 2,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: policy.tipo,
      diasGarantiaSnapshot: policy.diasGarantia,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: new Date('2026-12-19T10:00:00.000Z'),
    });

    expect(request.fechaInicioGarantia).toEqual(new Date('2026-09-20T10:00:00.000Z'));
    expect(request.fechaVencimientoGarantia).toEqual(new Date('2026-12-19T10:00:00.000Z'));
  });

  it('tieneGarantiaVigente should return true when within warranty period', () => {
    const request = new ReturnRequest({
      id: 'rr-4',
      numeroDevolucion: 'DEV-000004',
      orderId: 'ord-4',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: 'VENTA' as WarrantyPolicyTipo,
      diasGarantiaSnapshot: 30,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: new Date('2026-10-20T10:00:00.000Z'),
    });

    vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
    expect(request.tieneGarantiaVigente()).toBe(true);
  });

  it('tieneGarantiaVigente should return false when past warranty period', () => {
    const request = new ReturnRequest({
      id: 'rr-5',
      numeroDevolucion: 'DEV-000005',
      orderId: 'ord-5',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: 'VENTA' as WarrantyPolicyTipo,
      diasGarantiaSnapshot: 30,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: new Date('2026-10-20T10:00:00.000Z'),
    });

    vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z'));
    expect(request.tieneGarantiaVigente()).toBe(false);
  });

  it('tieneGarantiaVigente should return false when fechaVencimientoGarantia is null', () => {
    const request = new ReturnRequest({
      id: 'rr-5b',
      numeroDevolucion: 'DEV-000005B',
      orderId: 'ord-5b',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: 'VENTA' as WarrantyPolicyTipo,
      diasGarantiaSnapshot: 30,
      fechaInicioGarantia: null,
      fechaVencimientoGarantia: null,
    });

    expect(request.tieneGarantiaVigente()).toBe(false);
  });
});

describe('ReturnRequest — Terminal States', () => {
  it('should not allow transitions from RECHAZADA', () => {
    const policy = new WarrantyPolicy({
      id: 'wp-6',
      tipo: 'VENTA',
      diasGarantia: 30,
      activa: true,
    });

    const request = new ReturnRequest({
      id: 'rr-6',
      numeroDevolucion: 'DEV-000006',
      orderId: 'ord-6',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: policy.tipo,
      diasGarantiaSnapshot: policy.diasGarantia,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: policy.calcularVencimiento(new Date('2026-09-20T10:00:00.000Z')),
    });

    request.cambiarEstado('EN_REVISION');
    request.cambiarEstado('RECHAZADA');

    expect(() => request.cambiarEstado('APROBADA')).toThrow('No se puede transitar');
  });

  it('should not allow transitions from RESUELTA', () => {
    const policy = new WarrantyPolicy({
      id: 'wp-7',
      tipo: 'VENTA',
      diasGarantia: 30,
      activa: true,
    });

    const request = new ReturnRequest({
      id: 'rr-7',
      numeroDevolucion: 'DEV-000007',
      orderId: 'ord-7',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
      tipoGarantiaSnapshot: policy.tipo,
      diasGarantiaSnapshot: policy.diasGarantia,
      fechaInicioGarantia: new Date('2026-09-20T10:00:00.000Z'),
      fechaVencimientoGarantia: policy.calcularVencimiento(new Date('2026-09-20T10:00:00.000Z')),
    });

    request.cambiarEstado('EN_REVISION');
    request.cambiarEstado('APROBADA');
    request.cambiarEstado('PRODUCTO_RECIBIDO');
    request.cambiarEstado('EN_INSPECCION');
    request.cambiarEstado('RESUELTA');

    expect(() => request.cambiarEstado('EN_REVISION')).toThrow('No se puede transitar');
  });

  it('isTerminal should return true for RECHAZADA', () => {
    const request = new ReturnRequest({
      id: 'rr-8',
      numeroDevolucion: 'DEV-000008',
      orderId: 'ord-8',
      cantidadTotal: 1,
      estado: 'RECHAZADA',
    });

    expect(request.isTerminal()).toBe(true);
  });

  it('isTerminal should return true for RESUELTA', () => {
    const request = new ReturnRequest({
      id: 'rr-9',
      numeroDevolucion: 'DEV-000009',
      orderId: 'ord-9',
      cantidadTotal: 1,
      estado: 'RESUELTA',
    });

    expect(request.isTerminal()).toBe(true);
  });

  it('isTerminal should return false for SOLICITADA', () => {
    const request = new ReturnRequest({
      id: 'rr-10',
      numeroDevolucion: 'DEV-000010',
      orderId: 'ord-10',
      cantidadTotal: 1,
      estado: 'SOLICITADA',
    });

    expect(request.isTerminal()).toBe(false);
  });
});

describe('ReturnRequest — Validation', () => {
  it('should throw on empty numeroDevolucion', () => {
    expect(() =>
      new ReturnRequest({
        numeroDevolucion: '',
        orderId: 'ord-1',
        cantidadTotal: 1,
        estado: 'SOLICITADA',
      })
    ).toThrow('obligatorio');
  });

  it('should throw on empty orderId', () => {
    expect(() =>
      new ReturnRequest({
        numeroDevolucion: 'DEV-001',
        orderId: '',
        cantidadTotal: 1,
        estado: 'SOLICITADA',
      })
    ).toThrow('obligatorio');
  });

  it('should throw on non-positive cantidadTotal', () => {
    expect(() =>
      new ReturnRequest({
        numeroDevolucion: 'DEV-002',
        orderId: 'ord-2',
        cantidadTotal: 0,
        estado: 'SOLICITADA',
      })
    ).toThrow('mayor a 0');
  });

  it('should accept valid construction', () => {
    const request = new ReturnRequest({
      id: 'rr-11',
      numeroDevolucion: 'DEV-000011',
      orderId: 'ord-11',
      cantidadTotal: 5,
      estado: 'SOLICITADA',
    });

    expect(request.estado).toBe('SOLICITADA');
    expect(ReturnRequest.getInitialState()).toBe('SOLICITADA');
    expect(ReturnRequest.getEstadosTerminales()).toEqual(['RECHAZADA', 'RESUELTA']);
  });
});
