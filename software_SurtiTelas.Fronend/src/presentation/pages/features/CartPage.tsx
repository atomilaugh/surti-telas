import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/app/providers/AppProviders";
import CheckoutButton from "@/presentation/components/CheckoutButton";
import { CheckoutModal } from "@/presentation/components/CheckoutModal";
import "../styles/CartPage.css";

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;

const CartPage: React.FC = () => {
  const {
    items,
    totalItems,
    subtotal,
    discount,
    tax,
    shipping,
    total,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  

  return (
    <div className="cart-page">
      <header className="cart-page-header">
        <div>
          <h1>Tu carrito</h1>
          <p className="cart-page-count">
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'} en tu pedido
          </p>
        </div>
        {items.length > 0 && (
          <button className="cart-empty-cta" onClick={clearCart} type="button">
            Vaciar carrito
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="cart-empty">
          <h2>Carrito vacío</h2>
          <p>Agrega tus telas premium favoritas para comenzar tu compra.</p>
          <Link className="cart-empty-cta" to="/catalogo">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-items">
            {items.map((item) => (
              <article key={item.cartId} className="cart-item-card">
                <div className="cart-item-image-wrapper">
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="cart-item-image"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('placeholders')) {
                        target.src = '/assets/images/placeholders/product.svg';
                      }
                    }}
                  />
                </div>

                <div className="cart-item-info">
                  <div className="cart-item-main">
                    <h2 className="cart-item-name">{item.nombre}</h2>
                    <div className="cart-item-meta">
                      <span>{item.categoria}</span>
                      {item.talla && <span>Talla: {item.talla}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                  </div>

                  <div className="cart-item-actions">
                    <div className="cart-item-quantity">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.cartId)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.cartId)}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <span className="cart-item-price">{formatCurrency(item.precio)}</span>
                    <button
                      type="button"
                      className="cart-item-remove"
                      onClick={() => removeFromCart(item.cartId)}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>

                  <div className="cart-item-meta">
                    <span>{item.stock - item.quantity} disponibles</span>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="cart-summary">
            <h2>Resumen de tu pedido</h2>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Descuento</span>
              <span>{discount > 0 ? `-${formatCurrency(discount)}` : '$0'}</span>
            </div>
            <div className="cart-summary-row">
              <span>IVA 19%</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Envío</span>
              <span>{shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</span>
            </div>
            <div className="cart-summary-total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <CheckoutButton total={total} disabled={items.length === 0} onContinueShopping={() => setIsCheckoutOpen(true)} />
          </aside>
        </div>
      )}

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </div>
  );
};

export default CartPage;



