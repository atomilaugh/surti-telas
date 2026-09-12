import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Menu,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import s from './Sidebar.module.css';

const STORAGE_KEY = 'surtitelas.sidebarCollapsed';
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface SidebarItem {
  section?: string;
  icon?: LucideIcon;
  label?: string;
  key?: string;
  subItems?: SidebarItem[];
  badge?: string;
  href?: string;
  external?: boolean;
}

export interface SidebarUser {
  name: string;
  role: string;
  initials?: string;
  avatar?: string;
}

export interface SidebarProps {
  menu: SidebarItem[];
  basePath: string;
  logo: string;
  brandName: string;
  panelLabel: string;
  user: SidebarUser;
  onLogout: () => void;
  showCollapse?: boolean;
  roleBadge?: string;
  headerActions?: React.ReactNode;
  homeHref?: string;
  profileHref?: string;
  children?: React.ReactNode;
  className?: string;
  onToggleCollapse?: (collapsed: boolean) => void;
  isActive?: (key: string) => boolean;
  badgeCounts?: Record<string, number>;
}

interface NavItemProps {
  item: SidebarItem;
  index: number;
  basePath: string;
  effectiveCollapsed: boolean;
  openGroup: string | null;
  toggleGroup: (key: string) => void;
  isActive: (key: string) => boolean;
  badgeCounts: Record<string, number>;
}

