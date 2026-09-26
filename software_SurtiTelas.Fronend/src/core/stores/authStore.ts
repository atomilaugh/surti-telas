import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/infrastructure/api/authApi';
import { ApiError, setUnauthorizedHandler, refreshAccessToken } from '@/infrastructure/api/httpClient';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';

export type UserRole = 'admin' | 'almacen' | 'asesor' | 'domiciliario' | 'cliente' | 'produccion' | 'reportes' | string;

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name?: string;
  permissions?: string[];
  avatar?: string | null;
}

export interface LoginResult {
  success: boolean;
  role?: UserRole;
  error?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  sessionChecked: boolean;
  returnTo: string | null;
  login: (user: User) => void;
  loginWithCredentials: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  checkSession: () => Promise<void>;
  setReturnTo: (path: string) => void;
  clearReturnTo: () => void;
}

/**
 * Cuentas de acceso rápido (autocompletado de email para demo).
 * Ya NO contienen contraseñas: la autenticación se valida contra el backend.
 * La contraseña real vive únicamente en la base de datos (hasheada con bcrypt).
 */
export const TEST_ACCOUNTS: { label: string; email: string; password: string }[] = [
  { label: 'Administrador', email: 'admin@surtitelas.com', password: '' },
];

const AUTH_STORAGE_KEY = 'surtitelas.auth';

const ROLE_MAP: Record<string, UserRole> = {
  ADMIN: 'admin',
  ALMACEN: 'almacen',
  ASESOR: 'asesor',
  DOMICILIARIO: 'domiciliario',
  CLIENTE: 'cliente',
  PRODUCCION: 'produccion',
  REPORTES: 'reportes',
};

const ADMIN_ROLES = new Set(['admin', 'ADMIN']);

export const mapRole = (role: string): UserRole => {
  const exact = ROLE_MAP[role];
  if (exact) return exact;
  for (const [backendRole, frontendRole] of Object.entries(ROLE_MAP)) {
    if (role.startsWith(backendRole)) return frontendRole;
  }
  return role;
};

export const isAdminRole = (role: string): boolean => {
  return ADMIN_ROLES.has(role) || role === 'admin';
};

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(decoded);
    if (!payload.exp) return true;
    const now = Date.now() / 1000;
    return payload.exp < now + 30;
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sessionChecked: false,
      returnTo: null,
      login: (user) => set({ user, isAuthenticated: true, sessionChecked: true }),

      loginWithCredentials: async (email, password) => {
        try {
          const result = await authApi.login(email, password);
          tokenStorage.setTokens(result.accessToken, result.refreshToken ?? '');
          const role = mapRole(result.user.role);
          set({
            user: {
              uid: result.user.id,
              email: result.user.email,
              name: result.user.nombre,
              role,
              permissions: result.user.permissions,
              avatar: result.user.avatar,
            },
            isAuthenticated: true,
            sessionChecked: true,
          });
          return { success: true, role };
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.';
          return { success: false, error: message };
        }
      },

      logout: () => {
        void authApi.logout().catch(() => undefined);
        tokenStorage.clear();
        set({ user: null, isAuthenticated: false, sessionChecked: true });
      },

      checkSession: async () => {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          const current = useAuthStore.getState();
          if (current.isAuthenticated && current.user) {
            try {
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                const profile = await authApi.me();
                set({
                  user: {
                    uid: profile.id,
                    email: profile.email,
                    name: profile.nombre,
                    role: mapRole(profile.role),
                    permissions: profile.permissions ?? current.user.permissions ?? [],
                    avatar: profile.avatar,
                  },
                  isAuthenticated: true,
                  sessionChecked: true,
                });
                return;
              }
            } catch {
              /* refresh failed */
            }
          }
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false, sessionChecked: true });
          return;
        }
        if (isTokenExpired(token)) {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false, sessionChecked: true });
          return;
        }
        try {
          const profile = await authApi.me();
          const current = useAuthStore.getState().user;
          const mergedPermissions = profile.permissions ?? current?.permissions ?? [];
          set({
            user: {
              uid: profile.id,
              email: profile.email,
              name: profile.nombre,
              role: mapRole(profile.role),
              permissions: mergedPermissions,
              avatar: profile.avatar,
            },
            isAuthenticated: true,
            sessionChecked: true,
          });
        } catch {
          tokenStorage.clear();
          set({ user: null, isAuthenticated: false, sessionChecked: true });
        }
      },

      setReturnTo: (path) => set({ returnTo: path }),
      clearReturnTo: () => set({ returnTo: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Cuando el backend responde 401 y no se puede refrescar, cerramos la sesión.
setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, sessionChecked: true });
});

export const useAuth = useAuthStore;
