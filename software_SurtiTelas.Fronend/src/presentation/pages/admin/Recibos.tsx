import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, Printer, Clock, CheckCircle, AlertTriangle, Plus, Edit, Send, DollarSign, ChevronDown, Calendar, Save, Trash2, Loader2, AlertCircle, Eye } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Recibos.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '../../../shared/ui/DataTable';
import { Modal } from '../../../shared/ui/Modal';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { receiptsApi, type Receipt } from '@/infrastructure/api/receiptsApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { salesApi } from '@/infrastructure/api/salesApi';
import { useAuthStore } from '@/core/stores/authStore';
import { hasPermission } from '@/presentation/routes/protectedRouteHelpers';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import type { Cliente } from '@/core/types';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface Recibo {
  id: string;
  orderId?: string;
  numeroRecibo: string;
  cliente: string;
  nitCliente: string;
  fechaEmision: string;
  fechaVencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: 'Borrador' | 'Enviado' | 'Pagado' | 'Vencido' | 'Cancelado';
  metodoPago?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Credito';
  vendedor: string;
  items: ItemRecibo[];
}

interface ItemRecibo {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

interface ItemForm {
  id: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
}

const BACKEND_ESTADO_MAP: Record<string, Recibo['estado']> = {
  BORRADOR: 'Borrador',
  EMITIDO: 'Enviado',
  ENVIADO: 'Enviado',
  PAGADO: 'Pagado',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

const FRONTEND_TO_BACKEND_ESTADO: Record<Recibo['estado'], string> = {
  Borrador: 'BORRADOR',
  Enviado: 'ENVIADO',
  Pagado: 'PAGADO',
  Vencido: 'VENCIDO',
  Cancelado: 'CANCELADO',
};

function toRecibo(dto: Receipt, clientesMap: Map<string, Cliente>): Recibo {
  const total = Number(dto.total) || 0;
  const cliente = clientesMap.get(dto.customerId);
  const clienteNombre = cliente?.nombre ?? 'Cliente';
  const clienteEmail = cliente?.email ?? dto.customerId;
  return {
    id: dto.id,
    orderId: dto.orderId,
    numeroRecibo: dto.numero,
    cliente: clienteNombre,
    nitCliente: clienteEmail,
    fechaEmision: (dto.createdAt ?? new Date().toISOString()).slice(0, 10),
    fechaVencimiento: (dto.createdAt ?? new Date().toISOString()).slice(0, 10),
    subtotal: total,
    iva: Math.round(total * 0.19),
    total,
    estado: BACKEND_ESTADO_MAP[dto.estado] ?? 'Borrador',
    vendedor: dto.emitidoPor ?? 'Sin asignar',
    items: [{ id: 'I1', descripcion: 'Recibo', cantidad: 1, precioUnitario: total, total }],
  };
}

const metodosPago: NonNullable<Recibo['metodoPago']>[] = ['Efectivo', 'Transferencia', 'Tarjeta', 'Credito'];

export const AdminRecibos: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Borrador' | 'Enviado' | 'Pagado' | 'Vencido' | 'Cancelado'>('Todos');
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cliente, setCliente] = useState('');
  const [nitCliente, setNitCliente] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [metodoPago, setMetodoPago] = useState<'' | NonNullable<Recibo['metodoPago']>>('');
  const [items, setItems] = useState<ItemForm[]>([
    { id: 'I1', descripcion: '', cantidad: '', precioUnitario: '' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNumero, setEditingNumero] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<Recibo | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; estado: Recibo['estado'] } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedReceiptForViewer, setSelectedReceiptForViewer] = useState<Recibo | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const viewerBlobUrlRef = useRef<string | null>(null);

  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canCreate = hasPermission(permissions, 'receipts:create');
  const canUpdate = hasPermission(permissions, 'receipts:update');
  const canDelete = hasPermission(permissions, 'receipts:delete');
  const canRead = hasPermission(permissions, 'receipts:read');

