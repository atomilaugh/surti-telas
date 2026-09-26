import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import s from './ColorStockEditor.module.css';
import { getColorSwatchStyle, resolveColor } from '@/shared/utils/colorUtils';
import { createColorRow, totalStockFromRows, variantLabel } from '@/shared/utils/colorStock';
import type { ColorStockRow } from '@/shared/utils/colorStock';

interface ColorStockEditorProps {
  rows: ColorStockRow[];
  onChange: (rows: ColorStockRow[]) => void;
  /** Colores ya usados en el catálogo, ofrecidos como sugerencias. */
  sugerencias?: string[];
  /** Tallas declaradas en el producto, ofrecidas como sugerencias. */
  tallasSugeridas?: string[];
  disabled?: boolean;
}

/**
 * Editor de inventario multivariable: una fila por combinación color + talla
 * con su propio stock y el total del producto calculado en vivo como la suma
 * de todas las variantes.
 */
export const ColorStockEditor: React.FC<ColorStockEditorProps> = ({
  rows,
  onChange,
  sugerencias = [],
  tallasSugeridas = [],
  disabled = false,
}) => {
  const datalistId = 'color-stock-suggestions';
  const sizeListId = 'variant-size-suggestions';
  const total = useMemo(() => totalStockFromRows(rows), [rows]);

  const updateRow = (key: string, patch: Partial<ColorStockRow>) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = (color = '', size = '', cantidad: number | string = '') => {
    onChange([...rows, createColorRow(color, size, cantidad)]);
  };

  const removeRow = (key: string) => {
    onChange(rows.filter((row) => row.key !== key));
  };

  const sugerenciasRestantes = useMemo(() => {
    const usados = new Set(rows.map((row) => row.color.trim().toLowerCase()).filter(Boolean));
    return sugerencias.filter((color) => !usados.has(color.toLowerCase())).slice(0, 6);
  }, [rows, sugerencias]);

  const tallasRestantes = useMemo(() => {
    const usadas = new Set(rows.map((row) => row.size.trim().toLowerCase()).filter(Boolean));
    return tallasSugeridas.filter((talla) => !usadas.has(talla.toLowerCase()));
  }, [rows, tallasSugeridas]);

  return (
    <div className={s.editor}>
      <div className={s.header}>
        <span className={s.label}>Variantes de color y talla *</span>
        <span className={s.total}>
          Stock general
          <strong className={s.totalValue}>{total}</strong>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className={s.empty}>Aún no hay variantes. Añade la primera con su cantidad en bodega.</p>
      ) : (
        <div className={s.rows}>
          {rows.map((row, index) => {
            const swatchStyle = getColorSwatchStyle(row.color);
            return (
              <div key={row.key} className={s.row}>
                <span
                  className={s.swatch}
                  style={resolveColor(row.color) ? swatchStyle : undefined}
                  title={row.color.trim() || 'Sin color'}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  className={`${s.input} ${s.colorInput}`}
                  list={datalistId}
                  value={row.color}
                  disabled={disabled}
                  placeholder="Ej: Azul"
                  aria-label={`Color de la variante ${index + 1}`}
                  onChange={(e) => updateRow(row.key, { color: e.target.value })}
                />
                <input
                  type="text"
                  className={`${s.input} ${s.sizeInput}`}
                  list={sizeListId}
                  value={row.size}
                  disabled={disabled}
                  placeholder="Talla"
                  aria-label={`Talla de la variante ${index + 1}`}
                  onChange={(e) => updateRow(row.key, { size: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={`${s.input} ${s.stockInput}`}
                  value={row.cantidad}
                  disabled={disabled}
                  placeholder="0"
                  aria-label={`Stock de ${variantLabel(row.color.trim() || 'la variante', row.size) || 'la variante'}`}
                  onChange={(e) => updateRow(row.key, { cantidad: e.target.value })}
                />
                <button
                  type="button"
                  className={s.removeBtn}
                  onClick={() => removeRow(row.key)}
                  disabled={disabled || rows.length === 1}
                  title={rows.length === 1 ? 'El producto debe tener al menos una variante' : `Quitar ${variantLabel(row.color.trim() || 'fila', row.size)}`}
                  aria-label={`Quitar variante ${variantLabel(row.color.trim() || 'sin definir', row.size)}`}
                >
                  <Trash2 size={14} aria-hidden="true" focusable="false" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <datalist id={datalistId}>
        {sugerenciasRestantes.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>

      <datalist id={sizeListId}>
        {tallasSugeridas.map((talla) => (
          <option key={talla} value={talla} />
        ))}
      </datalist>

      <div className={s.summary}>
        {rows.length > 0 ? (
          <div className={s.breakdown}>
            {rows
              .filter((row) => row.color.trim() !== '')
              .map((row) => (
                <span key={row.key} className={s.chip}>
                  {variantLabel(row.color.trim(), row.size)}
                  <span className={s.chipValue}>{Number.parseInt(row.cantidad, 10) || 0}</span>
                </span>
              ))}
          </div>
        ) : (
          <span>Sin variantes definidas</span>
        )}
        <button type="button" className={s.addBtn} onClick={() => addRow()} disabled={disabled}>
          <Plus size={14} aria-hidden="true" focusable="false" />
          Añadir variante
        </button>
      </div>

      {(sugerenciasRestantes.length > 0 || tallasRestantes.length > 0) && (
        <div className={s.breakdown}>
          {tallasRestantes.slice(0, 6).map((talla) => {
            const ultimoColor = [...rows].reverse().find((row) => row.color.trim() !== '');
            return (
              <button
                key={`talla-${talla}`}
                type="button"
                className={s.chip}
                onClick={() => addRow(ultimoColor?.color ?? '', talla, 0)}
                disabled={disabled}
                style={{ cursor: 'pointer', border: 'none' }}
                title={`Añadir variante con talla ${talla}`}
              >
                <Plus size={11} aria-hidden="true" focusable="false" /> {talla}
              </button>
            );
          })}
          {sugerenciasRestantes.map((color) => (
            <button
              key={`color-${color}`}
              type="button"
              className={s.chip}
              onClick={() => addRow(color, '', 0)}
              disabled={disabled}
              style={{ cursor: 'pointer', border: 'none' }}
              title={`Añadir variante del color ${color}`}
            >
              <Plus size={11} aria-hidden="true" focusable="false" /> {color}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
