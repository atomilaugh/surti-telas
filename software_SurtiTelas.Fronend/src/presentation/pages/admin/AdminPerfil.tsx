import React, { useEffect, useState } from 'react';
import { authApi } from '@/infrastructure/api/authApi';
import { useAuthStore } from '@/core/stores/authStore';
import s from './AdminPerfil.module.css';

export const AdminPerfil: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<{ nombre: string; email: string; telefono?: string | null; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await authApi.me();
        setProfile({
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          role: data.role,
        });
      } catch {
        // keep silent, page will show fallback
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.avatar}>{profile?.nombre?.charAt(0)?.toUpperCase() ?? user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</div>
          <div>
            <h1 className={s.title}>Mi cuenta</h1>
            <p className={s.subtitle}>Información básica de tu cuenta</p>
          </div>
        </div>

        {loading ? (
          <div className={s.loading}>Cargando...</div>
        ) : (
          <div className={s.fields}>
            <div className={s.field}>
              <label className={s.label}>Nombre</label>
              <div className={s.value}>{profile?.nombre || user?.name || '-'}</div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Correo</label>
              <div className={s.value}>{profile?.email || user?.email || '-'}</div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Rol</label>
              <div className={s.value}>{profile?.role || user?.role || '-'}</div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Teléfono</label>
              <div className={s.value}>{profile?.telefono || user?.avatar || '-'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
