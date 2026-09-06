import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, User, ShieldCheck } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '../../../shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '../../../shared/ui/DataTable';
import { Modal } from '../../../shared/ui/Modal';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import s from './Clientes.module.css';
import f from '@/styles/Form.module.css';
import { authApi, type BackendAuthUser } from '@/infrastructure/api/authApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

  interface ClienteUI extends BackendAuthUser {
  telefono?: string | null;
  nit?: string | null;
  isTrustedCustomer?: boolean;
  estadoCliente?: 'Activo' | 'Inactivo';
  customerId?: string;
  apellidos?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  cupoTotal?: number;
  cupoUsado?: number;
  deudaVencida?: number;
  pedidosCount?: number;
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

  const formRef = useRef<HTMLFormElement>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const customers = await customersApi.list({ limit: 100 });
      const usersResult = await authApi.listUsers({ limit: 100 });
      const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const usersByEmail = new Map<string, BackendAuthUser>();
      const usersByNombre = new Map<string, BackendAuthUser>();
      for (const u of usersResult.data) {
        if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
        usersByNombre.set(normalize(u.nombre), u);
      }
      const clientesConDatos = customers.data.map((c) => {
        const user = usersByEmail.get(c.email?.toLowerCase() ?? '') ?? usersByNombre.get(normalize(c.nombre ?? ''));
        return {
          ...c,
          ...user,
          telefono: user?.telefono ?? c.tel ?? null,
          nit: user?.numeroDocumento ?? c.nit ?? null,
          isTrustedCustomer: c.isTrustedCustomer ?? false,
          estadoCliente: c.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
          customerId: c.id,
          apellidos: c.apellidos || user?.apellidos || null,
          direccion: user?.direccion ?? c.ciudad ?? null,
          tipoDocumento: user?.tipoDocumento ?? null,
          numeroDocumento: user?.numeroDocumento ?? c.nit ?? null,
          cupoTotal: c.cupoTotal,
          cupoUsado: c.cupoUsado,
          deudaVencida: c.deudaVencida,
          pedidosCount: c.pedidos,
          id: c.id,
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
      });
      await reload();
      toast.success('Cliente creado');
      closeModal();
    } catch {
      toast.error('No se pudo crear el cliente');
    }
  };

  const columns: DataTableColumn<ClienteUI>[] = [
    { key: 'id', header: 'ID', width: '110px', sortable: true, render: (c) => (
      <span title={c.id} style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{c.id}</span>
    )},
    { key: 'nombre', header: 'Nombre', sortable: true, render: (c) => c.nombre ?? '—' },
    { key: 'apellidos', header: 'Apellido', render: (c) => c.apellidos ?? '—' },
    { key: 'email', header: 'Email', sortable: true, render: (c) => c.email ?? '—' },
    { key: 'telefono', header: 'Teléfono', width: '120px', render: (c) => c.telefono ?? '—' },
    { key: 'tipoDocumento', header: 'Tipo documento', width: '120px', render: (c) => c.tipoDocumento ?? '—' },
    { key: 'nit', header: 'Número documento', width: '130px', render: (c) => c.nit ?? '—' },
    {
      key: 'isTrustedCustomer',
      header: 'Cliente de confianza',
      width: '120px',
      render: (c) => (
        <StatusBadge status={c.isTrustedCustomer ? 'Sí' : 'No'} />
      ),
    },
    {
      key: 'estadoCliente',
      header: 'Estado',
      width: '100px',
      sortable: true,
      render: (c) => (
        <StatusBadge status={c.estadoCliente ?? 'Activo'} />
      ),
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
          <h4 className={s.detailSectionTitle}>Información básica</h4>
          <div className={s.detailGrid}>
            <div className={s.detailItem}><span className={s.detailLabel}>ID</span><span>{item.id}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Nombre</span><span>{item.nombre}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Apellido</span><span>{item.apellidos || '—'}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Email</span><span>{item.email || '—'}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Teléfono</span><span>{item.telefono || '—'}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>NIT</span><span>{item.nit || '—'}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Rol</span><span>{item.role}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Cliente de confianza</span><span>{item.isTrustedCustomer ? 'Sí' : 'No'}</span></div>
            {item.isTrustedCustomer && (
              <>
                <div className={s.detailItem}><span className={s.detailLabel}>Cupo total</span><span>${(item.cupoTotal ?? 0).toLocaleString('es-CO')}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Cupo usado</span><span>${(item.cupoUsado ?? 0).toLocaleString('es-CO')}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Deuda vencida</span><span>${(item.deudaVencida ?? 0).toLocaleString('es-CO')}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Pedidos</span><span>{item.pedidosCount ?? 0}</span></div>
              </>
            )}
          </div>
        </div>
        <ModalFooter
          actions={[{ label: 'Cerrar', variant: 'secondary', onClick: closeModal }]} />

      </div>
    ),
  };

  const actions: DataTableAction<ClienteUI>[] = [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: openEdit },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, onClick: (item) => setDeleteConfirm(item), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Clientes</h1>
          <p className={s.pageSubtitle}>Gestión de usuarios con rol Cliente</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo Cliente
        </Button>
      </div>

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

      <DataTable enableExport={false} enableRowSelection={false}
        data={filteredClientes}
        columns={columns}
        detailPanel={detailPanel}
        actions={actions}
        enableSorting
        enableColumnFilters

        emptyMessage={loading ? 'Cargando clientes...' : error ? error : 'Sin resultados'}
        serverMode={false}
      />

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
