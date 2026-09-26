import { describe, it, expect } from 'vitest';
import {
  Product,
  colorsFromVariants,
  computeStockStatus,
  sizesFromVariants,
  sumColorStock,
  variantKey,
} from '@/modules/catalog/domain/entities/Product';

describe('Product', () => {
  it('should create a valid product', () => {
    const product = new Product({
      ref: 'REF-001',
      nombre: 'Camiseta básica',
      categoria: 'Camisetas',
      precio: 25000,
      cantidadStock: 120,
      stock: 'OK',
      publicado: true,
      tela: 'Algodón',
      colores: ['Blanco', 'Negro'],
      tallas: ['S', 'M', 'L'],
      imagenes: [],
    });

    expect(product.ref).toBe('REF-001');
    expect(product.nombre).toBe('Camiseta básica');
    expect(product.precio).toBe(25000);
    expect(product.cantidadStock).toBe(120);
    expect(product.publicado).toBe(true);
  });

  it('should throw error if ref is empty', () => {
    expect(() => {
      new Product({
        ref: '',
        nombre: 'Test',
        categoria: 'Test',
        precio: 1000,
        cantidadStock: 10,
        stock: 'OK',
        publicado: false,
        tela: 'Test',
        colores: ['Rojo'],
        tallas: ['M'],
        imagenes: [],
      });
    }).toThrow('El producto debe tener una referencia');
  });

  it('should throw error if nombre is empty', () => {
    expect(() => {
      new Product({
        ref: 'REF-001',
        nombre: '',
        categoria: 'Test',
        precio: 1000,
        cantidadStock: 10,
        stock: 'OK',
        publicado: false,
        tela: 'Test',
        colores: ['Rojo'],
        tallas: ['M'],
        imagenes: [],
      });
    }).toThrow('El producto debe tener un nombre');
  });

  it('should publish product when valid', () => {
    const product = new Product({
      ref: 'REF-001',
      nombre: 'Camiseta básica',
      categoria: 'Camisetas',
      precio: 25000,
      cantidadStock: 120,
      stock: 'OK',
      publicado: false,
      imagenPrincipal: 'image.jpg',
      tela: 'Algodón',
      colores: ['Blanco'],
      tallas: ['M'],
      imagenes: [],
    });

    const published = product.publish();
    expect(published.publicado).toBe(true);
    expect(published.estado).toBe('Activo');
  });

  it('should unpublish product', () => {
    const product = new Product({
      ref: 'REF-001',
      nombre: 'Camiseta básica',
      categoria: 'Camisetas',
      precio: 25000,
      cantidadStock: 120,
      stock: 'OK',
      publicado: true,
      tela: 'Algodón',
      colores: ['Blanco'],
      tallas: ['M'],
      imagenes: [],
    });

    const unpublished = product.unpublish();
    expect(unpublished.publicado).toBe(false);
    expect(unpublished.estado).toBe('Inactivo');
  });

  it('should be available when published and not out of stock', () => {
    const product = new Product({
      ref: 'REF-001',
      nombre: 'Camiseta básica',
      categoria: 'Camisetas',
      precio: 25000,
      cantidadStock: 120,
      stock: 'OK',
      publicado: true,
      tela: 'Algodón',
      colores: ['Blanco'],
      tallas: ['M'],
      imagenes: [],
    });

    expect(product.isAvailable()).toBe(true);
  });
});

describe('computeStockStatus', () => {
  it('should return Agotado when stock is 0', () => {
    expect(computeStockStatus(0)).toBe('Agotado');
  });

  it('should return Bajo stock when stock is below 10', () => {
    expect(computeStockStatus(5)).toBe('Bajo stock');
  });

  it('should return OK when stock is 10 or more', () => {
    expect(computeStockStatus(10)).toBe('OK');
    expect(computeStockStatus(100)).toBe('OK');
  });
});

