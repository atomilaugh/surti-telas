import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth as useAuthStore, TEST_ACCOUNTS } from '@/core/stores/authStore';
import { useCart as useCartStore } from '@/core/stores/cartStore';
import type { CartItem } from '@/core/stores/cartStore';
import { useAppStore } from '@/core/stores';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';
import { hasPermission } from '@/presentation/routes/protectedRouteHelpers';

export { TEST_ACCOUNTS };
export type { CartItem };
export const useAuth = useAuthStore;
export const useCart = useCartStore;

interface CartDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextType | undefined>(undefined);

export const useCartDrawer = () => {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error('useCartDrawer must be used within CartDrawerProvider');
  return ctx;
};

export const CartDrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <CartDrawerContext.Provider value={{ isOpen, openDrawer: () => setIsOpen(true), closeDrawer: () => setIsOpen(false) }}>
      {children}
    </CartDrawerContext.Provider>
  );
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionChecked = useAuthStore((s) => s.sessionChecked);
  const permissions = useAuthStore((s) => s.user?.permissions);

  useEffect(() => {
    void useAuthStore.getState().checkSession();
  }, []);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !tokenStorage.getAccessToken()) return;
    if (!permissions) return;

    const store = useAppStore.getState();
    void store.hydrateProductos();

    if (hasPermission(permissions, 'customers:read')) {
      void store.hydrateClientes();
    }

    if (hasPermission(permissions, 'orders:read')) {
      void store.hydratePedidos();
    }
  }, [isAuthenticated, sessionChecked, permissions]);

  return (
    <CartDrawerProvider>
      {children}
    </CartDrawerProvider>
  );
};
