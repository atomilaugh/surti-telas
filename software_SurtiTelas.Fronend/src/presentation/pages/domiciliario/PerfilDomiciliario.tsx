import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Check, Image as ImageIcon, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import s from './PerfilDomiciliario.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Tooltip } from '@/shared/components/Tooltip';
import { authApi } from '@/infrastructure/api/authApi';
import { useAuthStore } from '@/core/stores/authStore';
import { isValidPhone } from '@/shared/utils/phone';

export const DomiciliarioPerfil: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const profile = await authApi.me();
        setNombre(profile.nombre);
        setTelefono(profile.telefono ?? '');
        setEmail(profile.email);
        setAvatarName(profile.nombre);
      } catch {
        setLoadError('No se pudo cargar el perfil. Intenta nuevamente.');
        toast.error('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
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
    if (!isValidPhone(telefono)) {
      setFormError('Ingresa un teléfono válido.');
      return false;
    }
    return true;
  };

  const guardarCambios = async () => {
    if (!validarPerfil()) return;
    setSaving(true);
    try {
      await authApi.updateProfile({ nombre, telefono });
      if (user) {
        useAuthStore.setState({ user: { ...user, name: nombre } });
      }
      toast.success('Cambios guardados correctamente');
    } catch {
      toast.error('No fue posible guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={s.pageTitle}>Cargando perfil...</div>;
  }

  if (loadError) {
    return (
      <div>
        <h1 className={s.pageTitle}>Mi Perfil</h1>
        <p className={s.pageSubtitle}>Datos personales y configuración de cuenta</p>
        <div className={s.errorState}>
          <AlertCircle size={28} />
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.pageTitle}>Mi Perfil</h1>
      <p className={s.pageSubtitle}>Datos personales y configuración de cuenta</p>

      <div className={s.perfilLayout}>
        <div className={s.perfilCard}>
          <div className={s.avatar}>
            {nombre ? nombre.charAt(0).toUpperCase() : 'U'}
            <Tooltip title="Cambiar foto"><button className={s.avatarEditBtn} type="button" onClick={() => setIsAvatarOpen(true)}>
              <Edit2 size={14} />
            </button></Tooltip>
          </div>
          <div className={s.perfilName}>{nombre || 'Cargando...'}</div>
          <div className={s.perfilEmail}>{email}</div>
          <div className={s.rolTag}>
            <StatusBadge status={user?.role === 'domiciliario' ? 'Domiciliario' : 'Usuario'} dot />
          </div>
        </div>

        <div className={s.perfilForm}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>
              <Edit2 size={16} />
              Información Personal
            </h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Nombre completo</label>
                <input
                  type="text"
                  className={f.input}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Teléfono</label>
                <input
                  type="text"
                  className={f.input}
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos de acceso</h3>
            <div className={s.readOnlyField}>
              <label className={s.readOnlyLabel}>Email</label>
              <div className={s.readOnlyValue}>{email}</div>
              <div className={s.readOnlyNote}>
                El email es tu identificador de acceso y no puede cambiarse
              </div>
            </div>
            <div style={{ height: '16px' }} />
            <div className={s.readOnlyField}>
              <label className={s.readOnlyLabel}>Rol del sistema</label>
              <div className={s.readOnlyValue}>Domiciliario</div>
              <div className={s.readOnlyNote}>
                Los roles son asignados por el administrador
              </div>
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {formError}
            </div>
          )}

          <div className={f.formActions}>
            <Button onClick={guardarCambios} loading={saving}>
              <Check size={16} />
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>

      <Modal open={isAvatarOpen} onClose={() => setIsAvatarOpen(false)} title="Cambiar foto de perfil" size="sm">
        <div className="grid gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-info)] text-3xl font-bold text-white">
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
