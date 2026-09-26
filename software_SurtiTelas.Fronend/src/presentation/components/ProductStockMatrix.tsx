import React from 'react';

import { resolveColor } from '@/shared/utils/colorUtils';

type Props = {
  /** Colores del producto con inventario desglosado. */
  colores: string[];
  /** Tallas del inventario; si está vacía se muestra una columna "General". */
  tallas: string[];
  /** Unidades disponibles de la combinación color + talla. */
  getStock: (color: string, size?: string) => number;
  /** `true` cuando al menos una variante tiene talla propia. */
  tieneTalla: boolean;
  selected: string[];
  onSelect: (color: string) => void;
};

/**
 * Tabla de inventario por talla y color: cada celda muestra las unidades de
 * esa combinación y el total por color, replicando el desglose guardado en el
 * catálogo.
 */
export const StockMatrix: React.FC<Props> = ({ colores, tallas, getStock, tieneTalla, selected, onSelect }) => {
  const columnas = tieneTalla && tallas.length > 0 ? tallas : [];

  return (
    <div className="pd-stock-matrix-wrap">
      <div className="pd-stock-matrix-title">
        Stock por talla y color
        <span>Unidades disponibles por combinación</span>
      </div>
      <div className="pd-stock-matrix-scroll">
        <table className="pd-stock-matrix">
          <thead>
            <tr>
              <th scope="col">Color</th>
              {columnas.map((talla) => (
                <th key={talla} scope="col" className="is-size">
                  {talla}
                </th>
              ))}
              <th scope="col" className="is-total">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {colores.map((color) => {
              const activo = selected.includes(color);
              const total = columnas.length > 0
                ? columnas.reduce((sum, talla) => sum + getStock(color, talla), 0)
                : getStock(color);
              return (
                <tr key={color} className={activo ? 'is-selected' : ''}>
                  <th scope="row">
                    <button type="button" onClick={() => onSelect(color)} className="pd-matrix-color">
                      <span
                        className="pd-matrix-dot"
                        style={{ backgroundColor: resolveColor(color)?.value ?? '#b5ada1' }}
                        aria-hidden="true"
                      />
                      {resolveColor(color)?.label ?? color}
                    </button>
                  </th>
                  {columnas.map((talla) => {
                    const stock = getStock(color, talla);
                    return (
                      <td
                        key={talla}
                        className={`is-size ${stock <= 0 ? 'is-out' : stock < 5 ? 'is-low' : ''}`}
                      >
                        {stock > 0 ? stock : '—'}
                      </td>
                    );
                  })}
                  <td className={`is-total ${total <= 0 ? 'is-out' : ''}`}>{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
