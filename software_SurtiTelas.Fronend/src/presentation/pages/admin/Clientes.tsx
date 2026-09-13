import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Eye, Edit3, Trash2, Search, RefreshCw, User, Mail, Phone, MapPin, AlertTriangle, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { customersApi } from '@/infrastructure/api/customersApi';
import { usersApi } from '@/infrastructure/api/usersApi';
import type { Cliente } from '@/core/types';
import s from "./Clientes.module.css";
import f from '@/styles/Form.module.css';

export const AdminClientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'Activo' | 'Inactivo'>('TODOS');
  const [asesorFilter, setAsesorFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [asesores, setAsesores] = useState<{ id: string; nombre: string }[]>([]);
  const [loadingAsesores, setLoadingAsesores] = useState(false);

const [formValues, setFormValues] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    ciudad: '',
    tel: '',
    nit: '',
    direccion: '',
    tipoDocumento: 'CC' as 'CC' | 'NIE' | 'PASSPORT' | 'CE' | 'OTHER',
    numeroDocumento: '',
    password: '',
    confirmPassword: '',
    cupoTotal: '',
    cupoUsado: '',
    deudaVencida: '',
    isTrustedCustomer: false,
    estado: 'Activo' as 'Activo' | 'Inactivo',
    asesorId: '',
  });

  const loadClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (estadoFilter !== 'TODOS') params.estado = estadoFilter;
      if (asesorFilter) params.asesorId = asesorFilter;

      const result = await customersApi.list(params);
      setClientes(result.data);
      setTotalPages(result.meta.totalPages ?? 1);
      setTotalItems(result.meta.totalRecords ?? 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar clientes';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, estadoFilter, asesorFilter]);

  useEffect(() => {
    void loadClientes();
  }, [loadClientes]);

const loadAsesores = useCallback(async () => {
    setLoadingAsesores(true);
    try {
      const result = await usersApi.list({ role: 'asesor', limit: 100 });
      setAsesores(result.map(u => ({ id: u.id, nombre: u.nombre })));
    } catch {
      setAsesores([]);
    } finally {
      setLoadingAsesores(false);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) {
      void loadAsesores();
    }
  }, [modalOpen, loadAsesores]);

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchesSearch = !search ||
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.tel?.includes(search) ||
        c.nit?.includes(search);
      const matchesEstado = estadoFilter === 'TODOS' || c.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [clientes, search, estadoFilter]);

  const stats = useMemo(() => ({
    total: totalItems,
    activos: clientes.filter(c => c.estado === 'Activo').length,
    inactivos: clientes.filter(c => c.estado === 'Inactivo').length,
    conDeuda: clientes.filter(c => (c.deudaVencida ?? 0) > 0).length,
  }), [clientes, totalItems]);

const resetForm = () => {
    setFormValues({
      nombre: '', apellidos: '', email: '', ciudad: '', tel: '', nit: '',
      direccion: '', tipoDocumento: 'CC', numeroDocumento: '',
      password: '', confirmPassword: '',
      cupoTotal: '', cupoUsado: '', deudaVencida: '',
      isTrustedCustomer: false, estado: 'Activo', asesorId: '',
    });
    setFormError(null);
  };

  const openCreate = () => {
    setEditingCliente(null);
    resetForm();
    setModalOpen(true);
  };

const openEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormValues({
      nombre: cliente.nombre,
      apellidos: cliente.apellidos ?? '',
      email: cliente.email ?? '',
      ciudad: cliente.ciudad ?? '',
      tel: cliente.tel ?? '',
      nit: cliente.nit ?? '',
      direccion: cliente.direccion ?? '',
      tipoDocumento: (cliente as unknown as { tipoDocumento?: string })?.tipoDocumento as 'CC' | 'NIE' | 'PASSPORT' | 'CE' | 'OTHER' ?? 'CC',
      numeroDocumento: (cliente as unknown as { numeroDocumento?: string })?.numeroDocumento ?? '',
      password: '',
      confirmPassword: '',
      cupoTotal: String(cliente.cupoTotal ?? 0),
      cupoUsado: String(cliente.cupoUsado ?? 0),
      deudaVencida: String(cliente.deudaVencida ?? 0),
      isTrustedCustomer: cliente.isTrustedCustomer ?? false,
      estado: cliente.estado,
      asesorId: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCliente(null);
    setSaving(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formValues.nombre.trim()) { setFormError('El nombre es obligatorio'); return; }
    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) { setFormError('Email inválido'); return; }

    setSaving(true);
    try {
const payload = {
        nombre: formValues.nombre.trim(),
        apellidos: formValues.apellidos.trim() || '',
        email: formValues.email.trim() || '',
        ciudad: formValues.ciudad.trim() || '',
        tel: formValues.tel.trim() || '',
        nit: formValues.numeroDocumento.trim() || '',
        direccion: formValues.direccion.trim() || '',
        tipoDocumento: formValues.tipoDocumento,
        cupoTotal: Number(formValues.cupoTotal) || 0,
        cupoUsado: Number(formValues.cupoUsado) || 0,
        deudaVencida: Number(formValues.deudaVencida) || 0,
        isTrustedCustomer: formValues.isTrustedCustomer,
        estado: formValues.estado,
        asesorId: formValues.asesorId || undefined,
      };

      if (editingCliente) {
        await customersApi.update(editingCliente.id, payload);
        setClientes(prev => prev.map(c => c.id === editingCliente.id ? { ...c, ...payload } : c));
        toast.success(`Cliente ${editingCliente.nombre} actualizado`);
      } else {
        const created = await customersApi.create(payload);
        setClientes(prev => [created, ...prev]);
        toast.success(`Cliente ${created.nombre} creado`);
      }
      closeModal();
      void loadClientes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cliente';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await customersApi.remove(deleteConfirm.id);
      setClientes(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast.success(`Cliente ${deleteConfirm.nombre} eliminado`);
      void loadClientes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar cliente');
    }
  };

  const handleToggleTrusted = async (cliente: Cliente) => {
    try {
      const newValue = !cliente.isTrustedCustomer;
      await customersApi.update(cliente.id, { isTrustedCustomer: newValue });
      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, isTrustedCustomer: newValue } : c));
      toast.success(`${cliente.nombre} ahora es ${newValue ? 'Cliente de Confianza' : ' cliente normal'}`);
      void loadClientes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const getEstadoBadge = (estado: string) => (
    <StatusBadge status={estado === 'Activo' ? 'success' : 'default'} label={estado} />
  );

  const columns = [
    { key: 'nombre', header: 'Nombre', sortable: true, render: (c: Cliente) => (
      <div className={s.nombreCell}>
        <span className={s.nombreMain}>{c.nombre} {c.apellidos ? ` ${c.apellidos}` : ''}</span>
        {c.nit && <span className={s.nit}>NIT: {c.nit}</span>}
      </div>
    )},
    { key: 'email', header: 'Email', render: (c: Cliente) => c.email ? (
      <a href={`mailto:${c.email}`} className={s.emailLink}><Mail size={14} /> {c.email}</a>
    ) : <span className={s.emptyText}>—</span> },
    { key: 'tel', header: 'Teléfono', render: (c: Cliente) => c.tel ? (
      <a href={`tel:${c.tel}`} className={s.phoneLink}><Phone size={14} /> {c.tel}</a>
    ) : <span className={s.emptyText}>—</span> },
    { key: 'ciudad', header: 'Ciudad', render: (c: Cliente) => c.ciudad ? (
      <span><MapPin size={14} className={s.icon} /> {c.ciudad}</span>
    ) : <span className={s.emptyText}>—</span> },
    { key: 'estado', header: 'Estado', width: '120px', sortable: true, filterable: true, filterType: 'select' as const, filterOptions: [
      { value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }
    ], render: (c: Cliente) => getEstadoBadge(c.estado) },
    { key: 'deudaVencida', header: 'Deuda Vencida', width: '130px', sortable: true, render: (c: Cliente) => (c.deudaVencida ?? 0) > 0 ? (
      <div className={s.deudaCell}><AlertTriangle size={14} className={s.icon} /> $ {new Intl.NumberFormat('es-CO').format(c.deudaVencida ?? 0)}</div>
    ) : <span className={s.emptyText}>—</span> },
    { key: 'pedidos', header: 'Pedidos', width: '80px', sortable: true, render: (c: Cliente) => (
      <span className={s.pedidosCount}>{c.pedidos ?? 0}</span>
    )},
  ];

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Clientes</h1>
          <p className={s.pageSubtitle}>{stats.total} clientes registrados</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>Nuevo Cliente</Button>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}><User size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.total}</div><div className={s.statLabel}>Total</div></div></div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}><CheckCircle size={20} className={s.statIconSuccess} /><div><div className={s.statValue}>{stats.activos}</div><div className={s.statLabel}>Activos</div></div></div>
        <div className={`${s.statCard} ${s.statCardWarning}`}><X size={20} className={s.statIconWarning} /><div><div className={s.statValue}>{stats.inactivos}</div><div className={s.statLabel}>Inactivos</div></div></div>
        <div className={`${s.statCard} ${s.statCardDanger}`}><AlertTriangle size={20} className={s.statIconDanger} /><div><div className={s.statValue}>{stats.conDeuda}</div><div className={s.statLabel}>Con Deuda</div></div></div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Buscar por nombre, email, teléfono, NIT..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={s.filterSelect} value={estadoFilter} onChange={e => setEstadoFilter(e.target.value as 'TODOS' | 'Activo' | 'Inactivo')}>
          <option value="TODOS">Todos los estados</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
        </select>
        <select className={s.filterSelect} value={asesorFilter} onChange={e => setAsesorFilter(e.target.value)}>
          <option value="">Todos los asesores</option>
          {asesores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={loadClientes} disabled={loading}>Actualizar</Button>
      </div>

      <div className={s.tableWrapper}>
        {loading && <div className={s.stateBox}><Loader2 size={28} className={s.spin} /><p>Cargando clientes...</p></div>}
        {error && <div className={`${s.stateBox} ${s.errorBox}`}><AlertCircle size={28} /><p>{error}</p></div>}
        {!loading && !error && (
          <DataTable<Cliente>
            data={filteredClientes}
            pageSize={pageSize}
            emptyMessage="No se encontraron clientes"
            maxVisibleColumns={8}
            enableRowSelection={false}
            serverMode
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            columns={columns}
actions={(c) => [
              { label: 'Ver', icon: <Eye size={14} />, onClick: () => openEdit(c) },
              { label: 'Editar', icon: <Edit3 size={14} />, onClick: () => openEdit(c) },
              {
                label: c.isTrustedCustomer ? 'Desactivar confianza' : 'Activar confianza',
                icon: (
                  <span
                    className={s.trustedSwitch}
                    data-active={c.isTrustedCustomer}
                    aria-hidden="true"
                  />
                ),
                iconClassName: s.trustedSwitchIcon,
                onClick: () => handleToggleTrusted(c)
              },
              { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(c), danger: true },
            ]}
          />
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'} description="Completa la información del cliente" size="xl" variant="form">
        <form onSubmit={handleSubmit} className={f.form}>
          {formError && <div className={f.formError}>{formError}</div>}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos Personales</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Nombre *</label>
                <input className={f.input} value={formValues.nombre} onChange={e => setFormValues({ ...formValues, nombre: e.target.value })} placeholder="Juan" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Apellidos *</label>
                <input className={f.input} value={formValues.apellidos} onChange={e => setFormValues({ ...formValues, apellidos: e.target.value })} placeholder="Pérez Gómez" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Email *</label>
                <input className={f.input} type="email" value={formValues.email} onChange={e => setFormValues({ ...formValues, email: e.target.value })} placeholder="juan@ejemplo.com" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Teléfono *</label>
                <input className={f.input} value={formValues.tel} onChange={e => setFormValues({ ...formValues, tel: e.target.value })} placeholder="+57 300 123 4567" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Ciudad</label>
                <input className={f.input} value={formValues.ciudad} onChange={e => setFormValues({ ...formValues, ciudad: e.target.value })} placeholder="Bogotá" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Dirección</label>
                <input className={f.input} value={formValues.direccion} onChange={e => setFormValues({ ...formValues, direccion: e.target.value })} placeholder="Calle 123 #45-67" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Documento de Identidad</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Tipo de documento *</label>
                <select className={f.select} value={formValues.tipoDocumento} onChange={e => setFormValues({ ...formValues, tipoDocumento: e.target.value as 'CC' | 'NIE' | 'PASSPORT' | 'CE' | 'OTHER' })}>
                  <option value="">Selecciona...</option>
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="NIE">NIE</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Número de documento *</label>
                <input className={f.input} value={formValues.numeroDocumento} onChange={e => setFormValues({ ...formValues, numeroDocumento: e.target.value })} placeholder="900123456" />
              </div>
            </div>
          </div>

          {!editingCliente && (
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Seguridad</h3>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Contraseña *</label>
                  <input className={f.input} type="password" value={formValues.password} onChange={e => setFormValues({ ...formValues, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Confirmar contraseña *</label>
                  <input className={f.input} type="password" value={formValues.confirmPassword} onChange={e => setFormValues({ ...formValues, confirmPassword: e.target.value })} placeholder="Repite la contraseña" />
                </div>
              </div>
            </div>
          )}

{formValues.isTrustedCustomer && (
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Crédito y Estado</h3>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Cupo Total</label>
                  <input className={f.input} type="number" min="0" step="1000" value={formValues.cupoTotal} onChange={e => setFormValues({ ...formValues, cupoTotal: e.target.value })} placeholder="0" />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Cupo Usado</label>
                  <input className={f.input} type="number" min="0" step="1000" value={formValues.cupoUsado} onChange={e => setFormValues({ ...formValues, cupoUsado: e.target.value })} placeholder="0" />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Deuda Vencida</label>
                  <input className={f.input} type="number" min="0" step="1000" value={formValues.deudaVencida} onChange={e => setFormValues({ ...formValues, deudaVencida: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Estado *</label>
                  <select className={f.select} value={formValues.estado} onChange={e => setFormValues({ ...formValues, estado: e.target.value as 'Activo' | 'Inactivo' })}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Asesor</label>
                  <select className={f.select} value={formValues.asesorId} onChange={e => setFormValues({ ...formValues, asesorId: e.target.value })} disabled={loadingAsesores}>
                    <option value="">Sin asignar</option>
                    {asesores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Cliente de Confianza</h3>
            <div className={f.formRow}>
              <div className={f.field} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setFormValues({ ...formValues, isTrustedCustomer: !formValues.isTrustedCustomer })}
                  style={{
                    width: 56,
                    height: 28,
                    borderRadius: 14,
                    border: 'none',
                    background: formValues.isTrustedCustomer ? '#10b981' : '#d1d5db',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  title={formValues.isTrustedCustomer ? 'Desactivar cliente de confianza' : 'Activar cliente de confianza'}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: formValues.isTrustedCustomer ? 30 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'white',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    {formValues.isTrustedCustomer ? 'Activo' : 'Inactivo'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Haz clic para cambiar el estado
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter secondary={{ label: 'Eliminar', onClick: closeModal, disabled: saving }} primary={{ label: editingCliente ? 'Guardar cambios' : ' crear cliente', type: 'submit', loading: saving, leftIcon: <CheckCircle size={16} /> }} />
        </form>
      </Modal>

<ConfirmationModal
            open={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            title="Eliminar cliente"
            description={`¿Estás seguro de eliminar a <strong>${deleteConfirm?.nombre}</strong>? Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar"
            variant="danger"
            onConfirm={handleDelete}
            loading={saving}
          />
    </div>
  );
};

export default AdminClientes;
