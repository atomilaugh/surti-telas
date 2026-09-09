import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings2, Users, UserCog, Shield, ShoppingBag, Package, Boxes, FolderTree, AlertTriangle, Factory, ClipboardList, ShoppingCart, UserSearch, BarChart3, TrendingUp, Users2, LineChart, DollarSign, KeyRound, MapPin, FileText, Tags, RotateCcw } from 'lucide-react';

import s from '../../../styles/admin/AdminLayout.module.css';
import { Sidebar, SidebarItem } from '@/shared/layouts/Sidebar';
import { useAuth } from '@/app/providers/AppProviders';
import { useAuthStore } from '@/core/stores/authStore';
import { useDashboardTheme } from '@/core/hooks/useDashboardTheme';
import { useUserRole, clearUserRole } from '@/core/hooks/useUserRole';
import { TopHeader } from '@/presentation/components/TopHeader';
import { cn } from '@/shared/utils';
import logoImg from '@/assets/images/logos/partner-logo-2-Photoroom.png';
import { useAppStore } from '@/core/stores';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';
import { reportsApi } from '@/infrastructure/api/reportsApi';
import { adminContent } from '@/shared/config/adminContent';
import { filterMenuByPermissions } from '@/shared/config/menuPermissions';
import { useNotifications } from '@/shared/context';

