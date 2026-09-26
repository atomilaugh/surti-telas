import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PackageCheck, MapPin, ClipboardList, UserCircle } from 'lucide-react';
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

const domiciliarioMenu: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard General', key: 'dashboard' },
  { icon: PackageCheck, label: 'Entregas de Hoy', key: 'entregas' },
  { icon: MapPin, label: 'Ruta del Dí­a', key: 'ruta' },
  { icon: ClipboardList, label: 'Historial', key: 'historial' },
  { icon: UserCircle, label: 'Mi Perfil', key: 'perfil' },
];

export const DomiciliarioLayout: React.FC = () => {
  useUserRole('domiciliario');
  const [darkMode, toggleTheme] = useDashboardTheme();
   const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
     if (typeof window === 'undefined') return false;
     const stored = window.localStorage.getItem('surtitelas.sidebarCollapsed');
     if (stored !== null) return stored === 'true';
     return window.matchMedia('(max-width: 1024px)').matches;
   });
  const navigate = useNavigate();
  const { logout } = useAuth();
  const storeUser = useAuthStore((s) => s.user);
  const [sidebarUser, setSidebarUser] = useState({ name: 'Cargando...', role: 'domiciliario', initials: '', avatar: '' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profile = await authApi.me();
        if (!active) return;
        const initials = profile.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        setSidebarUser({ name: profile.nombre, role: 'domiciliario', initials, avatar: profile.avatar ?? '' });
      } catch {
        if (storeUser) {
          const initials = storeUser.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';
          setSidebarUser({ name: storeUser.name ?? 'Domiciliario', role: 'domiciliario', initials, avatar: storeUser.avatar ?? '' });
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
    } catch (_e) { void _e; }

    await logout();
    navigate('/login');
  };

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <div data-dashboard-theme className={cn(s.appLayout, isCollapsed && s.collapsed)}>
      <Sidebar
        menu={domiciliarioMenu}
        basePath="/domiciliario"
        logo={logoImg}
        brandName="SURTI CAMISETAS"
        panelLabel="Portal Domiciliario"
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
            role: 'domiciliario',
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