import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Lock, Check, Image as ImageIcon, User } from 'lucide-react';
import { toast } from 'sonner';
import styles from './PerfilAsesor.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Tooltip } from '@/shared/components/Tooltip';
import { authApi } from '@/infrastructure/api/authApi';
import { useAuthStore } from '@/core/stores/authStore';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { customersApi } from '@/infrastructure/api/customersApi';

export const AsesorPerfil: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [_loading, _setLoading] = useState(true);
  const [_saving, _setSaving] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [clientCount, setClientCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      _setLoading(true);
      try {
        const profile = await authApi.me();
        setNombre(profile.nombre);
        setTelefono(profile.telefono ?? '');
        setEmail(profile.email);
        setAvatarName(profile.nombre);
        const [ordersResult, clientsResult] = await Promise.all([
          ordersApi.list({ asesorId: profile.id }),
          customersApi.list({ asesorId: profile.id }),
        ]);
        setOrderCount(ordersResult.pedidos.length);
        setClientCount(clientsResult.data.filter((c) => c.asesor === profile.nombre).length);
      } catch {
        toast.error('No se pudo cargar el perfil');
      } finally {
        _setLoading(false);
      }
    };
    void load();
  }, []);

  const validarPerfil = () => {
    setFormError('');
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return false;
    }

    const hayCambiosPassword = passwordActual || passwordNueva || passwordConfirm;
    if (hayCambiosPassword) {
      if (!passwordActual || !passwordNueva || !passwordConfirm) {
        setFormError('Completa todos los campos de contraseña.');
        return false;
      }
      if (passwordNueva.length < 8) {
        setFormError('La nueva contraseña debe tener al menos 8 caracteres.');
        return false;
      }
      if (passwordNueva !== passwordConfirm) {
        setFormError('La nueva contraseña no coincide con la confirmación.');
        return false;
      }
    }

    return true;
  };

  const guardarCambios = async () => {
    if (!validarPerfil()) return;
    _setSaving(true);
    try {
      await authApi.updateProfile({ nombre, telefono });
      if (user) {
        useAuthStore.setState({ user: { ...user, name: nombre } });
      }
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
      toast.success('Cambios guardados correctamente');
    } catch {
      toast.error('No fue posible guardar los cambios');
    } finally {
      _setSaving(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Mi Perfil</h1>
      <p className={styles.pageSubtitle}>Datos personales y configuración de cuenta</p>

      <div className={styles.perfilLayout}>
        <div className={styles.perfilCard}>
          <div className={styles.avatar}>
            {nombre ? nombre.charAt(0).toUpperCase() : 'U'}
            <Tooltip title="Cambiar foto"><button className={styles.avatarEditBtn} type="button" onClick={() => setIsAvatarOpen(true)}>
              <Edit2 size={14} />
            </button></Tooltip>
          </div>
          <div className={styles.perfilName}>{nombre || 'Cargando...'}</div>
          <div className={styles.perfilEmail}>{email}</div>
          <div className={styles.rolTag}>
            <StatusBadge status={user?.role === 'admin' ? 'Administrador' : user?.role === 'asesor' ? 'Asesor de Ventas' : 'Usuario'} dot />
          </div>
          <div className={styles.perfilStats}>
            <div className={styles.perfilStat}>
              <div className={styles.perfilStatValue}>{clientCount}</div>
              <div className={styles.perfilStatLabel}>Clientes</div>
            </div>
            <div className={styles.perfilStat}>
              <div className={styles.perfilStatValue}>{orderCount}</div>
              <div className={styles.perfilStatLabel}>Pedidos</div>
            </div>
          </div>
        </div>

        <div className={styles.perfilForm}>
          <div className={styles.perfilFormSection}>
            <div className={styles.perfilFormSectionTitle}>
              <Edit2 size={16} />
              Información Personal
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre completo</label>
                <input
                  type="text"
                  className={styles.input}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Teléfono</label>
                <input
                  type="text"
                  className={styles.input}
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.perfilFormSection}>
            <div className={styles.perfilFormSectionTitle}>
              <Lock size={16} />
              Cambiar Contraseña
            </div>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="******"
                  value={passwordActual}
                  onChange={e => setPasswordActual(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Mínimo 8 caracteres"
                  value={passwordNueva}
                  onChange={e => setPasswordNueva(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirmar nueva contraseña</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Repite la nueva contraseña"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.perfilFormSection}>
            <div className={styles.perfilFormSectionTitle}>Datos de acceso</div>
            <div className={styles.readOnlyField}>
              <label className={styles.readOnlyLabel}>Email</label>
              <div className={styles.readOnlyValue}>{email}</div>
              <div className={styles.readOnlyNote}>
                El email es tu identificador de acceso y no puede cambiarse
              </div>
            </div>
            <div style={{ height: '16px' }} />
            <div className={styles.readOnlyField}>
              <label className={styles.readOnlyLabel}>Rol del sistema</label>
              <div className={styles.readOnlyValue}>{user?.role === 'asesor' ? 'Asesor de Ventas' : user?.role === 'admin' ? 'Administrador' : 'Usuario'}</div>
              <div className={styles.readOnlyNote}>
                Los roles son asignados por el administrador
              </div>
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className={styles.formActions}>
            <Button onClick={guardarCambios}>
              <Check size={16} />
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>

      <Modal open={isAvatarOpen} onClose={() => setIsAvatarOpen(false)} title="Cambiar foto de perfil" size="sm">
        <div className="grid gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-3xl font-bold text-white">
              {nombre.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text-primary)]">Imagen actual</div>
              <div className="text-sm text-[var(--color-text-secondary)]">{avatarName || 'No hay imagen cargada en esta sesión'}</div>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setAvatarName(file.name);
              toast.success(`Foto seleccionada: ${file.name}`);
            }
            e.target.value = '';
          }} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsAvatarOpen(false)}>Cancelar</Button>
            <Button onClick={() => { fileInputRef.current?.click(); }}>
              <ImageIcon size={16} />
              Seleccionar imagen
            </Button>
            {avatarName && (
              <Button variant="success" onClick={() => { toast.success('Foto de perfil actualizada'); setIsAvatarOpen(false); }}>
                <User size={16} />
                Aplicar foto
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
