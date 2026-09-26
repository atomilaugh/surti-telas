// CartDrawer.tsx - Carrito Premium con UX/UI de Clase Mundial
import React from "react"
import { X, Minus, Plus, ShoppingBag, ArrowLeft } from "lucide-react"
import { useCart } from "@/app/providers/AppProviders"
import { useCartDrawer } from "@/app/providers/AppProviders"
import "./CartDrawer.css"

export const CartDrawer: React.FC = () => {
  const { isOpen, closeDrawer } = useCartDrawer()
  const { items, totalItems, subtotal, discount, shipping, total, removeFromCart, increaseQuantity, decreaseQuantity } = useCart()

  const tax = Math.round(subtotal * 0.19) // IVA 19%
  const finalTotal = total

  if (!isOpen) return null

  return (
    <>
      {/* Overlay Cinematográfico Premium */}
      <div
        className="cart-overlay-premium"
        onClick={closeDrawer}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeDrawer(); } }}
        tabIndex={0}
        role="button"
        aria-label="Cerrar carrito"
      >
        <div className="cart-overlay-bg" />
        <div className="cart-overlay-noise" />
      </div>

      {/* Sidebar Premium */}
      <div className="cart-drawer-premium">
        {/* Header Premium */}
        <header className="cart-header-premium">
          <div className="cart-header-content">
            <div className="cart-header-title">
              <ShoppingBag size={24} className="cart-icon-premium" />
              <div>
                <h2>Tu carrito</h2>
                <span className="cart-count-premium">
                  {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                </span>
              </div>
            </div>
            <button className="cart-close-premium" onClick={closeDrawer}>
              <X size={20} />
            </button>
          </div>
          <div className="cart-divider-premium" />
        </header>

        {/* Body con Scroll Premium */}
        <div className="cart-body-premium">
          {items.length === 0 ? (
            <div className="cart-empty-premium">
              <div className="cart-empty-icon">
                <ShoppingBag size={48} />
              </div>
              <h3>Tu carrito está vacío</h3>
              <p>Descubre nuestras telas premium</p>
              <button className="cart-continue-shopping" onClick={closeDrawer}>
                <ArrowLeft size={16} />
                Continuar comprando
              </button>
            </div>
          ) : (
            <>
              {/* Lista de Productos Premium */}
              <div className="cart-items-premium">
                {items.map((item, index) => (
                  <div
                    key={item.cartId}
                    className="cart-item-premium"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Imagen Premium */}
                    <div className="cart-item-image-wrapper">
                      <img
                        src={item.imagen || "/assets/images/placeholders/product.svg"}
                        alt={item.nombre}
                        className="cart-item-image"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          if (!target.src.includes("placeholders")) {
                            target.src = "/assets/images/placeholders/product.svg"
                          }
                        }}
                      />
                      <div className="cart-item-image-overlay" />
                    </div>

                    {/* Info del Producto */}
                    <div className="cart-item-info">
                      <div className="cart-item-header">
                        <h4 className="cart-item-name">{item.nombre}</h4>
                                <button
                          className="cart-item-remove"
                          onClick={() => removeFromCart(item.cartId)}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="cart-item-meta">
                        <span className="cart-item-category">{item.categoria}</span>
                        {item.talla && (
                          <span className="cart-item-size">Talla: {item.talla}</span>
                        )}
                        {item.color && (
                          <span className="cart-item-color">Color: {item.color}</span>
                        )}
                      </div>

                      <div className="cart-item-footer">
                        <span className="cart-item-price">
                          ${item.precio.toLocaleString()}
                        </span>

                        {/* Selector de Cantidad Premium */}
                        <div className="cart-quantity-selector">
                          <button
                            className="quantity-btn"
                            onClick={() => decreaseQuantity(item.cartId)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="quantity-value">{item.quantity}</span>
                          <button
                            className="quantity-btn"
                            onClick={() => increaseQuantity(item.cartId)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen del Carrito Premium */}
              <div className="cart-summary-premium">
                <div className="cart-summary-header">
                  <h3>Resumen del pedido</h3>
                </div>

                <div className="cart-summary-items">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>

                  {discount > 0 && (
                    <div className="summary-row discount">
                      <span>Descuento</span>
                      <span>-${discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="summary-row">
                    <span>IVA 19%</span>
                    <span>${tax.toLocaleString()}</span>
                  </div>

                  <div className="summary-row">
                    <span>Envi­o</span>
                    <span>{shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString()}`}</span>
                  </div>

                  <div className="summary-divider" />

                  <div className="summary-row total">
                    <span>Total</span>
                    <span>${finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                {subtotal < 150 && (
                  <div className="cart-free-shipping">
                    <span>Á¡Agrega ${(150 - subtotal).toLocaleString()} más para envío gratis!</span>
                    <div className="shipping-progress">
                      <div
                        className="shipping-progress-bar"
                        style={{ width: `${(subtotal / 150) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer con Botones Premium */}
        {items.length > 0 && (
          <footer className="cart-footer-premium">
            <button className="cart-continue-shopping" onClick={closeDrawer}>
              <ArrowLeft size={16} />
              Continuar comprando
            </button>

            <button className="cart-checkout-premium">
              Finalizar compra
              <span className="checkout-price">${finalTotal.toLocaleString()}</span>
            </button>
          </footer>
        )}
      </div>
    </>
  )
}


