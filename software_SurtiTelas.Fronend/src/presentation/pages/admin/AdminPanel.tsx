import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './AdminPanel.module.css';
import { useAuthStore } from '@/core/stores/authStore';
import { SYSTEM_MODULES } from '@/shared/config/systemModules';
import { hasModulePermission } from '@/presentation/routes/protectedRouteHelpers';
import { User } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const availableModules = useMemo(() => {
    const perms = user?.permissions ?? [];
    return SYSTEM_MODULES.filter(
      m => m.panel === 'admin' &&
      !m.key.startsWith('admin.dashboard') &&
      hasModulePermission(perms, m.key)
    );
  }, [user?.permissions]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.pageTitle}>Panel</h1>
        <p className={s.pageSubtitle}>Módulos disponibles según tus permisos</p>
      </div>

      {availableModules.length === 0 && (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>
            <User size={48} />
          </div>
          <h2 className={s.emptyTitle}>Acceso limitado</h2>
          <p className={s.emptyText}>Tu usuario no tiene módulos asignados. Contacta al administrador.</p>
        </div>
      )}

      {availableModules.length > 0 && (
        <div className={s.grid}>
          {availableModules.map(mod => (
            <button key={mod.key} type="button" className={s.card} onClick={() => navigate(mod.route)}>
              <div className={s.iconWrap}>
                <mod.icon size={28} />
              </div>
              <div className={s.cardBody}>
                <div className={s.cardTitle}>{mod.name}</div>
                <div className={s.cardDesc}>{mod.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
