import React, { useCallback, useMemo, useState } from 'react'
import {
  X,
  Minus,
  Plus,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react'

import './ProductDetailModal.css'

import { sanitizeImageUrl } from '@shared/utils/image-utils'
import { useCart } from '@/app/providers/AppProviders'
import type { Producto } from '@/core/types'
import { resolveColor } from '@/shared/utils/colorUtils'
import { buildColorStockIndex } from '@/shared/utils/colorStock'
import { StockMatrix } from './ProductStockMatrix'
const MIN_QUANTITY = 1

interface VariantSelection {
  id: string
  colorId: string
  sizeId: string
  quantity: number
  _qtyText: string
}

type Props = {
  product: Producto | null
  isOpen: boolean
  onClose: () => void
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export const ProductDetailModal: React.FC<Props> = ({
  product,
  isOpen,
  onClose
}) => {
  const { addToCart } = useCart()

  const productSizes = useMemo(() => {
    if (product?.tallas && product.tallas.length > 0) {
      return product.tallas
    }
    return SIZES
  }, [product?.tallas])

  const productColors = useMemo(() => {
    if (product?.colores && product.colores.length > 0) {
      return product.colores.map((raw) => {
        const resolved = resolveColor(raw);
        return {
          id: raw,
          label: resolved?.label ?? raw,
          hex: resolved?.value ?? '#b5ada1',
        };
      });
    }
    return [
      { id: 'Blanco', label: 'Blanco', hex: '#f9fafb' },
      { id: 'Negro', label: 'Negro', hex: '#111827' },
      { id: 'Beige', label: 'Beige', hex: '#b5ada1' },
      { id: 'Gris', label: 'Gris', hex: '#6b7280' },
      { id: 'Azul', label: 'Azul', hex: '#1e40af' },
      { id: 'Rojo', label: 'Rojo', hex: '#b91c1c' },
    ];
  }, [product?.colores])

  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [editableVariants, setEditableVariants] = useState<VariantSelection[]>([])
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false)
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)

  /** Índice de disponibilidad por variante (color + talla). */
  const colorStock = useMemo(
    () =>
      product
        ? buildColorStockIndex(product)
        : {
            porColor: false,
            variantes: [],
            colores: [],
            tallas: [],
            get: () => 0,
            getVariant: () => 0,
            getSize: () => 0,
            colorAgotado: () => false,
            variantAgotado: () => false,
          },
    [product]
  )

  const stockByColor = useCallback(
    (colorId: string) => colorStock.get(colorId),
    [colorStock]
  )

  /** Unidades de la combinación exacta; sin talla definida cae al total del color. */
  const stockByVariant = useCallback(
    (colorId: string, sizeId?: string) => colorStock.getVariant(colorId, sizeId),
    [colorStock]
  )

  const colorIsOutOfStock = useCallback(
    (colorId: string) => colorStock.porColor && colorStock.get(colorId) <= 0,
    [colorStock]
  )

  const variantIsOutOfStock = useCallback(
    (colorId: string, sizeId: string) =>
      colorStock.porColor && (sizeId ? colorStock.getVariant(colorId, sizeId) : colorStock.get(colorId)) <= 0,
    [colorStock]
  )

  /** Tallas del inventario multivariable, en el orden declarado por el producto. */
  const availableSizes = useMemo(() => {
    if (!colorStock.porColor) return productSizes
    if (colorStock.tallas.length === 0) return productSizes
    const declaradas = productSizes.filter((t) => colorStock.tallas.some((v) => v.toLowerCase() === t.trim().toLowerCase()))
    const restantes = colorStock.tallas.filter((t) => !declaradas.some((d) => d.toLowerCase() === t.toLowerCase()))
    return [...declaradas, ...restantes]
  }, [colorStock, productSizes])

  /** Colores seleccionados que no tienen unidades disponibles. */
  const selectedColorsSinStock = useMemo(
    () => selectedColors.filter((id) => colorIsOutOfStock(id)),
    [selectedColors, colorIsOutOfStock]
  )

  const getColorForVariant = (colorId: string) => productColors.find(c => c.id === colorId)

  const syncVariantsFromColors = (nextColors: string[]) => {
    setEditableVariants(prev => {
      const existingByColor = new Map(prev.map(v => [v.colorId, v]))

      return nextColors.map((colorId) => {
        const available = stockByColor(colorId)
        const maxQty = Math.max(MIN_QUANTITY, available)
        const existing = existingByColor.get(colorId)
        const current = existing ? Math.max(MIN_QUANTITY, existing.quantity || MIN_QUANTITY) : MIN_QUANTITY

        return {
          id: existing?.id ?? `v_${Date.now()}_${crypto.randomUUID()}_${colorId}`,
          colorId,
          sizeId: existing?.sizeId ?? '',
          quantity: Math.min(current, maxQty),
          _qtyText: String(Math.min(current, maxQty)),
        }
      })
    })
  }

  const toggleSelectedColor = (id: string) => {
    setSelectedColors(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(x => x !== id) : [...prev, id]
      syncVariantsFromColors(next)
      return next
    })
  }

  const updateVariantColor = (id: string, colorId: string) => {
    setEditableVariants(prev => {
      const next = prev.map(v => (v.id === id ? { ...v, colorId } : v))
      setSelectedColors(Array.from(new Set(next.filter(v => v.colorId).map(v => v.colorId))))
      return next
    })
  }

  const addVariant = () => {
    setEditableVariants(prev => [
      ...prev,
      {
        id: `v_${Date.now()}_${crypto.randomUUID()}`,
        colorId: '',
        sizeId: '',
        quantity: MIN_QUANTITY,
        _qtyText: String(MIN_QUANTITY),
      }
    ])
  }

  const removeVariant = (id: string) => {
    const variant = editableVariants.find(v => v.id === id)
    if (!variant) return

    setSelectedColors(prev => {
      const next = prev.filter(color => color !== variant.colorId)
      syncVariantsFromColors(next)
      return next
    })
  }

  const updateVariantSize = (id: string, sizeId: string) => {
    setEditableVariants(prev => prev.map(v => (v.id === id ? { ...v, sizeId } : v)))
  }

  const updateVariantQuantity = (id: string, delta: number) => {
    setEditableVariants(prev =>
      prev.map(v => {
        if (v.id !== id) return v
        const max = stockByVariant(v.colorId, v.sizeId)
        const next = Math.max(MIN_QUANTITY, Math.min(max, v.quantity + delta))
        return { ...v, quantity: next, _qtyText: String(next) }
      })
    )
  }

  const setVariantQuantityInput = (id: string, value: string) => {
    setEditableVariants(prev => prev.map(v => (v.id === id ? { ...v, _qtyText: value } : v)))
  }

  const handleVariantBlur = (id: string) => {
    setEditableVariants(prev =>
      prev.map(v => {
        if (v.id !== id) return v
        const parsed = Number(v._qtyText)
        const max = stockByVariant(v.colorId, v.sizeId)
        const clamped = Number.isNaN(parsed) || !Number.isFinite(parsed)
          ? v.quantity
          : Math.min(Math.max(parsed, MIN_QUANTITY), Math.max(MIN_QUANTITY, max))
        return { ...v, quantity: clamped, _qtyText: String(clamped) }
      })
    )
  }

  const resolvedVariants = useMemo(() => {
    return editableVariants.filter(
      v => v.colorId && v.sizeId && v.quantity >= MIN_QUANTITY && !variantIsOutOfStock(v.colorId, v.sizeId)
    )
  }, [editableVariants, variantIsOutOfStock])

  const totalUnits = useMemo(() => {
    return resolvedVariants.reduce((sum, v) => sum + v.quantity, 0)
  }, [resolvedVariants])

  const totalPrice = useMemo(() => {
    if (!product) return 0
    return product.precio * totalUnits
  }, [product, totalUnits])

  const canAddToCart = resolvedVariants.length > 0

  const handleClose = () => {
    setSelectedColors([])
    setEditableVariants([])
    setIsWishlisted(false)
    setCurrentImageIndex(0)
    onClose()
  }

  const handleAddToCart = () => {
    if (!product || resolvedVariants.length === 0) return

    const imagen =
      product.imagenPrincipal && product.imagenPrincipal.trim() !== ''
        ? product.imagenPrincipal
        : product.imagenes && product.imagenes.length > 0
          ? product.imagenes[0]
          : '/assets/images/placeholders/product.svg'

    resolvedVariants.forEach(variant => {
      const color = getColorForVariant(variant.colorId)
      addToCart({
        productId: product.id,
        cartId: `${product.id}-${variant.sizeId}-${variant.colorId}`,
        nombre: product.nombre,
        precio: product.precio,
        imagen,
        categoria: product.categoria ?? 'Premium',
        talla: variant.sizeId,
        color: color?.label ?? variant.colorId,
        stock: stockByVariant(variant.colorId, variant.sizeId),
        referencia: product.codigo || product.ref,
        quantity: variant.quantity,
      })
    })

    handleClose()
  }

  const nextImage = () => {
    setCurrentImageIndex(prev =>
      prev === productImages.length - 1
        ? 0
        : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex(prev =>
      prev === 0
        ? productImages.length - 1
        : prev - 1
    )
  }

  const productImages = useMemo(() => {
    const rawPrincipal = product?.imagenPrincipal
    const rawList = product?.imagenes
    const principal = rawPrincipal && rawPrincipal.trim() !== '' ? rawPrincipal : ''
    const list = Array.isArray(rawList) ? rawList : []

    if (list.length > 0) {
      return list.map(imagen => sanitizeImageUrl(imagen))
    }

    const imagen = principal ? sanitizeImageUrl(principal) : '/assets/images/placeholders/product.svg'
    return [imagen, imagen, imagen]
  }, [product?.imagenes, product?.imagenPrincipal])

  if (!isOpen || !product) return null

  return (
    <>
      {/* OVERLAY */}
      <div
        className="pd-overlay-premium"
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClose(); } }}
        tabIndex={0}
        role="button"
        aria-label="Cerrar modal"
      />

      {/* MODAL */}
      <div className="pd-modal-premium">
        <div
          className="pd-modal-content"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* CLOSE */}
          <button
            className="pd-close-premium"
            onClick={handleClose}
          >
            <X size={18} />
          </button>

          <div className="pd-layout-premium">

            {/* LEFT */}
            <div className="pd-image-column">

              <div className="pd-floating-badge">
                NUEVO
              </div>

              <div className="pd-image-controls">

                <button
                  className={`pd-icon-btn ${
                    isWishlisted
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setIsWishlisted(!isWishlisted)
                  }
                >
                  <Heart
                    size={18}
                    fill={
                      isWishlisted
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                </button>

                <button className="pd-icon-btn">
                  <Share2 size={18} />
                </button>

              </div>

              <button
                className="pd-nav-btn pd-nav-left"
                onClick={prevImage}
              >
                <ChevronLeft size={20} />
              </button>

              <button
                className="pd-nav-btn pd-nav-right"
                onClick={nextImage}
              >
                <ChevronRight size={20} />
              </button>

              <div className="pd-image-showcase">

                <img
                  src={
                    productImages[currentImageIndex]
                  }
                  alt={product.nombre}
                  className="pd-image-main"
                  onError={(e) => {
                    const target =
                      e.currentTarget

                    target.src =
                      '/assets/images/placeholders/product.svg'
                  }}
                />

              </div>

              <div className="pd-image-gallery">

                {productImages.map(
                  (image, index) => (
                    <button
                      key={index}
                      className={`pd-gallery-thumb ${
                        currentImageIndex ===
                        index
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        setCurrentImageIndex(index)
                      }
                    >
                      <img
                        src={image}
                        alt={`${product.nombre}-${index}`}
                      />
                    </button>
                  )
                )}

              </div>

            </div>

            {/* RIGHT */}
            <div className="pd-info-column">

              <div className="pd-info-scroll">

                {/* TOP */}
                <div className="pd-top-section">

                  <div className="pd-category-badge">
                    {product.categoria ||
                      'Premium'}
                  </div>

                  <h1 className="pd-title-premium">
                    {product.nombre}
                  </h1>

                  {/* DESCRIPTION */}
                  {(product.descripcion || product.descripcionCorta) && (
                    <div className="pd-description-premium">
                      {product.descripcionCorta && (
                        <p className="pd-short-description">{product.descripcionCorta}</p>
                      )}
                      {product.descripcion && product.descripcionCorta !== product.descripcion && (
                        <p>{product.descripcion}</p>
                      )}
                    </div>
                  )}

                  {/* PRICE */}
                  <div className="pd-price-section">

                    <div className="pd-price-main">

                      <span className="pd-price-current">
                        $
                        {product.precio.toLocaleString()}
                      </span>

                      {product.precio > 100 && (
                        <span className="pd-price-original">
                          $
                          {(
                            product.precio * 1.2
                          ).toLocaleString()}
                        </span>
                      )}

                    </div>

                    {product.precio > 100 && (
                      <div className="pd-discount-pill">
                        20% OFF
                      </div>
                    )}

                  </div>

                </div>

                 {/* COLORS */}
                <div className="pd-selector-section">

                  <div className="pd-section-title-row">
                    <h3>Color</h3>
                    <span>{selectedColors.map(id => {
                      const c = productColors.find(pc => pc.id === id)
                      return c?.label ?? id
                    }).join(', ') || '—'}</span>
                  </div>

                  <div className="pd-color-selector">

                    {productColors.map((color) => {
                      const active = selectedColors.includes(color.id)
                      const available = stockByColor(color.id)
                      const agotado = colorIsOutOfStock(color.id)
                      return (
                        <button
                          key={color.id}
                          className={`pd-color-option ${active ? 'active' : ''} ${agotado ? 'pd-color-option-agotado' : ''}`}
                          onClick={() => toggleSelectedColor(color.id)}
                          type="button"
                          aria-pressed={active}
                          title={colorStock.porColor
                            ? `${color.label}: ${agotado ? 'agotado' : `${available} disponibles`}`
                            : color.label}
                        >
                          <div className="pd-color-swatch" style={{ backgroundColor: color.hex }} />
                          {colorStock.porColor && (
                            <span className="pd-color-stock">
                              {agotado ? 'Agotado' : available}
                            </span>
                          )}
                        </button>
                      )
                    })}

                  </div>

                  {colorStock.porColor && (
                    <StockMatrix
                      colores={colorStock.colores.length > 0 ? colorStock.colores : productColors.map(c => c.id)}
                      tallas={availableSizes}
                      getStock={stockByVariant}
                      tieneTalla={colorStock.variantes.some(v => Boolean((v.size ?? '').trim()))}
                      selected={selectedColors}
                      onSelect={toggleSelectedColor}
                    />
                  )}

                  {selectedColorsSinStock.length > 0 && (
                    <div className="pd-stock-alert" role="alert">
                      <AlertTriangle size={15} aria-hidden="true" />
                      <span>
                        No hay stock disponible para{' '}
                        <strong>
                          {selectedColorsSinStock
                            .map(id => productColors.find(pc => pc.id === id)?.label ?? id)
                            .join(', ')}
                        </strong>
                        . Elige otro color para continuar.
                      </span>
                    </div>
                  )}

                </div>

                {/* VARIANTS */}
                <div className="pd-selector-section">

                  <div className="pd-section-title-row">
                    <h3>VARIANTES DEL PRODUCTO</h3>
                    {editableVariants.length > 0 && (
                      <span>{editableVariants.length} variante{editableVariants.length > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {editableVariants.length > 0 && (
                    <div className="pd-variantes-headers">
                      <span className="pd-vt-col-header">COLOR</span>
                      <span className="pd-vt-col-header">TALLA</span>
                      <span className="pd-vt-col-header">CANTIDAD</span>
                    </div>
                  )}

                  <div className="pd-variantes-list">

                    {editableVariants.map((variant) => {
                      const color = getColorForVariant(variant.colorId)
                      return (
                        <div key={variant.id} className="pd-variante-row">

                          <div className="pd-variante-color-wrapper">
                            <span
                              className="pd-variante-color-dot"
                              style={{ backgroundColor: color?.hex ?? '#e5e7eb' }}
                              aria-hidden="true"
                            />
                            <select
                              className="pd-variante-color-select"
                              value={variant.colorId}
                              onChange={(e) => updateVariantColor(variant.id, e.target.value)}
                              aria-label="Seleccionar color de la variante"
                            >
                              <option value="">Seleccionar color</option>
                              {productColors.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <select
                            className="pd-variante-select-small"
                            value={variant.sizeId}
                            onChange={(e) => updateVariantSize(variant.id, e.target.value)}
                            disabled={!variant.colorId}
                          >
                            <option value="">Seleccionar talla</option>
                            {availableSizes.map(s => (
                              <option key={s} value={s}>
                                {s}
                                {colorStock.porColor
                                  ? ` — ${stockByVariant(variant.colorId, s)} disp.`
                                  : ''}
                              </option>
                            ))}
                          </select>

                          <div className="pd-variante-quantity-row">
                            <button
                              className="pd-quantity-btn"
                              onClick={() => updateVariantQuantity(variant.id, -1)}
                              type="button"
                              disabled={variant.quantity <= MIN_QUANTITY}
                              aria-label="Disminuir cantidad"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="text"
                              className="pd-variante-quantity-input"
                              value={variant._qtyText}
                              onChange={(e) => setVariantQuantityInput(variant.id, e.target.value)}
                              onBlur={() => handleVariantBlur(variant.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                              aria-label="Cantidad"
                            />
                            <button
                              className="pd-quantity-btn"
                              onClick={() => updateVariantQuantity(variant.id, 1)}
                              type="button"
                              disabled={variant.quantity >= stockByVariant(variant.colorId, variant.sizeId)}
                              aria-label="Aumentar cantidad"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {colorStock.porColor && (
                            <span className="pd-variante-stock">
                              {variant.sizeId
                                ? `${stockByVariant(variant.colorId, variant.sizeId)} disp.`
                                : `${stockByColor(variant.colorId)} disp.`}
                            </span>
                          )}

                          {variantIsOutOfStock(variant.colorId, variant.sizeId) && (
                            <span className="pd-variante-out">Sin stock</span>
                          )}

                          <button
                            className="pd-variante-remove"
                            onClick={() => removeVariant(variant.id)}
                            type="button"
                            aria-label="Eliminar variante"
                            title="Eliminar variante"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}

                    {editableVariants.length === 0 && (
                      <div className="pd-variantes-empty">
                        <span>No hay variantes seleccionadas.</span>
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    className="pd-variante-add-btn"
                    onClick={addVariant}
                  >
                    + Agregar variante
                  </button>

                </div>

                {/* SUMMARY */}
                {resolvedVariants.length > 0 && (
                  <div className="pd-summary-section">
                    <div className="pd-section-title-row">
                      <h3>RESUMEN</h3>
                    </div>

                    <div className="pd-summary-list">
                      {resolvedVariants.map(v => {
                        const color = getColorForVariant(v.colorId)
                        const lineTotal = product.precio * v.quantity
                        return (
                          <div key={v.id} className="pd-summary-row">
                            <span className="pd-summary-label">
                              {color?.label ?? v.colorId} · {v.sizeId} × {v.quantity}
                            </span>
                            <span className="pd-summary-value">
                              ${lineTotal.toLocaleString()}
                            </span>
                        </div>
                        )
                      })}
                    </div>

                    <div className="pd-summary-divider"></div>

                    <div className="pd-summary-totals">
                      <div className="pd-summary-total-row">
                        <span>Total unidades</span>
                        <strong>{totalUnits}</strong>
                      </div>
                      <div className="pd-summary-total-row">
                        <span>Total</span>
                        <strong>${totalPrice.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                )}

                 {/* EXTRA INFO */}
                 {product && (
                    <div className="pd-selector-section">
                      <div className="pd-section-title-row">
                        <h3>Detalle del producto</h3>
                      </div>
                      <div className="pd-meta-grid">
                        <div className="pd-meta-item">
                          <span className="pd-meta-label">Código</span>
                          <span className="pd-meta-value">{product.codigo || product.ref}</span>
                        </div>
                        {product.marca && (
                          <div className="pd-meta-item">
                            <span className="pd-meta-label">Marca</span>
                            <span className="pd-meta-value">{product.marca}</span>
                          </div>
                        )}
                        {product.tela && (
                          <div className="pd-meta-item">
                            <span className="pd-meta-label">Tela</span>
                            <span className="pd-meta-value">{product.tela}</span>
                          </div>
                        )}
                        <div className="pd-meta-item">
                          <span className="pd-meta-label">Stock general</span>
                          <span className="pd-meta-value">{product.cantidadStock} uds</span>
                        </div>
                        {colorStock.porColor && (
                          <div className="pd-meta-item">
                            <span className="pd-meta-label">Stock por color y talla</span>
                            <span className="pd-meta-value">
                              {colorStock.variantes
                                .map(v => `${v.color}${(v.size ?? '').trim() !== '' ? `/${v.size}` : ''}: ${v.cantidad}`)
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                        <div className="pd-meta-item">
                          <span className="pd-meta-label">Estado</span>
                          <span className="pd-meta-value">{product.estado || 'Activo'}</span>
                        </div>
                        {product.descuento ? (
                          <div className="pd-meta-item">
                            <span className="pd-meta-label">Descuento</span>
                            <span className="pd-meta-value">{product.descuento}%</span>
                          </div>
                        ) : null}
                        {product.precioAnterior ? (
                          <div className="pd-meta-item">
                            <span className="pd-meta-label">Precio anterior</span>
                            <span className="pd-meta-value">${product.precioAnterior.toLocaleString()}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

              </div>

              {/* PURCHASE */}
              <div className="pd-bottom-purchase">

                <div className="pd-purchase-top">

                  <div className="pd-total-premium">

                    <span>Total</span>

                    <strong>
                      $
                      {Number.isFinite(totalPrice) ? totalPrice.toLocaleString() : '0'}
                    </strong>

                  </div>

                </div>

                <button
                  className="pd-add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                >

                  <span className="pd-add-cart-icon">
                    <ShoppingBag size={18} />
                  </span>

                  Añadir al carrito

                </button>

                <div className="pd-bottom-meta">
                  Envío gratis en pedidos superiores a $200.000
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  )
}
