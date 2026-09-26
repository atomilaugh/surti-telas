import { describe, it, expect, vi } from 'vitest';
import { ReturnItem } from '@/modules/returns/domain/entities/ReturnItem';
import { BadRequestError } from '@/shared/domain/errors';

describe('ReturnItem — Creation and Validation', () => {
  it('should create a ReturnItem with solicitudada status', () => {
    const item = new ReturnItem({
      id: 'ri-1',
      returnRequestId: 'rr-1',
      ref: 'REF-001',
      prenda: 'Camiseta',
      cantidadSolicitada: 5,
      defectoTipo: 'DEFECTO_CONFECCION',
    });

    expect(item.id).toBe('ri-1');
    expect(item.ref).toBe('REF-001');
    expect(item.prenda).toBe('Camiseta');
    expect(item.cantidadSolicitada).toBe(5);
    expect(item.cantidadAprobada).toBeNull();
    expect(item.cantidadRecibida).toBeNull();
    expect(item.cantidadAceptada).toBeNull();
    expect(item.cantidadRechazada).toBeNull();
    expect(item.defectoTipo).toBe('DEFECTO_CONFECCION');
  });

  it('should approve items with cantidadAprobada', () => {
    const item = new ReturnItem({
      id: 'ri-2',
      returnRequestId: 'rr-2',
      ref: 'REF-002',
      prenda: 'Pantalón',
      cantidadSolicitada: 3,
      defectoTipo: 'DESGASTE',
    });

    item.approve(2);

    expect(item.cantidadAprobada).toBe(2);
  });

  it('should throw when approving with cantidad exceeding solicitada', () => {
    const item = new ReturnItem({
      id: 'ri-3',
      returnRequestId: 'rr-3',
      ref: 'REF-003',
      prenda: 'Chaqueta',
      cantidadSolicitada: 2,
      defectoTipo: 'OTRO',
      defectoDescripcion: 'Cierre roto',
    });

    expect(() => item.approve(3)).toThrow(BadRequestError);
  });

  it('should throw when receiving without prior approval', () => {
    const item = new ReturnItem({
      id: 'ri-4',
      returnRequestId: 'rr-4',
      ref: 'REF-004',
      prenda: 'Camisa',
      cantidadSolicitada: 4,
      defectoTipo: 'IMPERFECCION_VISUAL',
    });

    expect(() => item.receive(3)).toThrow(BadRequestError);
  });

  it('should receive items with cantidadRecibida <= cantidadAprobada', () => {
    const item = new ReturnItem({
      id: 'ri-5',
      returnRequestId: 'rr-5',
      ref: 'REF-005',
      prenda: 'Vestido',
      cantidadSolicitada: 4,
      defectoTipo: 'DEFECTO_MATERIAL',
    });

    item.approve(4);
    item.receive(3);

    expect(item.cantidadRecibida).toBe(3);
  });

  it('should throw when receiving exceeds aprobada', () => {
    const item = new ReturnItem({
      id: 'ri-6',
      returnRequestId: 'rr-6',
      ref: 'REF-006',
      prenda: 'Falda',
      cantidadSolicitada: 4,
      defectoTipo: 'ERROR_CANTIDAD',
    });

    item.approve(2);
    expect(() => item.receive(3)).toThrow(BadRequestError);
  });

  it('should inspect items with aceptada and rechazada', () => {
    const item = new ReturnItem({
      id: 'ri-8',
      returnRequestId: 'rr-8',
      ref: 'REF-008',
      prenda: 'Corbata',
      cantidadSolicitada: 10,
      defectoTipo: 'DESGASTE',
    });

    item.approve(10);
    item.receive(8);
    item.inspeccionar(6, 2);

    expect(item.cantidadAceptada).toBe(6);
    expect(item.cantidadRechazada).toBe(2);
  });

  it('should throw if inspeccionar quantities do not sum to received', () => {
    const item = new ReturnItem({
      id: 'ri-9',
      returnRequestId: 'rr-9',
      ref: 'REF-009',
      prenda: 'Bufanda',
      cantidadSolicitada: 10,
      defectoTipo: 'DEFECTO_MATERIAL',
    });

    item.approve(10);
    item.receive(8);
    expect(() => item.inspeccionar(5, 1)).toThrow(BadRequestError);
  });

  it('should throw if inspeccionar without receiving first', () => {
    const item = new ReturnItem({
      id: 'ri-10',
      returnRequestId: 'rr-10',
      ref: 'REF-010',
      prenda: 'Gorra',
      cantidadSolicitada: 10,
      defectoTipo: 'IMPERFECCION_VISUAL',
    });

    item.approve(10);
    expect(() => item.inspeccionar(5, 3)).toThrow(BadRequestError);
  });

  it('should reject negative cantidadSolicitada', () => {
    expect(() =>
      new ReturnItem({
        id: 'ri-11',
        returnRequestId: 'rr-11',
        ref: 'REF-011',
        prenda: 'Calcetas',
        cantidadSolicitada: -1,
        defectoTipo: 'OTRO',
      })
    ).toThrow(BadRequestError);
  });

  it('should reject empty ref', () => {
    expect(() =>
      new ReturnItem({
        id: 'ri-12',
        returnRequestId: 'rr-12',
        ref: '',
        prenda: 'Sombrero',
        cantidadSolicitada: 1,
        defectoTipo: 'DESGASTE',
      })
    ).toThrow(BadRequestError);
  });

  it('should reject empty prenda', () => {
    expect(() =>
      new ReturnItem({
        id: 'ri-13',
        returnRequestId: 'rr-13',
        ref: 'REF-013',
        prenda: '',
        cantidadSolicitada: 1,
        defectoTipo: 'DEFECTO_CONFECCION',
      })
    ).toThrow(BadRequestError);
  });

  it('should reject zero cantidadSolicitada', () => {
    expect(() =>
      new ReturnItem({
        id: 'ri-14',
        returnRequestId: 'rr-14',
        ref: 'REF-014',
        prenda: 'Pulsera',
        cantidadSolicitada: 0,
        defectoTipo: 'DEFECTO_CONFECCION',
      })
    ).toThrow(BadRequestError);
  });

  it('should convert to DTO', () => {
    const item = new ReturnItem({
      id: 'ri-15',
      returnRequestId: 'rr-15',
      ref: 'REF-015',
      prenda: 'Anillo',
      cantidadSolicitada: 2,
      defectoTipo: 'DEFECTO_CONFECCION',
    });

    const dto = item.toDTO();
    expect(dto.id).toBe('ri-15');
    expect(dto.ref).toBe('REF-015');
    expect(dto.cantidadSolicitada).toBe(2);
  });
});
