import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Star, Phone, MapPin, Package } from 'lucide-react';
import s from './Proveedores.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { stockApi } from '@/infrastructure/api/stockApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import type { Proveedor } from '@/core/types';
import { isValidPhone } from '@/shared/utils/phone';
import { isValidNit } from '@/shared/utils/document';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export const AdminProveedores: React.FC = () => {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pageData, setPageData] = useState<Proveedor[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Proveedor | null>(null);

  const pagination = useServerPagination(10);

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined | null> = {
        page: pagination.page,
        limit: pagination.limit,
        sort: 'nombre',
        order: 'asc',
      };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      const result = await stockApi.suppliers.list(query);
      setPageData(result.data);
      pagination.setTotalRecords(result.meta.totalRecords);
    } catch {
      setError('No se pudieron cargar los proveedores');
      toast.error('No se pudieron cargar los proveedores');
    } finally {
      setLoading(false);
    }
  }, [pagination, debouncedSearch]);

  useEffect(() => {
    void fetchProveedores();
  }, [fetchProveedores]);

  const handlePageChange = useCallback((newPage: number) => {
    pagination.setPage(newPage);
  }, [pagination]);

  const [formNombre, setFormNombre] = useState('');
  const [formApellidos, setFormApellidos] = useState('');
  const [formNit, setFormNit] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formMateriales, setFormMateriales] = useState('');
  const [formCalificacion, setFormCalificacion] = useState(3);
  const [formEstado, setFormEstado] = useState<Proveedor['estado']>('Activo');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormNombre('');
    setFormApellidos('');
    setFormNit('');
    setFormTelefono('');
    setFormEmail('');
    setFormDireccion('');
    setFormCiudad('');
    setFormMateriales('');
    setFormCalificacion(3);
    setFormEstado('Activo');
    setSelectedProveedor(null);
    setSaving(false);
    setErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setFormModalOpen(true);
  };

  const openEditModal = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setFormNombre(proveedor.nombre);
    setFormApellidos(proveedor.apellidos ?? '');
    setFormNit(proveedor.nit);
    setFormTelefono(proveedor.telefono);
    setFormEmail(proveedor.email);
    setFormDireccion(proveedor.direccion);
    setFormCiudad(proveedor.ciudad);
    setFormMateriales(proveedor.materiales.join(', '));
    setFormCalificacion(proveedor.calificacion);
    setFormEstado(proveedor.estado);
    setSaving(false);
    setErrors({});
    setFormModalOpen(true);
  };

  const closeModals = () => {
    setFormModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const materialesArr = formMateriales.split(',').map(m => m.trim()).filter(Boolean);

    const newErrors: Record<string, string> = {};
    if (!formNombre || formNombre.length < 3) newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    if (formApellidos && formApellidos.length < 3) newErrors.apellidos = 'Mínimo 3 caracteres';
    if (!formEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) newErrors.email = 'Email inválido';
    if (formTelefono && !isValidPhone(formTelefono)) newErrors.telefono = 'Teléfono inválido (7-11 dígitos)';
    if (!formNit || !isValidNit(formNit)) newErrors.nit = 'NIT inválido';
    if (!formDireccion || formDireccion.length < 5) newErrors.direccion = 'Dirección muy corta';
    if (!formCiudad || formCiudad.length < 3) newErrors.ciudad = 'Ciudad inválida';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setSaving(false);
      return;
    }

    setSaving(true);
    const data = {
      nombre: formNombre,
      apellidos: formApellidos || undefined,
      nit: formNit,
      telefono: formTelefono,
      email: formEmail,
      direccion: formDireccion,
      ciudad: formCiudad,
      materiales: materialesArr,
      estado: formEstado,
      calificacion: formCalificacion,
      pedidosRealizados: selectedProveedor?.pedidosRealizados,
      ultimoPedido: selectedProveedor?.ultimoPedido,
    };

    try {
      if (selectedProveedor) {
        await stockApi.suppliers.update(selectedProveedor.id, data);
        setError(null);
        toast.success('Proveedor actualizado');
        if (pagination.page === 1) {
          void fetchProveedores();
        } else {
          pagination.setPage(1);
        }
      } else {
        await stockApi.suppliers.create(data);
        setError(null);
        toast.success('Proveedor creado');
        if (pagination.page === 1) {
          void fetchProveedores();
        } else {
          pagination.setPage(1);
        }
      }
      closeModals();
    } catch {
      toast.error('No fue posible guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (proveedor: Proveedor) => {
    setDeleteConfirm(proveedor);
  };

  const renderStars = (calificacion: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < calificacion ? s.starFilled : s.starEmpty}
      />
    ));
  };

  const columns: DataTableColumn<Proveedor>[] = [
    { key: 'nombre', header: 'Proveedor', sortable: true, filterable: true, render: (p: Proveedor) => (
      <div className={s.proveedorCell}>
        <span className={s.proveedorNombre}>{p.nombre}</span>
      </div>
    )},
    { key: 'nit', header: 'NIT', width: '130px', render: (p: Proveedor) => <span className={s.tdMono}>{p.nit}</span> },
    { key: 'ciudad', header: 'Ciudad', width: '140px', render: (p: Proveedor) => (
      <div className={s.ubicacionCell}>
        <MapPin size={12} />
        <span>{p.ciudad}</span>
      </div>
    )},
    { key: 'telefono', header: 'Teléfono', width: '130px', render: (p: Proveedor) => (
      <div className={s.contactLine}>
        <Phone size={12} />
        <span>{p.telefono}</span>
      </div>
    )},
    { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
      { value: 'Activo', label: 'Activo' },
      { value: 'Inactivo', label: 'Inactivo' },
    ], render: (p: Proveedor) => (
      <StatusBadge status={p.estado} />
    )},
  ];

  const actions = (p: Proveedor) => [
    { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEditModal(p) },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => handleEliminar(p), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de proveedores</h1>
          <p className={s.pageSubtitle}>Administración de proveedores</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
          Nuevo proveedor
        </Button>
      </div>

      {error && !loading && (
        <div className={s.errorBox} style={{ marginBottom: 16, padding: 12, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>
          <span>{error}</span>
          <Button onClick={() => void fetchProveedores()} style={{ marginLeft: 12 }}>Reintentar</Button>
        </div>
      )}

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por nombre, NIT, ciudad o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => { setSearch(value); pagination.setPage(1); }}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <DataTable<Proveedor>
        data={pageData}
        pageSize={pagination.limit}
        emptyMessage={loading ? 'Cargando proveedores...' : error ? error : 'No se encontraron proveedores'}
        enableSorting
        enableColumnFilters
        enableRowSelection
        enableExport
        exportFileName="proveedores"
        maxVisibleColumns={5}
        serverMode
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalRecords}
        onPageChange={handlePageChange}
        columns={columns}
        actions={actions}
        detailPanel={{
          title: (p) => `Proveedor: ${p.nombre}`,
          render: (p, onClose) => (
            <div className={s.detailModalContent}>
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Información básica</h4>
                <div className={s.detailGrid}>
                  <div className={s.detailItem}><span className={s.detailLabel}>NIT</span><span>{p.nit}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Pedidos</span><span>{p.pedidosRealizados}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Calificación</span><span className={s.starsCell}>{renderStars(p.calificacion)}</span></div>
                </div>
              </div>
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Contacto</h4>
                <div className={s.detailGrid}>
                  <div className={s.detailItem}><span className={s.detailLabel}>Teléfono</span><span>{p.telefono}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Email</span><span>{p.email}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Dirección</span><span>{p.direccion}</span></div>
                </div>
              </div>
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Materiales</h4>
                <div className={s.chipsCell}>
                  {p.materiales.slice(0, 4).map((m, i) => (
                    <span key={i} className={s.chip}>{m}</span>
                  ))}
                </div>
              </div>
              <ModalFooter
                secondary={{ label: 'Cerrar', onClick: onClose }}
              />
            </div>
          ),
        }}
      />

      <Modal
        open={formModalOpen}
        onClose={closeModals}
        title={selectedProveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
        size="lg"
      >
        <form className={f.form} onSubmit={handleSubmit}>
          <div className={s.formSection}>
            <h3 className={s.formSectionTitle}>Datos generales</h3>
            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>Nombre / Razón social</label>
                <input
                  type="text"
                  className={`${s.input} ${errors.nombre ? s.inputError : ''}`}
                  value={formNombre}
                  onChange={e => { setFormNombre(e.target.value); delete errors.nombre; setErrors({...errors}); }}
                  minLength={3}
                />
                {errors.nombre && <span className={s.errorText}>{errors.nombre}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label}>Apellidos</label>
                <input
                  type="text"
                  className={`${s.input} ${errors.apellidos ? s.inputError : ''}`}
                  value={formApellidos}
                  onChange={e => { setFormApellidos(e.target.value); delete errors.apellidos; setErrors({...errors}); }}
                  minLength={3}
                  placeholder="Opcional"
                />
                {errors.apellidos && <span className={s.errorText}>{errors.apellidos}</span>}
              </div>
            </div>

            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>NIT</label>
                <input
                  type="text"
                  className={`${s.input} ${errors.nit ? s.inputError : ''}`}
                  value={formNit}
                  onChange={e => { setFormNit(e.target.value); delete errors.nit; setErrors({...errors}); }}
                  maxLength={20}
                />
                {errors.nit && <span className={s.errorText}>{errors.nit}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label}>Email</label>
                <input
                  type="email"
                  className={`${s.input} ${errors.email ? s.inputError : ''}`}
                  value={formEmail}
                  onChange={e => { setFormEmail(e.target.value); delete errors.email; setErrors({...errors}); }}
                />
                {errors.email && <span className={s.errorText}>{errors.email}</span>}
              </div>
            </div>

            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>Teléfono</label>
                <input
                  type="tel"
                  className={`${s.input} ${errors.telefono ? s.inputError : ''}`}
                  value={formTelefono}
                  onChange={e => { setFormTelefono(e.target.value); delete errors.telefono; setErrors({...errors}); }}
                  maxLength={11}
                  inputMode="numeric"
                />
                {errors.telefono && <span className={s.errorText}>{errors.telefono}</span>}
              </div>
            </div>
          </div>

          <div className={s.formSection}>
            <h3 className={s.formSectionTitle}>Ubicación</h3>
            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>Ciudad</label>
                <input
                  type="text"
                  className={`${s.input} ${errors.ciudad ? s.inputError : ''}`}
                  value={formCiudad}
                  onChange={e => { setFormCiudad(e.target.value); delete errors.ciudad; setErrors({...errors}); }}
                />
                {errors.ciudad && <span className={s.errorText}>{errors.ciudad}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label}>Dirección</label>
                <input
                  type="text"
                  className={`${s.input} ${errors.direccion ? s.inputError : ''}`}
                  value={formDireccion}
                  onChange={e => { setFormDireccion(e.target.value); delete errors.direccion; setErrors({...errors}); }}
                />
                {errors.direccion && <span className={s.errorText}>{errors.direccion}</span>}
              </div>
            </div>
          </div>

          <div className={s.formSection}>
            <h3 className={s.formSectionTitle}>Información adicional</h3>
            <div className={s.formRow}>
              <div className={s.field}>
                <label className={s.label}>Materiales / Servicios (separados por coma)</label>
                <div className={s.inputWithIcon}>
                  <Package size={14} className={s.inputIcon} />
                  <input
                    type="text"
                    className={s.input}
                    value={formMateriales}
                    onChange={e => setFormMateriales(e.target.value)}
                    placeholder="Algodón, Poliéster, Hilos..."
                  />
                </div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Calificación (1 a 5)</label>
                <div className={s.ratingRow}>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formCalificacion}
                    onChange={e => setFormCalificacion(Number(e.target.value))}
                    className={s.ratingInput}
                  />
                  <span className={s.ratingValue}>{formCalificacion}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.formSection}>
            <h3 className={s.formSectionTitle}>Estado</h3>
            <div className={s.field} style={{ maxWidth: '240px' }}>
              <label className={s.label}>Estado</label>
              <select
                className={s.select}
                value={formEstado}
                onChange={e => setFormEstado(e.target.value as Proveedor['estado'])}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: closeModals, disabled: saving }}
            primary={{ label: selectedProveedor ? 'Guardar cambios' : 'Crear proveedor', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await stockApi.suppliers.remove(deleteConfirm.id);
            toast.success('Proveedor eliminado');
            void fetchProveedores();
          } catch {
            toast.error('No fue posible eliminar el proveedor');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar proveedor"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