  const hoy = new Date().toISOString().slice(0, 10);

const loadRecibos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!canRead) {
        setRecibos([]);
        return;
      }
      const perms = useAuthStore.getState().user?.permissions ?? [];
      const canReadCustomers = hasPermission(perms, 'customers:read');
      const clienteResult = canReadCustomers ? await customersApi.list({ limit: 100 }) : { data: [] };
      const clientesMap = new Map<string, Cliente>((clienteResult.data ?? []).map((c: Cliente) => [c.id, c]));
      const data = await receiptsApi.list();
      const recibosFiltrados = canReadCustomers
        ? data.filter(r => clientesMap.has(r.customerId))
        : data;
      setRecibos(recibosFiltrados.map(r => toRecibo(r, clientesMap)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los recibos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecibos();
  }, []);

  const filteredRecibos = useMemo(() => {
    return recibos.filter(r =>
      (filtroEstado === 'Todos' || r.estado === filtroEstado) &&
      (r.numeroRecibo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.cliente.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.nitCliente.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.vendedor.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [recibos, debouncedSearch, filtroEstado]);

  const subtotal = items.reduce((sum, it) => sum + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const resetForm = () => {
    setCliente('');
    setNitCliente('');
    setVendedor('');
    setFechaEmision(hoy);
    setFechaVencimiento('');
    setMetodoPago('');
    setItems([{ id: 'I1', descripcion: '', cantidad: '', precioUnitario: '' }]);
    setFormError(null);
  };

  const openModal = (recibo?: Recibo) => {
    if (recibo && !canUpdate) return;
    if (!recibo && !canCreate) return;
    if (recibo) {
      setCliente(recibo.cliente);
      setNitCliente(recibo.nitCliente);
      setVendedor(recibo.vendedor);
      setFechaEmision(recibo.fechaEmision);
      setFechaVencimiento(recibo.fechaVencimiento);
      setMetodoPago(recibo.metodoPago || '');
      setItems(recibo.items.map(it => ({ id: it.id, descripcion: it.descripcion, cantidad: String(it.cantidad), precioUnitario: String(it.precioUnitario) })));
      setEditingId(recibo.id);
      setEditingNumero(recibo.numeroRecibo);
    } else {
      resetForm();
      setEditingId(null);
      setEditingNumero('');
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFormError(null);
    setEditingId(null);
  };

  const updateItem = (id: string, field: keyof ItemForm, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: `I${prev.length + 1}-${Date.now()}`, descripcion: '', cantidad: '', precioUnitario: '' }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!cliente.trim()) { setFormError('El cliente es obligatorio'); return; }
    if (!nitCliente.trim()) { setFormError('El NIT del cliente es obligatorio'); return; }
    const itemsValidos = items.filter(it => it.descripcion.trim() && Number(it.cantidad) > 0 && Number(it.precioUnitario) > 0);
    if (itemsValidos.length === 0) { setFormError('Debes agregar al menos un artículo válido'); return; }
    setSaving(true);
    const itemsRecibo: ItemRecibo[] = itemsValidos.map((it, idx) => {
      const cantidad = Number(it.cantidad);
      const precioUnitario = Number(it.precioUnitario);
      return {
        id: it.id || `I${idx + 1}`,
        descripcion: it.descripcion.trim(),
        cantidad,
        precioUnitario,
        total: cantidad * precioUnitario,
      };
    });
    try {
      if (editingId) {
        await receiptsApi.update(editingId, {
          customerId: nitCliente.trim(),
          concepto: itemsRecibo.map(it => it.descripcion).join(', '),
          total,
        });
        setRecibos(prev => prev.map(r => r.id === editingId ? {
          ...r,
          cliente: cliente.trim(),
          nitCliente: nitCliente.trim(),
          vendedor: vendedor.trim() || 'Sin asignar',
          fechaEmision,
          fechaVencimiento: fechaVencimiento || fechaEmision,
          items: itemsRecibo,
          metodoPago: metodoPago || undefined,
        } : r));
        toast.success('Recibo actualizado correctamente');
      } else {
        const secuencia = String(recibos.length + 1).padStart(3, '0');
        const numeroRecibo = `R${secuencia}-${new Date().getFullYear()}`;
        const concepto = itemsRecibo.map(it => it.descripcion).join(', ');
        const created = await receiptsApi.create({
          customerId: nitCliente.trim(),
          numero: numeroRecibo,
          total,
          concepto,
        });
        const nuevo: Recibo = {
          id: created.id,
          numeroRecibo: created.numero,
          cliente: cliente.trim(),
          nitCliente: nitCliente.trim(),
          fechaEmision,
          fechaVencimiento: fechaVencimiento || fechaEmision,
          subtotal,
          iva,
          total,
          estado: BACKEND_ESTADO_MAP[created.estado] ?? 'Borrador',
          metodoPago: metodoPago || undefined,
          vendedor: vendedor.trim() || 'Sin asignar',
          items: itemsRecibo,
        };
        setRecibos(prev => [nuevo, ...prev]);
        toast.success(`Recibo ${nuevo.numeroRecibo} creado`);
      }
      closeModal();
    } catch {
      toast.error('No se pudo guardar el recibo');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!statusConfirm) return;
    try {
      await receiptsApi.updateStatus(statusConfirm.id, FRONTEND_TO_BACKEND_ESTADO[statusConfirm.estado]);
      await loadRecibos();
      toast.success(`Recibo ${statusConfirm.id} actualizado a ${statusConfirm.estado}`);
      setStatusConfirm(null);
      if (statusConfirm.estado === 'Pagado') {
        window.dispatchEvent(new CustomEvent('receipt:paid', { detail: { receiptId: statusConfirm.id } }));
      }
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const handleExportPdf = (recibo: Recibo) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana para generar el PDF');
      return;
    }
    printWindow.document.write(getReceiptHtml(recibo));
    printWindow.document.close();
    printWindow.print();
  };

  const getReceiptHtml = (recibo: Recibo): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Recibo ${recibo.numeroRecibo}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1a365d; }
    .info { margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .items { margin-top: 20px; border-top: 2px solid #1a365d; padding-top: 10px; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    .items th { background: #f7fafc; }
    .total { margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECIBO</h1>
    <p>N° ${recibo.numeroRecibo}</p>
  </div>
  <div class="info">
    <div class="info-row"><span class="label">Cliente:</span><span class="value">${recibo.cliente}</span></div>
    <div class="info-row"><span class="label">Fecha Emisión:</span><span class="value">${recibo.fechaEmision}</span></div>
    <div class="info-row"><span class="label">Estado:</span><span class="value">${recibo.estado}</span></div>
    <div class="info-row"><span class="label">Vendedor:</span><span class="value">${recibo.vendedor}</span></div>
  </div>
  <div class="items">
    <table>
      <thead>
        <tr><th>Descripción</th><th>Cantidad</th><th>Precio Unit.</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${recibo.items.map(item => `<tr><td>${item.descripcion}</td><td>${item.cantidad}</td><td>$${item.precioUnitario.toLocaleString()}</td><td>$${item.total.toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="total">TOTAL: $${recibo.total.toLocaleString()}</div>
  <div class="footer">
    <p>Documento generado por SurtiTelas</p>
  </div>
</body>
</html>`;
  };

  const handleViewReceipt = (recibo: Recibo) => {
    setViewerError(null);
    setViewerLoading(true);
    setSelectedReceiptForViewer(recibo);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedReceiptForViewer(null);
    setViewerLoading(false);
    setViewerError(null);
    if (viewerBlobUrlRef.current) {
      URL.revokeObjectURL(viewerBlobUrlRef.current);
      viewerBlobUrlRef.current = null;
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedReceiptForViewer) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    printWindow.document.write(getReceiptHtml(selectedReceiptForViewer));
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadReceipt = () => {
    if (!selectedReceiptForViewer) return;
    const html = getReceiptHtml(selectedReceiptForViewer);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${selectedReceiptForViewer.numeroRecibo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!viewerOpen || !selectedReceiptForViewer) return;
    const timer = setTimeout(() => {
      try {
        const html = getReceiptHtml(selectedReceiptForViewer);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        if (viewerBlobUrlRef.current) {
          URL.revokeObjectURL(viewerBlobUrlRef.current);
        }
        viewerBlobUrlRef.current = url;
        setViewerLoading(false);
      } catch {
        setViewerError('No fue posible cargar el recibo.');
        setViewerLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [viewerOpen, selectedReceiptForViewer]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await receiptsApi.remove(deleteConfirm.id);
      await loadRecibos();
      toast.success(`Recibo ${deleteConfirm.numeroRecibo} eliminado`);
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar el recibo');
    }
  };

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
  };

  const stats = {
    totalRecibos: recibos.filter(r => r.estado !== 'Cancelado').reduce((sum, r) => sum + r.total, 0),
    pendientes: recibos.filter(r => r.estado === 'Enviado').length,
    pagados: recibos.filter(r => r.estado === 'Pagado').length,
    vencidos: recibos.filter(r => r.estado === 'Vencido').length,
    pendientesMonto: recibos.filter(r => r.estado === 'Enviado' || r.estado === 'Vencido').reduce((sum, r) => sum + r.total, 0),
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Recibos</h1>
          <p className={s.pageSubtitle}>Gestión de recibos</p>
        </div>
        <div className={s.headerActions}>
          {canCreate && (
            <Button leftIcon={<Plus size={16} />} onClick={() => openModal()}>
              Nuevo Recibo
            </Button>
          )}
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <DollarSign size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{formatCurrency(stats.totalRecibos)}</div>
            <div className={s.statLabel}>Total Recibos</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardWarning}`}>
          <Clock size={20} className={s.statIconWarning} />
          <div>
            <div className={s.statValue}>{stats.pendientesMonto > 0 ? formatCurrency(stats.pendientesMonto) : '$0'}</div>
            <div className={s.statLabel}>Por Cobrar</div>
          </div>
        </div>
        <div className={s.statCard}>
          <CheckCircle size={20} className={s.statIconSuccess} />
          <div>
            <div className={s.statValue}>{stats.pagados}</div>
            <div className={s.statLabel}>Pagados</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardDanger}`}>
          <AlertTriangle size={20} className={s.statIconDanger} />
          <div>
            <div className={s.statValue}>{stats.vencidos}</div>
            <div className={s.statLabel}>Vencidos</div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por recibo, cliente o NIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={100}
          minChars={0}
        />
        <button className={s.filterToggle} onClick={() => setShowFilters(!showFilters)}>
          <FileText size={16} />
          Filtros
          <ChevronDown size={14} className={`${s.filterChevron} ${showFilters ? s.filterChevronOpen : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className={s.filtersPanel}>
          <div className={s.filterGroup}>
            {['Todos', 'Borrador', 'Enviado', 'Pagado', 'Vencido', 'Cancelado'].map(estado => (
              <button
                key={estado}
                className={`${s.filterBtn} ${filtroEstado === estado ? s.filterBtnActive : ''}`}
                onClick={() => setFiltroEstado(estado as typeof filtroEstado)}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={s.tableWrapper}>
        {loading && (
          <div className={s.stateBox}>
            <Loader2 size={28} className={s.spin} />
            <p>Cargando recibos...</p>
          </div>
        )}
        {error && (
          <div className={s.errorBox}>
            <AlertCircle size={28} />
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <DataTable<Recibo>
            data={filteredRecibos}
            pageSize={10}
            emptyMessage="No se encontraron recibos"
            enableSorting
            enableColumnFilters
            enableRowSelection
            enableExport
            exportFileName="recibos"
            maxVisibleColumns={5}
            columns={[
              { key: 'numeroRecibo', header: 'N° Recibo', width: '130px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar recibo...', render: (r) => <span className={s.tdPrimary}>{r.numeroRecibo}</span> },
              { key: 'cliente', header: 'Cliente', sortable: true, filterable: true, render: (r) => r.cliente },
              { key: 'nitCliente', header: 'NIT', width: '120px', render: (r) => <span className={s.tdMono}>{r.nitCliente}</span> },
              { key: 'fechaEmision', header: 'Fecha', width: '110px', render: (r) => (
                <div className={s.fechaCell}><Calendar size={14} />{r.fechaEmision}</div>
              )},
              { key: 'total', header: 'Total', width: '120px', render: (r) => <span className={`${s.tdRight} ${s.tdTotal}`}>{formatCurrency(r.total)}</span> },
              { key: 'estado', header: 'Estado', width: '160px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
                { value: 'Borrador', label: 'Borrador' },
                { value: 'Enviado', label: 'Enviado' },
                { value: 'Pagado', label: 'Pagado' },
                { value: 'Vencido', label: 'Vencido' },
                { value: 'Cancelado', label: 'Cancelado' },
              ], render: (r) => (
                <StatusBadge status={r.estado} />
              )},
            ]}
actions={(r) => [
                { label: 'Ver', icon: <Eye size={14} />, onClick: () => handleViewReceipt(r) },
                ...(canUpdate && (r.estado === 'Borrador' || r.estado === 'Enviado') ? [{ label: 'Editar', icon: <Edit size={14} />, onClick: () => openModal(r) }] : []),
                ...(canCreate && r.estado === 'Borrador' ? [{
                  label: 'Enviar',
                  icon: <Send size={14} />,
                  onClick: async () => {
                    try {
                      await receiptsApi.updateStatus(r.id, FRONTEND_TO_BACKEND_ESTADO['Enviado']);
                      await loadRecibos();
                      if (r.orderId) {
                        try {
                          await salesApi.retryReceipt(r.orderId);
                          toast.success(`Recibo ${r.numeroRecibo} enviado`);
                        } catch {
                          toast.error(`Recibo ${r.numeroRecibo} enviado, pero no tienes permiso para reintentar el envío`);
                        }
                      } else {
                        toast.success(`Recibo ${r.numeroRecibo} enviado`);
                      }
                      window.dispatchEvent(new CustomEvent('receipt:sent', { detail: { receiptId: r.id } }));
                    } catch {
                      toast.error('No se pudo enviar el recibo');
                    }
                  }
                }] : []),
                ...(canUpdate && r.estado === 'Enviado' ? [{ label: 'Marcar pagado', icon: <CheckCircle size={14} />, onClick: async () => { await receiptsApi.updateStatus(r.id, FRONTEND_TO_BACKEND_ESTADO['Pagado']); await loadRecibos(); toast.success(`Recibo ${r.numeroRecibo} marcado como pagado`); } }] : []),
                { label: 'PDF', icon: <FileText size={14} />, onClick: () => handleExportPdf(r) },
                ...(canDelete ? [{ label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(r), danger: true }] : []),
            ]}
            detailPanel={{
              title: (r) => `Recibo ${r.numeroRecibo}`,
              render: (r, onClose) => (
                <div className={s.detailModalContent}>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Información de recibo</h4>
                    <div className={s.detailGrid}>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cliente</span><span>{r.cliente}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>NIT</span><span>{r.nitCliente}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Vendedor</span><span>{r.vendedor}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Emisión</span><span>{r.fechaEmision}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Vencimiento</span><span>{r.fechaVencimiento}</span></div>
                      {r.metodoPago && <div className={s.detailItem}><span className={s.detailLabel}>Método</span><span>{r.metodoPago}</span></div>}
                    </div>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Detalle de artículos</h4>
                    <table className={s.detailItemsTable}>
                      <thead><tr><th>Descripción</th><th style={{ textAlign: 'center' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio Unit.</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                      <tbody>{r.items.map(item => (<tr key={item.id}><td>{item.descripcion}</td><td style={{ textAlign: 'center' }}>{item.cantidad}</td><td style={{ textAlign: 'right' }}>{formatCurrency(item.precioUnitario)}</td><td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.total)}</td></tr>))}</tbody>
                    </table>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Resumen</h4>
                    <div className={s.totalsGrid}>
                      <div className={s.totalRow}><span>Subtotal:</span><span>{formatCurrency(r.subtotal)}</span></div>
                      <div className={s.totalRow}><span>IVA (19%):</span><span>{formatCurrency(r.iva)}</span></div>
                      <div className={`${s.totalRow} ${s.totalRowFinal}`}><span>Total:</span><span>{formatCurrency(r.total)}</span></div>
                    </div>
                  </div>
                   <ModalFooter
                     actions={[{ label: 'Cerrar', variant: 'secondary', onClick: onClose }, { label: 'Imprimir', variant: 'secondary', onClick: () => { window.print(); toast.info(`Imprimiendo ${r.numeroRecibo}`); }, leftIcon: <Printer size={16} /> }]} />

                </div>
              ),
            }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Recibo' : 'Crear Nuevo Recibo'}
        description={editingId ? `Modificando ${editingNumero}` : 'Registra un recibo con sus artículos y totales'}
        size="xl"
        variant="form"
      >
        <form onSubmit={handleSubmit} className={f.form}>
          {formError && <div className={f.formError}>{formError}</div>}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información general</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cliente *</label>
                <input className={f.input} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ej: Tienda La Esquina" />
              </div>
              <div className={f.field}>
                <label className={f.label}>NIT *</label>
                <input className={f.input} value={nitCliente} onChange={e => setNitCliente(e.target.value)} placeholder="Ej: 900123456-1" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Detalles del recibo</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Vendedor</label>
                <input className={f.input} value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Método de pago</label>
                <select className={f.select} value={metodoPago} onChange={e => setMetodoPago(e.target.value as NonNullable<Recibo['metodoPago']>)}>
                  <option value="">Sin especificar</option>
                  {metodosPago.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Fecha de emisión *</label>
                <input className={f.input} type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Fecha de vencimiento</label>
                <input className={f.input} type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Artículos del recibo</h3>
            <div className={f.field}>
              <label className={f.label}>Artículos del recibo</label>
              <table className={f.itemsTable}>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className={f.centerCol}>Cant.</th>
                    <th className={f.rightCol}>Precio unit.</th>
                    <th className={f.rightCol}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const tot = (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0);
                    return (
                      <tr key={it.id}>
                        <td><input className={f.input} value={it.descripcion} onChange={e => updateItem(it.id, 'descripcion', e.target.value)} placeholder="Descripción del artículo" /></td>
                        <td className={f.centerCol}><input className={f.input} type="number" min="1" value={it.cantidad} onChange={e => updateItem(it.id, 'cantidad', e.target.value)} /></td>
                        <td className={f.rightCol}><input className={f.input} type="number" min="0" value={it.precioUnitario} onChange={e => updateItem(it.id, 'precioUnitario', e.target.value)} /></td>
                        <td className={f.rightCol} style={{ fontWeight: 600 }}>{formatCurrency(tot)}</td>
                        <td>
                          <button type="button" className={f.removeRowBtn} onClick={() => removeItem(it.id)} aria-label="Eliminar artículo" disabled={items.length === 1}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={addItem}>
                Agregar artículo
              </Button>
            </div>
            <div className={f.totalsBox}>
              <div className={f.totalRow}><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
              <div className={f.totalRow}><span>IVA (19%):</span><span>{formatCurrency(iva)}</span></div>
              <div className={`${f.totalRow} ${f.totalRowFinal}`}><span>Total:</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>

          <div className={f.formActions}>
            <ModalFooter
              actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: closeModal, disabled: saving }, { label: editingId ? 'Guardar cambios' : 'Crear recibo' , type: 'submit', loading: saving, leftIcon: <Save size={16} /> }]} />
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar recibo"
        description={`¿Estás seguro de que deseas eliminar el recibo "${deleteConfirm?.numeroRecibo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      {canUpdate && statusConfirm && (
        <Modal open={!!statusConfirm} onClose={() => setStatusConfirm(null)} title="Cambiar estado del recibo" description="Selecciona el nuevo estado para el recibo." size="md" variant="form">
          <div className={f.form}>
            <div className={f.field}>
              <label className={f.label}>Estado</label>
              <select className={f.select} value={statusConfirm?.estado ?? ''} onChange={e => setStatusConfirm(prev => prev ? { ...prev, estado: e.target.value as Recibo['estado'] } : null)}>
                {['Borrador', 'Enviado', 'Pagado', 'Vencido', 'Cancelado'].map(es => (
                  <option key={es} value={es}>{es}</option>
                ))}
              </select>
            </div>
            <ModalFooter
              actions={[{ label: 'Cancelар', variant: 'secondary', onClick: () => setStatusConfirm(null), disabled: saving }, { label: saving ? 'Guardando...' : 'Guardar cambios' , onClick: handleChangeStatus, disabled: saving }]} />

          </div>
        </Modal>
      )}

      <Modal open={viewerOpen} onClose={handleCloseViewer} title={`Ver recibo ${selectedReceiptForViewer?.numeroRecibo ?? ''}`} description="Visualización del recibo" size="full" variant="default" closeOnOverlay={false}>
        <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {viewerLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <Loader2 size={24} className={s.spin} />
              <span>Cargando recibo...</span>
            </div>
          )}
          {viewerError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--color-danger)' }}>
              <AlertCircle size={24} />
              <span>{viewerError}</span>
            </div>
          )}
          {!viewerLoading && !viewerError && viewerBlobUrlRef.current && (
            <iframe
              src={viewerBlobUrlRef.current}
              title={`Recibo ${selectedReceiptForViewer?.numeroRecibo}`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }}
            />
          )}
        </div>
        <ModalFooter
          actions={[
            { label: 'Imprimir', variant: 'secondary', onClick: handlePrintReceipt, leftIcon: <Printer size={16} /> },
            { label: 'Descargar', variant: 'secondary', onClick: handleDownloadReceipt, leftIcon: <FileText size={16} /> },
            { label: 'Cerrar', variant: 'primary', onClick: handleCloseViewer },
          ]}
        />
      </Modal>
    </div>
  );
};