const SidebarNavItem = ({
  item,
  index,
  basePath,
  effectiveCollapsed,
  openGroup,
  toggleGroup,
  isActive,
  badgeCounts = {},
}: NavItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const itemKey = String(item.key ?? item.label ?? item.section ?? `item-${index}`);
  const hasSub = item.subItems && item.subItems.length > 0;
  const isOpen = openGroup === itemKey;
  const active = isActive(itemKey);

  const Icon = item.icon ?? LayoutDashboard;

    if (hasSub) {
      if (effectiveCollapsed) {
        return (
          <div
            className={s.navItem}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              type="button"
              className={cn(s.navLink, active && s.navLinkActive)}
              aria-label={item.label ?? item.section}
            >
              <Icon size={20} className={s.icon} />
            </button>
            {isHovered && (
              <div className={s.tooltip}>{item.label ?? item.section}</div>
            )}
          </div>
        );
      }

      const groupBadge = item.subItems?.reduce((acc, sub) => {
        const key = String(sub.key ?? sub.label ?? '');
        const count = badgeCounts[key] ?? 0;
        return acc + count;
      }, 0) || undefined;

      return (
        <div className={s.navGroup}>
          <button
            type="button"
            className={cn(s.navButton, active && s.navLinkActive)}
            onClick={() => toggleGroup(itemKey)}
            aria-expanded={isOpen}
          >
            <Icon size={20} className={s.icon} />
            <span className={s.navLabel}>{item.section ?? item.label}</span>
            {groupBadge && groupBadge > 0 && (
              <span className={s.badge}>{groupBadge > 99 ? '99+' : groupBadge}</span>
            )}
            <ChevronDown size={16} className={cn(s.chevron, isOpen && s.chevronOpen)} />
          </button>
        <div className={cn(s.submenu, isOpen && s.submenuOpen)}>
          <div className={s.submenuInner}>
            {item.subItems?.map((sub, subIdx) => {
              const subKey = String(sub.key ?? `sub-${itemKey}-${subIdx}`);
              const subActive = isActive(subKey);
              const SubIcon = sub.icon ?? LayoutDashboard;

              return (
                <NavLink
                  key={subKey}
                  to={`${basePath}/${sub.key}`}
                  end
                  className={({ isActive: linkActive }) =>
                    cn(s.navLink, subActive && linkActive && s.navLinkActive)
                  }
                >
                  <SubIcon size={18} className={s.icon} />
                  <span className={s.navLabel}>{sub.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (item.href) {
    return (
      <div
        className={s.navItem}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <a
          href={item.href}
          className={cn(s.navLink, active && s.navLinkActive)}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
        >
          <Icon size={20} className={s.icon} />
          {!effectiveCollapsed && <span className={s.navLabel}>{item.label}</span>}
        </a>
        {effectiveCollapsed && isHovered && (
          <div className={s.tooltip}>{item.label}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className={s.navItem}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NavLink
        to={`${basePath}/${item.key}`}
        end
        className={({ isActive: linkActive }) =>
          cn(
            s.navLink,
            active && linkActive && s.navLinkActive
          )
        }
      >
        <Icon size={20} className={s.icon} />
        {!effectiveCollapsed && <span className={s.navLabel}>{item.label}</span>}
        {!effectiveCollapsed && (item.badge || badgeCounts[String(item.key)] > 0) && (
          <span className={s.badge}>{item.badge ?? (badgeCounts[String(item.key)] > 99 ? '99+' : badgeCounts[String(item.key)])}</span>
        )}
      </NavLink>
      {effectiveCollapsed && isHovered && (
        <div className={s.tooltip}>{item.label}</div>
      )}
    </div>
  );
};

export const Sidebar = ({
   menu,
   basePath,
   logo,
   brandName,
   panelLabel,
   user,
   onLogout,
   showCollapse = true,
   roleBadge,
   headerActions,
   homeHref,
   profileHref,
   children,
   className,
   onToggleCollapse,
   isActive: activeMatcher,
   badgeCounts = {},
}: SidebarProps) => {
   void roleBadge;
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [tabletDefaultCollapsed, setTabletDefaultCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.localStorage.getItem(STORAGE_KEY) === null &&
      window.matchMedia(`(max-width: ${TABLET_BREAKPOINT}px)`).matches
    );
  });

  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const [hoveredLogout, setHoveredLogout] = useState(false);
  const [hoveredProfile, setHoveredProfile] = useState(false);
  const [hoveredHome, setHoveredHome] = useState(false);

  useEffect(() => {
    const mediaMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const mediaTablet = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT}px)`);

    const handleResize = () => {
      setIsMobile(mediaMobile.matches);
      setIsTablet(mediaTablet.matches);

      if (!mediaMobile.matches && !mediaTablet.matches && window.localStorage.getItem(STORAGE_KEY) === null) {
        setCollapsed(false);
      }
    };

    handleResize();

    mediaMobile.addEventListener('change', handleResize);
    mediaTablet.addEventListener('change', handleResize);
    return () => {
      mediaMobile.removeEventListener('change', handleResize);
      mediaTablet.removeEventListener('change', handleResize);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  const effectiveCollapsed = useMemo(() => {
    if (isMobile) return false;
    return isTablet ? tabletDefaultCollapsed : collapsed;
  }, [isMobile, isTablet, tabletDefaultCollapsed, collapsed]);

  const toggleCollapse = useCallback(() => {
    setTabletDefaultCollapsed(false);
    setCollapsed((prev) => {
      const newState = !prev;
      onToggleCollapse?.(newState);
      return newState;
    });
  }, [onToggleCollapse]);

  const toggleGroup = useCallback((key: string) => {
    setOpenGroup((prev) => (prev === key ? null : key));
  }, []);

  const defaultIsActive = useCallback(
    (itemKey: string) => {
      const path = location.pathname;
      if (itemKey === 'dashboard' && (path === `${basePath}/` || path === `${basePath}/dashboard`)) {
        return true;
      }
      return path.includes(`/${itemKey}`);
    },
    [location.pathname, basePath]
  );

  const resolveIsActive = activeMatcher ?? defaultIsActive;

  const _userInitials = useMemo(() => {
    return user.initials || user.name.charAt(0).toUpperCase();
  }, [user.initials, user.name]);

  return (
    <>
      <aside
        className={cn(
          s.sidebar,
          effectiveCollapsed && s.sidebarCollapsed,
          isMobile && mobileOpen && s.sidebarMobileOpen,
          className
        )}
      >
        <div className={s.header}>
          <div className={s.brand}>
            <img src={logo} alt={brandName} className={s.brandLogo} />
            <div className={s.brandText}>
              <span className={s.brandName}>{brandName}</span>
              <span className={s.brandLabel}>{panelLabel}</span>
            </div>
          </div>
          {showCollapse && !isMobile && (
            <button
              type="button"
              className={s.collapseBtn}
              onClick={toggleCollapse}
              aria-label={effectiveCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {effectiveCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
          {isMobile && mobileOpen && (
            <button
              type="button"
              className={s.mobileCloseBtn}
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
          )}
        </div>

         <nav className={s.navigation} aria-label="Navegación principal">
          {menu.map((item, idx) => (
            <SidebarNavItem
              key={item.key ?? `nav-item-${idx}`}
              item={item}
              index={idx}
              basePath={basePath}
              effectiveCollapsed={effectiveCollapsed}
              openGroup={openGroup}
              toggleGroup={toggleGroup}
              isActive={resolveIsActive}
              badgeCounts={badgeCounts}
            />
          ))}
        </nav>

        <div className={s.footer}>
          {homeHref && (
            <button
              type="button"
              className={s.actionButton}
              onClick={() => (window.location.href = homeHref)}
              onMouseEnter={() => setHoveredHome(true)}
              onMouseLeave={() => setHoveredHome(false)}
            >
              <Home size={18} />
              {!effectiveCollapsed && <span>Ir al Inicio</span>}
            </button>
          )}
          {profileHref && (
            <button
              type="button"
              className={s.actionButton}
              onClick={() => (window.location.href = profileHref)}
              onMouseEnter={() => setHoveredProfile(true)}
              onMouseLeave={() => setHoveredProfile(false)}
            >
              <User size={18} />
              {!effectiveCollapsed && <span>Mi perfil</span>}
            </button>
          )}
          {hoveredProfile && effectiveCollapsed && profileHref && (
            <div className={s.actionTooltip}>Mi perfil</div>
          )}
          <button
            type="button"
            className={s.actionButton}
            onClick={onLogout}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
          >
            <LogOut size={18} />
            {!effectiveCollapsed && <span>Cerrar sesión</span>}
          </button>
          {hoveredLogout && effectiveCollapsed && (
            <div className={s.actionTooltip}>Cerrar sesión</div>
          )}
          {hoveredHome && effectiveCollapsed && homeHref && (
            <div className={s.actionTooltip}>Ir al Inicio</div>
          )}
        </div>
      </aside>

      {headerActions && !isMobile && (
        <div className={s.headerActions}>{headerActions}</div>
      )}

      <main className={s.mainContent}>{children}</main>

      {isMobile && (
        <>
          {mobileOpen && (
            <div className={s.overlay} onClick={() => setMobileOpen(false)} />
          )}
          <button
            type="button"
            className={s.mobileTrigger}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
        </>
      )}
    </>
  );
};
