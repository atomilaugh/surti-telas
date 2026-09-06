import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import s from './AdminComisiones.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { commissionsApi, type Commission } from '@/infrastructure/api/commissionsApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { usersApi } from '@/infrastructure/api/usersApi';

const ESTADO_OPTIONS = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Pagado', label: 'Pagado' },
  { value: 'Cancelado', label: 'Cancelado' },
] as const;

export const AdminComisiones: React.FC = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Commission | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Commission | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);

  const [formAsesorId, setFormAsesorId] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [formPorcentaje, setFormPorcentaje] = useState('');
  const [formEstado, setFormEstado] = useState<Commission['estado']>('Pendiente');
  const [formNotas, setFormNotas] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commissionsApi.list();
      setItems(result);
    } catch {
      setError('No se pudieron cargar las comisiones');
      toast.error('No se pudieron cargar las comisiones');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsuarios = useCallback(async () => {
    try {
      const result = await usersApi.list({ page: 1, limit: 100 });
      setUsuarios(result.map(u => ({ id: u.id, nombre: u.nombre })));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchItems();
    void fetchUsuarios();
  }, [fetchItems, fetchUsuarios]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormAsesorId('');
    setFormMonto('');
    setFormPorcentaje('');
    setFormEstado('Pendiente');
    setFormNotas('');
    setModalOpen(true);
  };

  const openEditModal = (item: Commission) => {
    setEditingItem(item);
    setFormAsesorId(item.asesorId);
    setFormMonto(String(item.monto));
    setFormPorcentaje(String(item.porcentaje));
    setFormEstado(item.estado);
    setFormNotas(item.notas ?? '');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormAsesorId('');
    setFormMonto('');
    setFormPorcentaje('');
    setFormEstado('Pendiente');
    setFormNotas('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsesorId || !formMonto || !formPorcentaje) {
      toast.error('Asesor, monto y porcentaje son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        asesorId: formAsesorId,
        monto: Number(formMonto),
        porcentaje: Number(formPorcentaje),
        estado: formEstado,
        notas: formNotas || undefined,
      };
      if (editingItem) {
        await commissionsApi.create({ ...payload, id: editingItem.id });
        toast.success('Comisión actualizada');
      } else {
        await commissionsApi.create(payload);
        toast.success('Comisión creada');
      }
      closeModal();
      void fetchItems();
    } catch {
      toast.error(editingItem ? 'No se pudo actualizar la comisión' : 'No se pudo crear la comisión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await commissionsApi.create({ ...deleteConfirm, estado: 'Cancelado' });
      toast.success('Comisión cancelada');
      void fetchItems();
    } catch {
      toast.error('No se pudo cancelar la comisión');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const getAsesorNombre = (asesorId: string) => {
    return usuarios.find(u => u.id === asesorId)?.nombre ?? asesorId.slice(0, 8);
  };

  const columns: DataTableColumn<Commission>[] = [
    { key: 'asesorId', header: 'Asesor', width: '200px', render: (item: Commission) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <User size={14} />
        <span>{getAsesorNombre(item.asesorId)}</span>
      </div>
    )},
    { key: 'orderId', header: 'Pedido', width: '120px', render: (item: Commission) => item.orderId ?? '—' },
    { key: 'monto', header: 'Monto', width: '100px', sortable: true, render: (item: Commission) => (
      <span style={{ fontWeight: 600 }}>${item.monto.toLocaleString('es-CO')}</span>
    )},
    { key: 'porcentaje', header: '%', width: '70px', sortable: true, render: (item: Commission) => `${item.porcentaje}%` },
    { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
      { value: 'Pendiente', label: 'Pendiente' },
      { value: 'Pagado', label: 'Pagado' },
      { value: 'Cancelado', label: 'Cancelado' },
    ], render: (item: Commission) => {
      return <StatusBadge status={item.estado} />;
    }},
    { key: 'createdAt', header: 'Fecha', width: '130px', sortable: true, render: (item: Commission) => (
      <span>{new Date(item.createdAt).toLocaleDateString('es-CO')}</span>
    )},
  ];

  const actions = (item: Commission) => [
    { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEditModal(item) },
    { label: item.estado === 'Cancelado' ? 'Ya cancelada' : 'Cancelar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(item), danger: item.estado !== 'Cancelado', disabled: item.estado === 'Cancelado' },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Comisiones</h1>
          <p className={s.pageSubtitle}>Gestiona las comisiones de asesores por venta</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus size={16} />}>Nueva comisión</Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por asesor o pedido..." debounceMs={300} minChars={0} />
      </div>

      {error && !loading && (
        <div style={{ marginBottom: 16, padding: 12, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchItems} style={{ marginLeft: 8 }}>Reintentar</Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        emptyMessage={loading ? 'Cargando...' : 'No hay comisiones registradas'}
        actions={actions}
        pageSize={10}
      />

      <Modal open={modalOpen} onClose={closeModal} title={editingItem ? 'Editar comisión' : 'Nueva comisión'}>
        <form onSubmit={handleSubmit} className={f.form}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información de la comisión</h3>
            <div className={f.field}>
              <label className={f.label}>Asesor</label>
              <select className={f.select} value={formAsesorId} onChange={e => setFormAsesorId(e.target.value)} required>
                <option value="">Selecciona un asesor</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Monto</label>
                <input className={f.input} type="number" value={formMonto} onChange={e => setFormMonto(e.target.value)} required min="0" step="0.01" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Porcentaje (%)</label>
                <input className={f.input} type="number" value={formPorcentaje} onChange={e => setFormPorcentaje(e.target.value)} required min="0" max="100" step="0.01" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Estado y notas</h3>
            <div className={f.field}>
              <label className={f.label}>Estado</label>
              <select className={f.select} value={formEstado} onChange={e => setFormEstado(e.target.value as Commission['estado'])}>
                {ESTADO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>Notas</label>
              <textarea className={f.textarea} value={formNotas} onChange={e => setFormNotas(e.target.value)} rows={2} />
            </div>
          </div>

          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: closeModal, disabled: saving }}
            primary={{ label: editingItem ? 'Guardar cambios' : 'Crear comisión', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Cancelar comisión"
        description={`¿Cancelar la comisión de $${deleteConfirm?.monto.toLocaleString('es-CO')} para ${getAsesorNombre(deleteConfirm?.asesorId ?? '')}?`}
      />
    </div>
  );
};
