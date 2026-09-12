import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import s from '../cliente/PerfilCliente.module.css';
import f from '@/styles/Form.module.css';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Tooltip } from '@/shared/components/Tooltip';
import { Edit2, Save, AlertCircle } from 'lucide-react';
import { authApi } from '@/infrastructure/api/authApi';
import { useAuthStore } from '@/core/stores/authStore';
import { isValidPhone } from '@/shared/utils/phone';

const DOCUMENT_TYPES = [
  'DNI',
  'Cédula',
  'Pasaporte',
  'RUC',
  'Carné de extranjería',
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  almacen: 'Almacén',
  asesor: 'Asesor',
  domiciliario: 'Domiciliario',
  cliente: 'Cliente',
  produccion: 'Producción',
  reportes: 'Reportes',
};

export const PanelPerfil: React.FC = () => {
  const authUser = useAuthStore((s) => s.user);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const profile = await authApi.me();
        setNombre(profile.nombre);
        setTelefono(profile.telefono ?? '');
        setDireccion(profile.direccion ?? '');
        setTipoDocumento(profile.tipoDocumento ?? '');
        setNumeroDocumento(profile.numeroDocumento ?? '');
        setEmail(profile.email);
        setAvatarUrl(profile.avatar ?? '');
      } catch {
        setLoadError('No se pudo cargar el perfil. Intenta nuevamente.');
        toast.error('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const roleLabel = ROLE_LABELS[authUser?.role ?? ''] ?? authUser?.role ?? 'Usuario';

  const validarPerfil = () => {
    setFormError('');
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return false;
    }
    if (!email.trim()) {
      setFormError('El correo electrónico es obligatorio.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Ingresa un correo válido.');
      return false;
    }
    if (telefono && !isValidPhone(telefono)) {
      setFormError('Ingresa un teléfono válido.');
      return false;
    }
    if (password && password !== passwordConfirm) {
      setFormError('La contraseña y su confirmación deben coincidir.');
      return false;
    }
    return true;
  };

  const guardarCambios = async () => {
    if (!validarPerfil()) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof authApi.updateProfile>[0] = {
        nombre,
        telefono,
        email,
        direccion,
        tipoDocumento,
        numeroDocumento,
      };
      if (password) {
        payload.password = password;
      }
      const updated = await authApi.updateProfile(payload);
      if (authUser) {
        useAuthStore.setState({ user: { ...authUser, name: updated.nombre, email: updated.email } });
      }
      toast.success('Cambios guardados correctamente');
      setPassword('');
      setPasswordConfirm('');
      setAvatarModalOpen(false);
    } catch {
      toast.error('No fue posible guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const abrirEditarAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarModalOpen(true);
  };

  const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview('');
    }
  };

  const guardarAvatar = async () => {
    if (!avatarFile) {
      toast.error('Selecciona una imagen primero');
      return;
    }
    setSaving(true);
    try {
      const updated = await authApi.uploadAvatar(avatarFile);
      const newAvatar = updated.avatar ?? '';
      setAvatarUrl(newAvatar);
      setAvatarPreview('');
      setAvatarFile(null);
      setAvatarModalOpen(false);
      if (authUser) {
        useAuthStore.setState({ user: { ...authUser, avatar: newAvatar } });
      }
      toast.success('Foto de perfil actualizada');
    } catch {
      toast.error('No fue posible actualizar la foto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={s.pageTitle}>Cargando perfil...</div>;
  }

  if (loadError) {
    return (
      <div className={s.pageContainer}>
        <div className={s.pageTitle}>Mi perfil</div>
        <div className={s.errorState}>
          <AlertCircle size={28} />
          <span>{loadError}</span>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Mi perfil</h1>
          <p className={s.pageSubtitle}>Actualiza tu información personal y administra tu cuenta.</p>
        </div>
        <div className={s.headerBadgeRow}>
          <Badge variant="info" dot>{roleLabel}</Badge>
        </div>
      </div>

      <div className={s.perfilLayout}>
        <aside className={s.perfilCard}>
          <div className={s.avatar}>
            {avatarUrl || avatarPreview ? (
              <img src={avatarUrl || avatarPreview} alt="Avatar" className={s.avatarImage} />
            ) : (
              nombre.charAt(0).toUpperCase()
            )}
            <Tooltip title="Cambiar foto">
              <button className={s.avatarEditBtn} type="button" onClick={abrirEditarAvatar}>
                <Edit2 size={14} />
              </button>
            </Tooltip>
          </div>
          <div className={s.perfilName}>{nombre}</div>
          <div className={s.perfilEmail}>{email}</div>
          <div className={s.rolTag}>
            <Badge variant="info" dot>{roleLabel}</Badge>
          </div>
          <div className={s.cardSummary}>
            <div className={s.summaryItem}>
              <span>Teléfono</span>
              <strong>{telefono || '-'}</strong>
            </div>
            <div className={s.summaryItem}>
              <span>Documento</span>
              <strong>{tipoDocumento ? `${tipoDocumento} · ${numeroDocumento}` : '-'}</strong>
            </div>
            <div className={s.summaryItem}>
              <span>Dirección</span>
              <strong>{direccion || '-'}</strong>
            </div>
          </div>
        </aside>

        <form onSubmit={(e) => { e.preventDefault(); void guardarCambios(); }}>
          <div className={s.perfilSection}>
            <div className={s.perfilSectionHeader}>
              <div className={s.perfilSectionTitle}>Información personal</div>
              <div className={s.sectionNote}>Tus datos se utilizan para tu gestión diaria en el sistema.</div>
            </div>
            <div className={s.perfilSectionBody}>
              <div className={s.formGrid2}>
                <div className={s.formField}>
                  <label className={s.formLabel}>Nombre completo</label>
                  <input
                    type="text"
                    className={s.formInput}
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                  />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Correo electrónico</label>
                  <input
                    type="email"
                    className={s.formInput}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className={s.formGrid2}>
                <div className={s.formField}>
                  <label className={s.formLabel}>Teléfono</label>
                  <input
                    type="text"
                    className={s.formInput}
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                  />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Dirección</label>
                  <input
                    type="text"
                    className={s.formInput}
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                  />
                </div>
              </div>
              <div className={s.formGrid2}>
                <div className={s.formField}>
                  <label className={s.formLabel}>Tipo de documento</label>
                  <select
                    className={s.formInput}
                    value={tipoDocumento}
                    onChange={e => setTipoDocumento(e.target.value)}
                  >
                    <option value="">Selecciona un documento</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Número de documento</label>
                  <input
                    type="text"
                    className={s.formInput}
                    value={numeroDocumento}
                    onChange={e => setNumeroDocumento(e.target.value)}
                  />
                </div>
              </div>
              <div className={s.formGrid2}>
                <div className={s.formField}>
                  <label className={s.formLabel}>Contraseña nueva</label>
                  <input
                    type="password"
                    className={s.formInput}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Dejar en blanco para no cambiar"
                  />
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Confirmar contraseña</label>
                  <input
                    type="password"
                    className={s.formInput}
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>
            </div>
          </div>

          {formError && (
            <div className={s.formError}>{formError}</div>
          )}

          <div className={s.formActions}>
            <Button type="submit" loading={saving} leftIcon={<Save size={16} />}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>

      <Modal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} title="Cambiar foto de perfil" size="sm">
        <div className="grid gap-4">
          <div className="flex h-20 w-20 items-center overflow-hidden rounded-2xl bg-[var(--color-accent)]">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                {nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={f.field}>
            <label className={f.label}>Selecciona una imagen</label>
            <input className={f.input} type="file" accept="image/*" onChange={onAvatarFileChange} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAvatarModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardarAvatar} loading={saving}>Guardar foto</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