const adminMenu: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard General', key: 'dashboard' },

  {
    icon: Settings2,
    label: 'Configuración',
    key: 'configuracion',
    subItems: [
      { icon: Shield, label: 'Gestión de Roles y Permisos', key: 'gestion-roles-permisos' },
    ],
  },

  {
    icon: Users,
    label: 'Usuarios',
    key: 'usuarios',
    subItems: [
      { icon: UserSearch, label: 'Gestión de Usuarios', key: 'gestion-usuarios' },
      { icon: KeyRound, label: 'Gestión de Accesos', key: 'gestion-acceso' },
      { icon: UserCog, label: 'Gestión de Empleados', key: 'empleados' },
    ],
  },
  
  {
    icon: ShoppingBag,
    label: 'Compras',
    key: 'compras',
    subItems: [
      { icon: Package, label: 'Gestión de Proveedores', key: 'proveedores' },
      { icon: Tags, label: 'Gestión de Categorías Insumos', key: 'categorias-insumos' },
      { icon: Boxes, label: 'Gestión de Insumos', key: 'insumos' },
      { icon: ShoppingBag, label: 'Gestión de Compras', key: 'compras' },
    ],
  },

  {
    icon: ShoppingCart,
    label: 'Ventas',
    key: 'ventas-pedidos',
    subItems: [
      { icon: Users, label: 'Gestión de Clientes', key: 'clientes' },
      { icon: FileText, label: 'Gestión de Cotizaciones', key: 'pedidos-personalizados' },
      { icon: ShoppingCart, label: 'Gestión de Pedidos', key: 'pedidos' },
      { icon: DollarSign, label: 'Gestión de Pagos', key: 'pagos' },
      { icon: TrendingUp, label: 'Gestión de Ventas', key: 'gestion-ventas' },
      { icon: RotateCcw, label: 'Gestión de Devoluciones', key: 'StockDevuelto' },
      { icon: MapPin, label: 'Gestión de Domicilios', key: 'ruta-del-dia' },
    ],
  },

  {
    icon: Factory,
    label: 'Producción',
    key: 'produccion',
    subItems: [
      { icon: ClipboardList, label: 'Gestión de Talleres', key: 'talleres' },
      { icon: FolderTree, label: 'Gestión de Categorías Productos', key: 'categorias' },
      { icon: Package, label: 'Gestión de Productos', key: 'productos' },
      { icon: Boxes, label: 'Órdenes de Producción', key: 'produccion' },
      { icon: LineChart, label: 'Gestión de Seguimiento de Producción', key: 'seguimiento' },
    ],
  },

  {
    icon: BarChart3,
    label: 'Reportes',
    key: 'reportes',
    subItems: [
      { icon: Users2, label: 'Gestión de Reportes de Usuarios', key: 'reportes/usuarios' },
      { icon: Factory, label: 'Gestión de Reportes de Producción', key: 'reportes/produccion' },
      { icon: AlertTriangle, label: 'Gestión de Alertas de Stock', key: 'alertas-stock' },
      { icon: Package, label: 'Gestión de Reportes de Inventario', key: 'reportes/inventario' },
      { icon: BarChart3, label: 'Gestión de Reportes de Ventas', key: 'reportes/ventas' },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const authUser = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const { logout } = useAuth();
  useUserRole(authUser?.role ?? 'admin');
  const [darkMode, toggleTheme] = useDashboardTheme();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('surtitelas.sidebarCollapsed') === 'true';
  });
  const filteredMenu = useMemo(() => filterMenuByPermissions(adminMenu, authUser), [authUser]);
  const { sidebarSummary } = useNotifications();

  useEffect(() => {
    const perms = authUser?.permissions ?? [];
    const hasAccess = filteredMenu.some(item => item.key !== 'dashboard') || perms.length > 0;
    if (!hasAccess) {
      navigate('/unauthorized', { replace: true });
    }
  }, [authUser?.permissions, filteredMenu, navigate]);

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const moduleMap: Record<string, string> = {
      pedidos: 'pedidos',
      clientes: 'clientes',
      'pedidos-personalizados': 'cotizaciones',
      produccion: 'produccion',
      inventario: 'existencias',
      domicilios: 'domicilios',
      pagos: 'pagos',
      facturacion: 'facturacion',
      StockDevuelto: 'devoluciones',
      'gestion-usuarios': 'usuarios',
      talleres: 'talleres',
      productos: 'catalogo',
    };
    for (const [menuKey, moduleKey] of Object.entries(moduleMap)) {
      const count = sidebarSummary[moduleKey];
      if (count && count > 0) {
        counts[menuKey] = count;
      }
    }
    return counts;
  }, [sidebarSummary]);

  useEffect(() => {
    window.localStorage.setItem('surtitelas.sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const token = tokenStorage.getAccessToken();
      if (!token) return;
      try {
        await useAppStore.getState().hydrateAll();
      } finally {
        if (active) {
          // noop: hydrated or failed silently
        }
      }
    };
    void hydrate();
    return () => { active = false; };
  }, []);

  const location = useLocation();

  const isActive = useCallback(
    (itemKey: string) => {
      const path = location.pathname;
      if (itemKey === 'dashboard' && (path === '/admin/' || path === '/admin/dashboard')) {
        return true;
      }
      if (itemKey === 'inventario') {
        return path.includes('/inventario') || path.includes('/catalogo');
      }
      if (itemKey === 'domicilios') {
        return path.includes('/domicilios');
      }
      if (itemKey === 'ruta-del-dia') {
        return path.includes('/ruta-del-dia');
      }
      if (itemKey === 'StockDevuelto') {
        return path.includes('/StockDevuelto') || path.includes('/stock-devuelto');
      }
      if (itemKey === 'configuracion') {
        return path.includes('/configuracion') || path.includes('/roles') || path.includes('/permisos') || path.includes('/webhooks');
      }
      return path.includes(`/${itemKey}`);
    },
    [location.pathname]
  );

  const handleLogout = async () => {
    // Clean theme state scoped to dashboards so public pages remain unaffected
    try {
      window.localStorage.removeItem('dashboard-theme');
      document.querySelectorAll<HTMLElement>('[data-dashboard-theme]').forEach(el => el.removeAttribute('data-theme'));
      document.documentElement.removeAttribute('data-theme');
      document.body?.removeAttribute('data-theme');
      clearUserRole();
    } catch (_e) {
      // ignore
    }

    await logout();
    navigate('/login');
  };

  const handleSearch = (value: string) => {
    void value;
  };

  const handleExport = async () => {
    try {
      const report = await reportsApi.getSalesReport().catch(() => null);
      const rows: string[][] = [['Producto', 'Cantidad', 'Total']];
      if (report) {
        for (const p of report.topProducts ?? []) {
          rows.push([p.nombre, String(p.cantidad), String(p.total)]);
        }
      }
      if (rows.length === 1) {
        rows.push(['Sin datos para exportar', '', '']);
      }
      const csvContent = rows.map(e => e.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte-surtitelas.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // silent
    }
  };

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  const userDisplay = {
    name: authUser?.name ?? authUser?.email ?? '',
    email: authUser?.email ?? '',
    role: authUser?.role ?? 'admin',
    initial: (authUser?.name ?? authUser?.email ?? '?').charAt(0).toUpperCase(),
    avatar: authUser?.avatar ?? null,
  };
  const roleLabel = userDisplay.role === 'admin' ? adminContent.layout.userRoleLabels.admin : adminContent.layout.userRoleLabels.default;

  return (
    <div data-dashboard-theme className={cn(s.appLayout, isCollapsed && s.collapsed)}>
      <Sidebar
        menu={filteredMenu}
        basePath="/admin"
        logo={logoImg}
        brandName={adminContent.layout.brandName}
        panelLabel={adminContent.layout.panelLabel}
        user={{ name: userDisplay.name, role: roleLabel, initials: userDisplay.initial }}
        onLogout={handleLogout}
        showCollapse={true}
        homeHref="/"
        onToggleCollapse={handleSidebarToggle}
        isActive={isActive}
        badgeCounts={badgeCounts}
      />

      <div className={s.mainContent}>
        <TopHeader
          user={{
            name: userDisplay.name,
            email: userDisplay.email,
            role: userDisplay.role,
            initial: userDisplay.initial,
            avatar: userDisplay.avatar,
          }}
          onSearch={handleSearch}
          onToggleTheme={toggleTheme}
          onExport={handleExport}
          darkMode={darkMode}
        />

        <main className={s.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};





