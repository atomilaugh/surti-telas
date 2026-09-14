import React, { useMemo, useState } from 'react'
import {
  X,
  Minus,
  Plus,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from 'lucide-react'

import './ProductDetailModal.css'

import { sanitizeImageUrl } from '@shared/utils/image-utils'
import { useCart } from '@/app/providers/AppProviders'
import type { Producto } from '@/core/types'
import { resolveColor } from '@/shared/utils/colorUtils'
import { toast } from 'sonner'

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

  const stock = product?.cantidadStock ?? 0

  const toggleSelectedColor = (id: string) => {
    setSelectedColors(prev => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter(x => x !== id) : [...prev, id]
      return next
    })
  }

  const addVariant = () => {
    const newVariant: VariantSelection = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      colorId: '',
      sizeId: '',
      quantity: MIN_QUANTITY,
      _qtyText: String(MIN_QUANTITY),
    }
    setEditableVariants(prev => [...prev, newVariant])
  }

  const removeVariant = (id: string) => {
    setEditableVariants(prev => prev.filter(v => v.id !== id))
  }

  const getColorForVariant = (colorId: string) => productColors.find(c => c.id === colorId)

  const mergeWithDuplicate = (variantId: string, newColorId: string, newSizeId: string) => {
    if (!newColorId || !newSizeId) return false

    setEditableVariants(prev => {
      const target = prev.find(v => v.id === variantId)
      if (!target) return prev

      const dup = prev.find(v => v.id !== variantId && v.colorId === newColorId && v.sizeId === newSizeId)
      if (!dup) return prev

      toast.warning('Ya existe una variante con este color y talla. Se sumarán las cantidades.')

      return prev
        .map(v =>
          v.id === dup.id
            ? { ...v, quantity: v.quantity + target.quantity, _qtyText: String(v.quantity + target.quantity) }
            : v
        )
        .filter(v => v.id !== target.id)
    })

    return true
  }

  const updateVariantColor = (id: string, colorId: string) => {
    if (mergeWithDuplicate(id, colorId, '')) {
      setEditableVariants(prev => prev.map(v => (v.id === id ? { ...v, colorId: '', sizeId: '', quantity: MIN_QUANTITY, _qtyText: String(MIN_QUANTITY) } : v)))
      return
    }

    setEditableVariants(prev => prev.map(v => (v.id === id ? { ...v, colorId } : v)))
  }

  const updateVariantSize = (id: string, sizeId: string) => {
    setEditableVariants(prev => {
      const target = prev.find(v => v.id === id)
      if (!target) return prev

      if (target.colorId && sizeId && prev.some(v => v.id !== id && v.colorId === target.colorId && v.sizeId === sizeId)) {
        toast.warning('Ya existe una variante con este color y talla. Se sumarán las cantidades.')
        return prev
          .map(v =>
            v.id !== id && v.colorId === target.colorId && v.sizeId === sizeId
              ? { ...v, quantity: v.quantity + target.quantity, _qtyText: String(v.quantity + target.quantity) }
              : v
          )
          .filter(v => v.id !== id)
      }

      return prev.map(v => (v.id === id ? { ...v, sizeId } : v))
    })
  }

  const updateVariantQuantity = (id: string, delta: number) => {
    setEditableVariants(prev =>
      prev.map(v => {
        if (v.id !== id) return v
        const next = Math.max(MIN_QUANTITY, Math.min(stock, v.quantity + delta))
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
        const clamped = Number.isNaN(parsed) || !Number.isFinite(parsed)
          ? v.quantity
          : Math.min(Math.max(parsed, MIN_QUANTITY), stock)
        return { ...v, quantity: clamped, _qtyText: String(clamped) }
      })
    )
  }

  const resolvedVariants = useMemo(() => {
    return editableVariants
      .filter(v => v.colorId && v.sizeId && v.quantity >= MIN_QUANTITY)
  }, [editableVariants])

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
        stock: product.cantidadStock,
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
      />

      {/* MODAL */}
      <div className="pd-modal-premium">
        <div
          className="pd-modal-content"
          onClick={(e) => e.stopPropagation()}
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
                      return (
                        <button
                          key={color.id}
                          className={`pd-color-option ${active ? 'active' : ''}`}
                          onClick={() => toggleSelectedColor(color.id)}
                          type="button"
                          aria-pressed={active}
                        >
                          <div className="pd-color-swatch" style={{ backgroundColor: color.hex }} />
                        </button>
                      )
                    })}

                  </div>

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

                    {editableVariants.map((variant, index) => {
                      const color = getColorForVariant(variant.colorId)
                      return (
                        <div key={variant.id} className="pd-variante-row">

                          {/* COLOR SELECT */}
                          <select
                            className="pd-variante-select-small"
                            value={variant.colorId}
                            onChange={(e) => updateVariantColor(variant.id, e.target.value)}
                          >
                            <option value="">Seleccionar color</option>
                            {selectedColors.map(cid => {
                              const c = productColors.find(pc => pc.id === cid)
                              return (
                                <option key={cid} value={cid}>
                                  {c?.label ?? cid}
                                </option>
                              )
                            })}
                          </select>

                          {/* SIZE SELECT */}
                          <select
                            className="pd-variante-select-small"
                            value={variant.sizeId}
                            onChange={(e) => updateVariantSize(variant.id, e.target.value)}
                            disabled={!variant.colorId}
                          >
                            <option value="">Seleccionar talla</option>
                            {productSizes.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>

                          {/* QUANTITY */}
                          <div className="pd-variante-quantity-row">
                            <button
                              className="pd-quantity-btn"
                              onClick={() => updateVariantQuantity(variant.id, -1)}
                              type="button"
                              disabled={variant.quantity <= MIN_QUANTITY}
                              aria-label="Disminir cantidad"
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
                              disabled={variant.quantity >= stock}
                              aria-label="Aumentar cantidad"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* REMOVE */}
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
                        <span>No hay variantes configuradas. Agrega una variante para comenzar.</span>
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    className="pd-variante-add-btn"
                    onClick={addVariant}
                  >
                    + Agregar otra variante
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
                          <span className="pd-meta-label">Stock</span>
                          <span className="pd-meta-value">{product.cantidadStock} uds</span>
                        </div>
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
