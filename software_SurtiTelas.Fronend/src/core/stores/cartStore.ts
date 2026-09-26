import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartItem {
  cartId: string;
  productId?: string;
  nombre: string;
  precio: number;
  quantity: number;
  stock: number;
  imagen?: string;
  categoria?: string;
  talla?: string;
  color?: string;
  referencia?: string;
}

export interface CartTotals {
  totalItems: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface CartState extends CartTotals {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'cartId'> & { cartId?: string; quantity?: number }) => void;
  removeFromCart: (cartId: string) => void;
  increaseQuantity: (cartId: string) => void;
  decreaseQuantity: (cartId: string) => void;
  setQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
}

const SHIPPING_THRESHOLD = 150000;
const SHIPPING_COST = 15000;
const TAX_RATE = 0.19;

const calculateTotals = (items: CartItem[]): CartTotals => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.quantity, 0);
  const discount = 0;
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const tax = Math.round(subtotal * TAX_RATE);

  return {
    totalItems,
    subtotal,
    discount,
    shipping,
    tax,
    total: subtotal - discount + shipping,
  };
};

const CART_STORAGE_KEY = 'surtitelas.cart';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ...calculateTotals([]),
      addToCart: (item) => {
        const cartId = item.cartId || `${item.nombre}-${item.talla || ''}-${item.color || ''}`.trim();
        const quantity = item.quantity || 1;

        set((state) => {
          const existingIndex = state.items.findIndex((current) => current.cartId === cartId);

          if (existingIndex === -1) {
            const nextItems = [...state.items, { ...item, cartId, quantity }];
            return { items: nextItems, ...calculateTotals(nextItems) };
          }

          const nextItems = state.items.map((current, index) => {
            if (index !== existingIndex) return current;
            return {
              ...current,
              quantity: Math.min(current.quantity + quantity, current.stock),
            };
          });

          return { items: nextItems, ...calculateTotals(nextItems) };
        });
      },
      removeFromCart: (cartId) => {
        const nextItems = get().items.filter((item) => item.cartId !== cartId);
        set({ items: nextItems, ...calculateTotals(nextItems) });
      },
      increaseQuantity: (cartId) => {
        const nextItems = get().items.map((item) => (
          item.cartId === cartId ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item
        ));
        set({ items: nextItems, ...calculateTotals(nextItems) });
      },
      decreaseQuantity: (cartId) => {
        const nextItems = get().items.map((item) => (
          item.cartId === cartId ? { ...item, quantity: Math.max(item.quantity - 1, 1) } : item
        ));
        set({ items: nextItems, ...calculateTotals(nextItems) });
      },
      setQuantity: (cartId, quantity) => {
        const nextItems = get().items.map((item) => (
          item.cartId === cartId ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.stock) } : item
        ));
        set({ items: nextItems, ...calculateTotals(nextItems) });
      },
      clearCart: () => set({ items: [], ...calculateTotals([]) }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state?.items) {
          const totals = calculateTotals(state.items);
          state.totalItems = totals.totalItems;
          state.subtotal = totals.subtotal;
          state.discount = totals.discount;
          state.shipping = totals.shipping;
          state.tax = totals.tax;
          state.total = totals.total;
        }
      },
    },
  ),
);

export const useCart = useCartStore;
