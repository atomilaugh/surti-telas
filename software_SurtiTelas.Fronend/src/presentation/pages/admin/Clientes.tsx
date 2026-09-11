import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, User, ShieldCheck, Eye, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '../../../shared/ui/DataTable';
import { TableActionsMenu, TableAction } from '../../../shared/ui/TableActionsMenu';
import { Modal } from '../../../shared/ui/Modal';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import s from './Clientes.module.css';
import f from '@/styles/Form.module.css';
import { customersApi } from '@/infrastructure/api/customersApi';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { useAuthStore } from '@/core/stores/authStore';
import { hasPermission } from '@/presentation/routes/protectedRouteHelpers';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface ClienteUI {
  id: string;
  nombre: string;
  apellidos?: string | null;
  email: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  nit?: string | null;
  rol?: string | null;
  cupoTotal?: number;
  cupoUsado?: number;
  deudaVencida?: number;
  pedidosCount?: number;
  isTrustedCustomer?: boolean;
  estadoCliente?: 'Activo' | 'Inactivo';
  customerId?: string;
}

export const AdminClientes: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteUI | null>(null);
  const [items, setItems] = useState<ClienteUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClienteUI | null>(null);

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [isTrustedCustomer, setIsTrustedCustomer] = useState(false);
  const [showTrustedOnly, setShowTrustedOnly] = useState(false);
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const customers = await customersApi.list({ limit: 100 });
      const perms = useAuthStore.getState().user?.permissions ?? [];
      const canReadUsers = hasPermission(perms, 'users:read');
      const users = canReadUsers ? await usersApi.list({ limit: 100 }) : [];
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const usersByEmail = new Map<string, Usuario>();
      const usersByNombre = new Map<string, Usuario>();
      for (const u of users) {
        if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
        usersByNombre.set(normalize(u.nombre), u);
      }
      const clientesConDatos = customers.data.map((c) => {
        const user = usersByEmail.get(c.email?.toLowerCase() ?? '') ?? usersByNombre.get(normalize(c.nombre ?? ''));
        return {
          id: c.id,
          nombre: c.nombre,
          apellidos: c.apellidos || user?.apellidos || null,
          email: c.email || user?.email || '',
          telefono: user?.telefono ?? c.tel ?? null,
          direccion: user?.direccion ?? null,
          tipoDocumento: user?.tipoDocumento ?? null,
          numeroDocumento: user?.numeroDocumento ?? c.nit ?? null,
          nit: user?.numeroDocumento ?? c.nit ?? null,
          rol: user?.rol ?? null,
          isTrustedCustomer: c.isTrustedCustomer ?? false,
          estadoCliente: c.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
          customerId: c.id,
          cupoTotal: c.cupoTotal,
          cupoUsado: c.cupoUsado,
          deudaVencida: c.deudaVencida,
          pedidosCount: c.pedidos,
        } as ClienteUI;
      });
      setItems(clientesConDatos);
    } catch (_e) {
      setError('No se pudo cargar la lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filteredClientes = items.filter((c) => {
    if (showTrustedOnly && !c.isTrustedCustomer) return false;
    const term = debouncedSearch.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  const openCreate = () => {
    setSelectedCliente(null);
    setNombre('');
    setApellidos('');
    setEmail('');
    setTelefono('');
    setDireccion('');
    setTipoDocumento('');
    setNumeroDocumento('');
    setIsTrustedCustomer(false);
    setEstado('Activo');
    setPassword('');
    setConfirmPassword('');
    setModalOpen(true);
  };

  const openEdit = (cliente: ClienteUI) => {
    setSelectedCliente(cliente);
    setNombre(cliente.nombre ?? '');
    setApellidos(cliente.apellidos ?? '');
    setEmail(cliente.email ?? '');
    setTelefono(cliente.telefono ?? '');
    setDireccion(cliente.direccion ?? '');
    setTipoDocumento(cliente.tipoDocumento ?? '');
    setNumeroDocumento(cliente.numeroDocumento ?? '');
    setIsTrustedCustomer(cliente.isTrustedCustomer ?? false);
    setEstado(cliente.estadoCliente ?? 'Activo');
    setPassword('');
    setConfirmPassword('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedCliente(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const customerId = deleteConfirm.customerId || deleteConfirm.id;
      await customersApi.remove(customerId);
      setItems((prev) => prev.filter((it) => (it.customerId || it.id) !== customerId));
      toast.success('Cliente eliminado');
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar el cliente');
    }
  };

  const validTipoDocumento = (value: string): value is 'CC' | 'NIE' | 'PASSPORT' | 'CE' | 'OTHER' =>
    ['CC', 'NIE', 'PASSPORT', 'CE', 'OTHER'].includes(value);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!apellidos) {
      toast.error('El apellido es obligatorio');
      return;
    }
    if (!validTipoDocumento(tipoDocumento)) {
      toast.error('Selecciona un tipo de documento válido');
      return;
    }

    if (selectedCliente) {
      try {
        const customerId = selectedCliente.customerId;
        if (customerId) {
          await customersApi.update(customerId, {
            nombre,
            apellidos,
            email,
            tel: telefono,
            nit: numeroDocumento,
            direccion,
            tipoDocumento: tipoDocumento || undefined,
            isTrustedCustomer,
            estado,
          });
          setItems((prev) =>
            prev.map((it) => (it.id === customerId ? {
              ...it,
              nombre,
              apellidos,
              email: email ?? it.email,
              telefono: telefono ?? it.telefono,
              nit: numeroDocumento ?? it.nit,
              direccion: direccion ?? it.direccion,
              tipoDocumento: tipoDocumento ?? it.tipoDocumento,
              isTrustedCustomer,
              estadoCliente: estado,
            } : it))
          );
          toast.success('Cliente actualizado');
        } else {
          await customersApi.create({
            nombre,
            apellidos,
            email,
            tel: telefono,
            nit: numeroDocumento,
            direccion,
            tipoDocumento: tipoDocumento || undefined,
            isTrustedCustomer,
            estado,
          });
          await reload();
          toast.success('Cliente creado');
        }
        closeModal();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo guardar el cliente';
        toast.error(message);
      }
      return;
    }

    if (!email) {
      toast.error('Correo es obligatorio');
      return;
    }
    if (!password) {
      toast.error('Contraseña es obligatoria');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      await customersApi.create({
        nombre,
        apellidos,
        email,
        tel: telefono,
        nit: numeroDocumento,
        direccion,
        tipoDocumento: tipoDocumento || undefined,
        isTrustedCustomer,
        estado,
        password,
      });
      await reload();
      toast.success('Cliente creado');
      closeModal();
    } catch {
      toast.error('No se pudo crear el cliente');
    }
  };

  const columns: DataTableColumn<ClienteUI>[] = [
    { key: 'id', header: 'ID', width: '110px', minWidth: '100px', sortable: true, render: (c) => (
      <span title={c.id} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', lineHeight: '1.2' }}>{c.id}</span>
    )},
    { key: 'nombre', header: 'Nombre', minWidth: '160px', sortable: true, render: (c) => <span className={s.tdClientPrimary} title={c.nombre ?? '—'}>{c.nombre ?? '—'}</span> },
    { key: 'email', header: 'Email', minWidth: '220px', sortable: true, render: (c) => <span className={s.tdClientPrimary} title={c.email ?? '—'}>{c.email ?? '—'}</span> },
    { key: 'telefono', header: 'Teléfono', width: '130px', minWidth: '115px', render: (c) => c.telefono ?? '—' },
    { key: 'apellidos', header: 'Apellido', width: '140px', minWidth: '120px', render: (c) => <span title={c.apellidos ?? '—'}>{c.apellidos ?? '—'}</span>, hidden: true },
    { key: 'tipoDocumento', header: 'Tipo documento', width: '150px', minWidth: '130px', render: (c) => c.tipoDocumento ?? '—', hidden: true },
    { key: 'nit', header: 'Número documento', width: '170px', minWidth: '145px', render: (c) => c.nit ?? '—', hidden: true },
    {
      key: 'isTrustedCustomer',
      header: 'Cliente de confianza',
      width: '160px',
      minWidth: '140px',
      render: (c) => (
        <StatusBadge status={c.isTrustedCustomer ? 'Sí' : 'No'} />
      ),
      hidden: true,
    },
    {
      key: 'estadoCliente',
      header: 'Estado',
      width: '120px',
      minWidth: '105px',
      sortable: true,
      render: (c) => (
        <StatusBadge status={c.estadoCliente ?? 'Activo'} />
      ),
      hidden: true,
    },
  ];

  const detailPanel: DataTableDetailPanel<ClienteUI> = {
    title: (item) => `Cliente: ${item.nombre}`,
    size: 'lg',
    header: (item) => ({
      icon: <User size={18} aria-hidden="true" focusable="false" />,
      title: 'Cliente',
      code: item.id,
      subtitle: item.email ?? '',
      status: item.estadoCliente ?? 'Activo',
      badgeVariant: item.estadoCliente === 'Inactivo' ? 'default' : 'success',
    }),
    render: (item) => (
      <div className={s.detailModalContent}>
        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Información personal</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Nombre</span>
              <span className={s.detailFieldValue}>{item.nombre || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Apellido</span>
              <span className={s.detailFieldValue}>{item.apellidos || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Email</span>
              <span className={s.detailFieldValue}>{item.email || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Teléfono</span>
              <span className={s.detailFieldValue}>{item.telefono || '—'}</span>
            </div>
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Identificación</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Tipo de documento</span>
              <span className={s.detailFieldValue}>{item.tipoDocumento || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Número de documento</span>
              <span className={s.detailFieldValue}>{item.numeroDocumento || item.nit || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>NIT</span>
              <span className={s.detailFieldValue}>{item.nit || '—'}</span>
            </div>
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Información de cuenta</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Rol</span>
               <span className={s.detailFieldValue}>{item.rol || '—'}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Estado</span>
              <span className={s.detailFieldValue}>
                <StatusBadge status={item.estadoCliente ?? 'Activo'} />
              </span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Cliente de confianza</span>
              <span className={s.detailFieldValue}>
                <StatusBadge status={item.isTrustedCustomer ? 'Sí' : 'No'} />
              </span>
            </div>
          </div>
        </div>

        {item.isTrustedCustomer && (
          <div className={s.detailSection}>
            <div className={s.detailSectionTitle}>Información comercial</div>
            <div className={s.detailGrid}>
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Cupo total</span>
                <span className={s.detailFieldValue}>${(item.cupoTotal ?? 0).toLocaleString('es-CO')}</span>
              </div>
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Cupo usado</span>
                <span className={s.detailFieldValue}>${(item.cupoUsado ?? 0).toLocaleString('es-CO')}</span>
              </div>
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Deuda vencida</span>
                <span className={s.detailFieldValue}>${(item.deudaVencida ?? 0).toLocaleString('es-CO')}</span>
              </div>
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Pedidos</span>
                <span className={s.detailFieldValue}>{item.pedidosCount ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
  };

  const actions: DataTableAction<ClienteUI>[] = [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: openEdit },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, onClick: (item) => setDeleteConfirm(item), danger: true },
  ];

  const actionsCellRenderer = useCallback((item: ClienteUI, rowActions: { primaryAction?: TableAction; actions: TableAction[] }, openDetail: (item: ClienteUI) => void) => {
    return (
      <div className={s.actionsCell}>
        <button
          type="button"
          className={s.viewDetailBtn}
          onClick={(e) => {
            e.stopPropagation();
            openDetail(item);
          }}
          aria-label="Ver detalle"
        >
          <Eye size={15} />
          <span className={s.viewDetailLabel}>Ver detalle</span>
        </button>
        <TableActionsMenu
          align="right"
          trigger={
            <button
              type="button"
              className={s.moreActionsBtn}
              aria-label="Más acciones"
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          }
          primaryAction={rowActions.primaryAction}
          actions={rowActions.actions}
        />
      </div>
    );
  }, []);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Clientes</h1>
          <p className={s.pageSubtitle}>Gestión de usuarios con rol Cliente</p>
        </div>
        <div className={s.headerActions}>
          <Button onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus size={18} />
            <span>Nuevo cliente</span>
          </Button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.toolbar}>
          <SearchInput
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => setSearch(value)}
            debounceMs={100}
            minChars={0}
          />
          <label className={s.trustedFilterLabel} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTrustedOnly}
              onChange={(e) => setShowTrustedOnly(e.target.checked)}
            />
            <ShieldCheck size={16} /> Clientes de confianza
          </label>
        </div>

        <div className={s.tableScroll}>
          <DataTable enableExport={false} enableRowSelection={false}
            data={filteredClientes}
            columns={columns}
            detailPanel={detailPanel}
            actions={actions}
            actionsCellRenderer={actionsCellRenderer}
            maxVisibleColumns={4}
            enableSorting
            enableColumnFilters

            emptyMessage={loading ? 'Cargando clientes...' : error ? error : 'Sin resultados'}
            serverMode={false}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="lg"
      >
        <form className={f.form} ref={formRef} onSubmit={handleSubmit}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos personales</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="nombre">Nombre *</label>
                <input id="nombre" type="text" className={f.input} name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={100} autoComplete="given-name" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="apellidos">Apellidos *</label>
                <input id="apellidos" type="text" className={f.input} name="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required maxLength={100} autoComplete="family-name" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="email">Email {selectedCliente ? '' : '*'}</label>
                <input id="email" type="email" className={f.input} name="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!selectedCliente} maxLength={100} autoComplete="email" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="telefono">Teléfono</label>
                <input id="telefono" type="tel" className={f.input} name="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={11} pattern="[0-9]*" inputMode="numeric" autoComplete="tel" />
              </div>
            </div>
            {!selectedCliente && (
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label} htmlFor="password">Contraseña *</label>
                  <input id="password" type="password" className={f.input} name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>
                <div className={f.field}>
                  <label className={f.label} htmlFor="confirmPassword">Confirmar contraseña *</label>
                  <input id="confirmPassword" type="password" className={f.input} name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>
              </div>
            )}
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Documento y dirección</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="tipoDocumento">Tipo de documento *</label>
                <select id="tipoDocumento" className={f.select} name="tipoDocumento" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="NIE">NIE</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="numeroDocumento">Número de documento *</label>
                <input id="numeroDocumento" type="text" className={f.input} name="numeroDocumento" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} required maxLength={20} inputMode="numeric" />
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label} htmlFor="direccion">Dirección</label>
              <input id="direccion" type="text" className={f.input} name="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} autoComplete="street-address" />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Estado</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="estado">Estado</label>
                <select id="estado" className={f.select} name="estado" value={estado} onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <div className={f.field} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                <input type="checkbox" id="isTrustedCustomer" name="isTrustedCustomer" checked={isTrustedCustomer} onChange={(e) => setIsTrustedCustomer(e.target.checked)} />
                <label htmlFor="isTrustedCustomer" className={f.label} style={{ margin: 0 }}>Cliente de confianza</label>
              </div>
            </div>
          </div>

          <ModalFooter
            actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: closeModal }, { label: selectedCliente ? 'Guardar cambios' : 'Crear cliente' , type: 'submit' }]} />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
