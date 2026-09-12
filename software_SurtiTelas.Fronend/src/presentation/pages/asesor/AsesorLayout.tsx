import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, BadgeDollarSign, Users, UserCircle, Store } from 'lucide-react';
import s from '../../../styles/admin/AdminLayout.module.css';
import { Sidebar, SidebarItem } from '@/shared/layouts/Sidebar';
import { useAuth } from '@/app/providers/AppProviders';
import { useDashboardTheme } from '@/core/hooks/useDashboardTheme';
import { useUserRole, clearUserRole } from '@/core/hooks/useUserRole';
import { TopHeader } from '@/presentation/components/TopHeader';
import { cn } from '@/shared/utils';
import { useAuthStore } from '@/core/stores/authStore';
import { authApi } from '@/infrastructure/api/authApi';
import logoImg from '@/assets/images/logos/partner-logo-2-Photoroom.png';

const asesorMenu: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard General', key: 'dashboard' },
  { icon: Store, label: 'Gestión de Productos', key: 'catalogo' },
  { icon: ShoppingBag, label: 'Pedidos', key: 'pedidos' },
  { icon: BadgeDollarSign, label: 'Comisiones', key: 'comisiones' },
  { icon: Users, label: 'Mis Clientes', key: 'clientes' },
  { icon: UserCircle, label: 'Mi Perfil', key: 'perfil' },
];

export const AsesorLayout: React.FC = () => {
  useUserRole('asesor');
  const [darkMode, toggleTheme] = useDashboardTheme();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('surtitelas.sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();
  const { logout } = useAuth();
  const storeUser = useAuthStore((s) => s.user);
  const [sidebarUser, setSidebarUser] = useState({ name: 'Cargando...', role: 'asesor', initials: '', avatar: '' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profile = await authApi.me();
        if (!active) return;
        const initials = profile.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        setSidebarUser({ name: profile.nombre, role: 'asesor', initials, avatar: profile.avatar ?? '' });
      } catch {
        if (storeUser) {
          const initials = storeUser.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';
          setSidebarUser({ name: storeUser.name ?? 'Asesor', role: 'asesor', initials, avatar: storeUser.avatar ?? '' });
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [storeUser]);

  useEffect(() => {
    window.localStorage.setItem('surtitelas.sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = async () => {
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

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <div data-dashboard-theme className={cn(s.appLayout, isCollapsed && s.collapsed)}>
      <Sidebar
        menu={asesorMenu}
        basePath="/asesor"
        logo={logoImg}
        brandName="SURTI CAMISETAS"
        panelLabel="Panel de Asesor"
        user={sidebarUser}
        onLogout={handleLogout}
        showCollapse={true}
        homeHref="/"
        onToggleCollapse={handleSidebarToggle}
      />
      <div className={s.mainContent}>
        <TopHeader
          user={{
            name: sidebarUser.name,
            email: storeUser?.email ?? '',
            role: 'asesor',
            initial: sidebarUser.initials,
            avatar: sidebarUser.avatar,
          }}
          onSearch={() => {}}
          onToggleTheme={toggleTheme}
          darkMode={darkMode}
        />
        <main className={s.pageContent}><Outlet /></main>
      </div>
    </div>
  );
};