describe('Product stock por color', () => {
  const base = {
    ref: 'REF-002',
    nombre: 'Camiseta de algodón',
    categoria: 'Camisetas',
    precio: 25000,
    cantidadStock: 41,
    stock: 'OK' as const,
    publicado: true,
    tela: 'Algodón',
    tallas: ['M'],
    imagenes: [],
  };

  it('normaliza las variantes y deriva la lista de colores', () => {
    const product = new Product({
      ...base,
      colores: ['Azul', 'Gris', 'Rojo'],
      stockPorColor: [
        { color: ' Azul ', cantidad: 11 },
        { color: 'Gris', cantidad: 20 },
        { color: 'Rojo', cantidad: 10 },
      ],
    });

    expect(product.colores).toEqual(['Azul', 'Gris', 'Rojo']);
    expect(product.stockPorColor.map((v) => v.cantidad)).toEqual([11, 20, 10]);
    expect(sumColorStock(product.stockPorColor)).toBe(41);
  });

  it('suma duplicados de color ignorando mayusculas', () => {
    const product = new Product({
      ...base,
      colores: ['Azul', 'azul'],
      stockPorColor: [
        { color: 'Azul', cantidad: 5 },
        { color: 'azul', cantidad: 3 },
      ],
    });

    expect(product.colores).toEqual(['Azul']);
    expect(product.stockPorColor).toHaveLength(1);
    expect(product.stockPorColor[0].cantidad).toBe(8);
  });

  it('deriva variantes en cero cuando solo se envian colores', () => {
    const product = new Product({ ...base, colores: ['Azul', 'Gris'] });

    expect(product.stockPorColor.map((v) => v.cantidad)).toEqual([0, 0]);
    expect(product.stockPorColor[1].stock).toBe('Agotado');
  });

  it('rechaza cantidades negativas por color', () => {
    expect(
      () =>
        new Product({
          ...base,
          colores: ['Azul'],
          stockPorColor: [{ color: 'Azul', cantidad: -1 }],
        })
    ).toThrow('La cantidad en stock del color "Azul" no puede ser negativa');
  });

  it('rechaza cantidades negativas en una variante con talla', () => {
    expect(
      () =>
        new Product({
          ...base,
          colores: ['Azul'],
          tallas: ['S', 'M'],
          stockPorColor: [{ color: 'Azul', size: 'M', cantidad: -2 }],
        })
    ).toThrow('La cantidad en stock de la variante Azul/M no puede ser negativa');
  });

  it('mantiene el inventario por combinacion color + talla', () => {
    const product = new Product({
      ...base,
      colores: ['Azul', 'Rojo'],
      tallas: ['S', 'M', 'L'],
      stockPorColor: [
        { color: 'Azul', size: 'S', cantidad: 5 },
        { color: 'Azul', size: 'M', cantidad: 5 },
        { color: 'Rojo', size: 'S', cantidad: 5 },
        { color: 'Rojo', size: 'L', cantidad: 5 },
      ],
    });

    expect(product.stockPorColor).toHaveLength(4);
    expect(product.stockPorColor.map((v) => `${v.color}/${v.size}`)).toEqual([
      'Azul/S',
      'Azul/M',
      'Rojo/S',
      'Rojo/L',
    ]);
    expect(sumColorStock(product.stockPorColor)).toBe(20);
    expect(colorsFromVariants(product.stockPorColor)).toEqual(['Azul', 'Rojo']);
    expect(sizesFromVariants(product.stockPorColor)).toEqual(['S', 'M', 'L']);
    expect(product.tallas).toEqual(['S', 'M', 'L']);
  });

  it('suma duplicados de la misma combinacion ignorando mayusculas', () => {
    const product = new Product({
      ...base,
      colores: ['Azul'],
      tallas: ['S'],
      stockPorColor: [
        { color: 'Azul', size: 's', cantidad: 4 },
        { color: 'azul', size: 'S', cantidad: 6 },
        { color: 'Azul', size: 'M', cantidad: 7 },
      ],
    });

    expect(product.stockPorColor).toHaveLength(2);
    expect(product.stockPorColor.find((v) => (v.size ?? '').toLowerCase() === 's')?.cantidad).toBe(10);
    expect(sumColorStock(product.stockPorColor)).toBe(17);
  });

  it('acepta las tallas declaradas en las variantes cuando no se envian por separado', () => {
    const product = new Product({
      ...base,
      colores: ['Azul'],
      tallas: [],
      stockPorColor: [{ color: 'Azul', size: 'L', cantidad: 3 }],
    });

    expect(product.tallas).toEqual(['L']);
  });

  it('recalcula el estado del color al editar una variante', () => {
    const product = new Product({ ...base, colores: ['Azul'], stockPorColor: [{ color: 'Azul', cantidad: 40 }] });
    const actualizado = product.withChanges({ stockPorColor: [{ color: 'Azul', cantidad: 3 }] });

    expect(actualizado.stockPorColor[0].cantidad).toBe(3);
    expect(actualizado.stockPorColor[0].stock).toBe('Bajo stock');
  });

  it('genera la misma clave de variante para color y talla equivalentes', () => {
    expect(variantKey(' Azul ', 's')).toBe(variantKey('azul', 'S'));
    expect(variantKey('Azul', 'S')).not.toBe(variantKey('Azul', 'M'));
    expect(variantKey('Azul')).toBe(variantKey('azul', ''));
  });
});
