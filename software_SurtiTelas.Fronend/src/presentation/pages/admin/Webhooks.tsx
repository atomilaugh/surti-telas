import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Webhook as WebhookIcon, Eye, EyeOff, Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import s from './Webhooks.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { webhooksApi, type Webhook } from '@/infrastructure/api/webhooksApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { useServerPagination } from '@/hooks/useServerPagination';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

const WEBHOOK_EVENTS = [
  { value: 'order.created', label: 'Pedido creado' },
  { value: 'order.status.updated', label: 'Estado de pedido actualizado' },
  { value: 'order.delivered', label: 'Pedido entregado' },
  { value: 'order.canceled', label: 'Pedido cancelado' },
  { value: 'stock.below_minimum', label: 'Stock bajo mínimo' },
  { value: 'production.completed', label: 'Producción completada' },
] as const;

export const AdminWebhooks: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Webhook | null>(null);

  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [formActive, setFormActive] = useState(true);

  const pagination = useServerPagination(10);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined | null> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      const result = await webhooksApi.list(query);
      setWebhooks(result.data);
      pagination.setTotalRecords(result.meta.totalRecords);
    } catch {
      setError('No se pudieron cargar los webhooks');
      toast.error('No se pudieron cargar los webhooks');
    } finally {
      setLoading(false);
    }
  }, [pagination, debouncedSearch]);

  useEffect(() => {
    void fetchWebhooks();
  }, [fetchWebhooks]);

  const openCreateModal = () => {
    setEditingWebhook(null);
    setFormUrl('');
    setFormEvents([]);
    setFormSecret('');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEditModal = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormUrl(webhook.url);
    setFormEvents([...webhook.events]);
    setFormSecret('');
    setFormActive(webhook.active);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWebhook(null);
    setFormUrl('');
    setFormEvents([]);
    setFormSecret('');
    setFormActive(true);
  };

  const toggleEvent = (event: string) => {
    setFormEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const [testingId, setTestingId] = useState<string | null>(null);

  const _handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await webhooksApi.test(id);
      if (result.success) {
        toast.success(result.message || 'Webhook de prueba enviado correctamente');
      } else {
        toast.error(result.message || 'No se pudo enviar el webhook de prueba');
      }
    } catch {
      toast.error('Error al probar el webhook');
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formEvents.length === 0) {
      toast.error('Selecciona al menos un evento');
      return;
    }
    setSaving(true);
    try {
      const payload: { url: string; events: string[]; secret?: string; active?: boolean } = {
        url: formUrl,
        events: formEvents,
        active: formActive,
      };
      if (formSecret.trim()) payload.secret = formSecret.trim();

      if (editingWebhook) {
        await webhooksApi.update(editingWebhook.id, payload);
        toast.success('Webhook actualizado');
      } else {
        if (!formSecret.trim()) {
          toast.error('El secret es obligatorio para crear un webhook');
          setSaving(false);
          return;
        }
        await webhooksApi.create({ url: formUrl, events: formEvents, secret: formSecret.trim() });
        toast.success('Webhook creado');
      }
      closeModal();
      void fetchWebhooks();
    } catch {
      toast.error(editingWebhook ? 'No se pudo actualizar el webhook' : 'No se pudo crear el webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await webhooksApi.update(webhook.id, { active: !webhook.active });
      toast.success(webhook.active ? 'Webhook desactivado' : 'Webhook activado');
      void fetchWebhooks();
    } catch {
      toast.error('No se pudo cambiar el estado del webhook');
    }
  };

  const handleCopySecret = async (_webhook: Webhook) => {
    toast.error('Este webhook no tiene secret configurado');
  };

  const handleTestWebhook = async (webhook: Webhook) => {
    setTestingId(webhook.id);
    try {
      const result = await webhooksApi.test(webhook.id);
      if (result.success) {
        toast.success(result.message || 'Webhook de prueba enviado correctamente');
      } else {
        toast.error(result.message || 'No se pudo enviar el webhook de prueba');
      }
    } catch {
      toast.error('Error al probar el webhook');
    } finally {
      setTestingId(null);
    }
  };

  const getEventLabel = (eventValue: string) => {
    return WEBHOOK_EVENTS.find(e => e.value === eventValue)?.label ?? eventValue;
  };

  const columns: DataTableColumn<Webhook>[] = [
    { key: 'url', header: 'URL', sortable: true, render: (w: Webhook) => (
      <div className={s.urlCell}>
        <WebhookIcon size={14} />
        <span title={w.url}>{w.url}</span>
      </div>
    )},
    { key: 'events', header: 'Eventos', render: (w: Webhook) => (
      <div className={s.eventsCell}>
        {w.events.map(e => (
          <span key={e} className={s.eventBadge}>{getEventLabel(e)}</span>
        ))}
      </div>
    )},
    { key: 'active', header: 'Estado', width: '100px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
      { value: 'true', label: 'Activo' },
      { value: 'false', label: 'Inactivo' },
    ], render: (w: Webhook) => (
      <StatusBadge status={w.active ? 'Activo' : 'Inactivo'} />
    )},
    { key: 'createdAt', header: 'Creado', width: '120px', sortable: true, render: (w: Webhook) => (
      <span className={s.dateCell}>{new Date(w.createdAt).toLocaleDateString('es-CO')}</span>
    )},
  ];

  const actions = (w: Webhook) => [
    { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEditModal(w) },
    { label: w.active ? 'Desactivar' : 'Activar', icon: w.active ? <XCircle size={14} /> : <CheckCircle2 size={14} />, onClick: () => handleToggleActive(w) },
    { label: 'Copiar secret', icon: <Copy size={14} />, onClick: () => handleCopySecret(w) },
    { label: testingId === w.id ? 'Probando...' : 'Probar', icon: testingId === w.id ? <RefreshCw size={14} className={s.spin} /> : <RefreshCw size={14} />, onClick: () => handleTestWebhook(w), disabled: testingId === w.id },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(w), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Webhooks</h1>
          <p className={s.pageSubtitle}>Gestiona las suscripciones de webhooks del sistema</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
          Nuevo Webhook
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => { setSearch(value); pagination.setPage(1); }}
          debounceMs={300}
          minChars={0}
        />
      </div>

      {error && !loading && (
        <div style={{ marginBottom: 16, padding: 12, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>
          <span>{error}</span>
          <Button onClick={() => void fetchWebhooks()} style={{ marginLeft: 12 }}>Reintentar</Button>
        </div>
      )}

      <DataTable enableExport={false} enableRowSelection={false}
        data={webhooks}
        pageSize={pagination.limit}
        emptyMessage={loading ? 'Cargando webhooks...' : error ? error : 'No se encontraron webhooks'}
        enableSorting
        enableColumnFilters

        serverMode
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalRecords}
        onPageChange={(page) => pagination.setPage(page)}
        columns={columns}
        actions={actions}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingWebhook ? 'Editar Webhook' : 'Nuevo Webhook'}
        size="lg"
      >
        <form className={f.form} onSubmit={handleSubmit}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Configuración general</h3>
            <div className={f.field}>
              <label className={f.label}>URL del Webhook</label>
              <input
                type="url"
                className={f.input}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://ejemplo.com/webhook"
                required
              />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Eventos</h3>
            <div className={f.field}>
              <label className={f.label}>Eventos</label>
              <div className={s.eventsGrid}>
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event.value} className={s.eventOption}>
                    <input
                      type="checkbox"
                      checked={formEvents.includes(event.value)}
                      onChange={() => toggleEvent(event.value)}
                    />
                    <span>{event.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Seguridad</h3>
            <div className={f.field}>
              <label className={f.label}>{editingWebhook ? 'Nuevo Secret (opcional)' : 'Secret'}</label>
              <div className={s.secretInput}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  className={f.input}
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder={editingWebhook ? 'Dejar vacío para mantener el actual' : 'Secret para validar la firma HMAC'}
                  required={!editingWebhook}
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={s.eyeButton}
                  onClick={() => setShowSecret(!showSecret)}
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {editingWebhook && (
              <div className={f.field}>
                <label className={f.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  <span>Webhook activo</span>
                </label>
              </div>
            )}
          </div>

          <ModalFooter
            actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: closeModal, disabled: saving }, { label: editingWebhook ? 'Guardar cambios' : 'Crear webhook' , type: 'submit', loading: saving }]} />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await webhooksApi.remove(deleteConfirm.id);
            toast.success('Webhook eliminado');
            void fetchWebhooks();
          } catch {
            toast.error('No se pudo eliminar el webhook');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar webhook"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.url}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
