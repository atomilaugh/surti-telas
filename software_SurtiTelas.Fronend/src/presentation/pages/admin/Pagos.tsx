import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, CheckCircle, AlertTriangle, Clock, FileText, CreditCard, Download, DollarSign, ChevronDown, X, Loader2, AlertCircle, Edit, Trash2, Ban, Receipt, ArrowRight, Wallet, Search } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Pagos.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '../../../shared/ui/DataTable';
import { Modal } from '../../../shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ConfirmWithReasonModal } from '@/shared/ui/ConfirmWithReasonModal';
import { Combobox } from '@/shared/ui/Combobox';
import { paymentsApi, type Payment } from '@/infrastructure/api/paymentsApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { usersApi } from '@/infrastructure/api/usersApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { useAuthStore } from '@/core/stores/authStore';
import type { Pedido } from '@/core/types';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface Factura {
  id: string;
  orderId: string;
  numeroFactura: string;
  cliente: string;
  customerId: string;
  vendedor: string;
  asesorId: string;
  total: number;
  abonado: number;
  saldo: number;
  cuotasTotales: number;
  cuotasPagadas: number;
  fechaProximaCuota: string;
  estado: 'Pendiente' | 'Parcial' | 'Pagado' | 'Vencido' | 'En Mora';
  metodoPago: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito';
  fechaCreacion: string;
  status?: string;
}

interface Abono {
  id: string;
  facturaId: string;
  numeroFactura: string;
  cliente: string;
  customerId: string;
  valor: number;
  fecha: string;
  metodoPago: string;
  concepto: string;
  recibidoPor: string;
  asesorId: string;
}

interface PaymentForm {
  amount: string;
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito';
  reference: string;
  notes: string;
}

const facturasFromPayments = (payments: Payment[]): Factura[] => {
  const seen = new Set<string>();
  return payments
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map((p) => {
      const aprobado = p.status === 'Aprobado';
      const rechazado = p.status === 'Rechazado';
      const reembolsado = p.status === 'Reembolsado';
      const total = Number(p.orderTotal ?? p.amount) || 0;
      const abonado = aprobado || reembolsado ? Number(p.amount) || 0 : 0;
      const saldo = total - abonado;
      const estado: Factura['estado'] = rechazado
        ? 'Vencido'
        : reembolsado
          ? 'Pagado'
          : aprobado
            ? 'Pagado'
            : 'Pendiente';
      return {
        id: p.id,
        orderId: p.orderId,
        numeroFactura: p.orderNumero ?? p.orderId,
        cliente: p.customerNombre ?? p.customerId,
        customerId: p.customerId,
        vendedor: p.asesorNombre ?? p.asesorId ?? 'Sin asesor',
        asesorId: p.asesorId ?? '',
        total,
        abonado,
        saldo,
        cuotasTotales: 1,
        cuotasPagadas: aprobado || reembolsado ? 1 : 0,
        fechaProximaCuota: p.paidAt ?? '-',
        estado,
        metodoPago: p.method === 'Otro' ? 'Credito' : p.method,
        fechaCreacion: p.createdAt.split('T')[0],
        status: p.status,
      };
    });
};

const abonosFromPayments = (payments: Payment[]): Abono[] => {
  const seen = new Set<string>();
  return payments
    .filter((p) => {
      if (p.status !== 'Aprobado') return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map((p) => ({
      id: p.id,
      facturaId: p.orderId,
      numeroFactura: p.orderNumero ?? p.orderId,
      cliente: p.customerNombre ?? p.customerId,
      customerId: p.customerId,
      valor: p.amount,
      fecha: (p.paidAt ?? p.createdAt).split('T')[0],
      metodoPago: p.method,
      concepto: p.reference ?? p.notes ?? 'Pago de factura',
      recibidoPor: p.asesorNombre ?? p.asesorId ?? 'Sistema',
      asesorId: p.asesorId ?? '',
    }));
};

const parsePedidoTotal = (valor: string | undefined): number => {
  if (!valor) return 0;
  const cleaned = String(valor).replace(/[^0-9]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

interface HistorialOrderCardProps {
  pedido: Pedido;
  pagos: Payment[];
  formatCurrency: (valor: number) => string;
}

const HistorialOrderCard: React.FC<HistorialOrderCardProps> = ({ pedido, pagos, formatCurrency }) => {
  const [expanded, setExpanded] = useState(false);

  const sortedPayments = useMemo(() => {
    return [...pagos].sort((a, b) => {
      const da = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.createdAt).getTime();
      const db = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.createdAt).getTime();
      return db - da;
    });
  }, [pagos]);

  const totalPedido = parsePedidoTotal(pedido.total);
  const pagosAprobados = pagos.filter(p => p.status === 'Aprobado').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const saldo = totalPedido - pagosAprobados;
  const estaPagado = saldo <= 0;

  const formatFecha = (p: Payment): string => {
    const d = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTipoPago = (p: Payment): string => {
    const notes = (p.notes ?? '').toLowerCase();
    if (notes.includes('anticipo') || p.reference?.toLowerCase().includes('anticipo')) return 'Anticipo';
    if (notes.includes('abono') || p.reference?.toLowerCase().includes('abono')) return 'Abono';
    if (notes.includes('saldo') || p.reference?.toLowerCase().includes('saldo')) return 'Saldo';
    if (notes.includes('cuota')) return 'Cuota';
    return 'Pago';
  };

  const getCuotaInfo = (p: Payment): string => {
    const notes = p.notes ?? '';
    if (!notes) return '—';
    try {
      const parsed = JSON.parse(notes);
      if (parsed.numeroCuota && parsed.totalCuotas) return `${parsed.numeroCuota}/${parsed.totalCuotas}`;
    } catch {
      const match = notes.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return '—';
  };

  const getEstadoBadge = (status: Payment['status']) => {
    switch (status) {
      case 'Aprobado': return 'success';
      case 'Pendiente': return 'warning';
      case 'Rechazado': return 'danger';
      case 'Reembolsado': return 'info';
      case 'Anulado': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className={s.historialOrderCard}>
      <div className={s.historialOrderHeader} onClick={() => setExpanded(!expanded)}>
        <div className={s.historialOrderMain}>
          <div className={s.historialOrderNumero}>{pedido.numero}</div>
          <div className={s.historialOrderMeta}>
            <span>{formatCurrency(totalPedido)}</span>
            <span className={s.historialOrderDot}>·</span>
            <span>Pagado {formatCurrency(pagosAprobados)}</span>
            <span className={s.historialOrderDot}>·</span>
            <span>Saldo {formatCurrency(saldo)}</span>
          </div>
        </div>
        <div className={s.historialOrderActions}>
          <StatusBadge status={estaPagado ? 'success' : 'warning'} label={estaPagado ? 'Totalmente pagado' : 'Saldo pendiente'} />
          <button className={s.historialOrderToggle} type="button">
            <ChevronDown size={16} className={expanded ? s.historialOrderToggleOpen : ''} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={s.historialOrderBody}>
          {sortedPayments.length === 0 ? (
            <div className={s.historialNoPayments}>Sin pagos registrados</div>
          ) : (
            <table className={s.historialPaymentsTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cuota</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p) => (
                  <tr key={p.id}>
                    <td className={s.historialTd}>{formatFecha(p)}</td>
                    <td className={s.historialTd}>{getTipoPago(p)}</td>
                    <td className={s.historialTdCenter}>{getCuotaInfo(p)}</td>
                    <td className={`${s.historialTd} ${s.historialTdRight}`}>{formatCurrency(p.amount)}</td>
                    <td className={s.historialTd}><StatusBadge status={getEstadoBadge(p.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminPagos: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Pendiente' | 'Parcial' | 'Pagado' | 'Vencido' | 'En Mora'>('Todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('Todos');
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [nuevoAbono, setNuevoAbono] = useState<{ valor: string; metodo: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito'; concepto: string; fecha: string }>({ valor: '', metodo: 'Transferencia', concepto: '', fecha: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Factura | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Factura | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    method: 'Transferencia',
    reference: '',
    notes: '',
  });

  const [saldoClienteSearch, setSaldoClienteSearch] = useState('');
  const [saldoClienteSelected, setSaldoClienteSelected] = useState<{ id: string; nombre: string } | null>(null);
  const [saldoCliente, setSaldoCliente] = useState<{ customerId: string; totalPaid: number; pending: number } | null>(null);
  const [saldoQuoteSearch, setSaldoQuoteSearch] = useState('');
  const [saldoQuoteSelected, setSaldoQuoteSelected] = useState<{ id: string; nombre: string } | null>(null);
  const [cotizacionesCliente, setCotizacionesCliente] = useState<{ quoteId: string; numero?: string; total: number; totalPaid: number; saldo: number; porcentajeAnticipo: number; valorAnticipo: number }[]>([]);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<{ quoteId: string; numero?: string; total: number; totalPaid: number; saldo: number; porcentajeAnticipo: number; valorAnticipo: number } | null>(null);
  const [_saldoQuote, setSaldoQuote] = useState<{ quoteId: string; total: number; totalPaid: number; saldo: number; porcentajeAnticipo: number; valorAnticipo: number } | null>(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [clientesOptions, setClientesOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [historialSearch, setHistorialSearch] = useState('');
  const [historialClienteId, setHistorialClienteId] = useState<string | null>(null);
  const [historialClienteNombre, setHistorialClienteNombre] = useState('');
  const [_historialClienteEmail, setHistorialClienteEmail] = useState('');
  const [historialOrders, setHistorialOrders] = useState<Pedido[]>([]);
  const [historialPayments, setHistorialPayments] = useState<Payment[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = useAuthStore.getState().user;
      const isAdmin = user?.role === 'admin';

      let clientesIds = new Set<string>();
      if (!isAdmin) {
        const clientesResult = await usersApi.list({ limit: 100, role: 'CLIENTE' });
        clientesIds = new Set(clientesResult.map(c => c.id));
      }

      const [paymentsData, ordersData] = await Promise.all([
        paymentsApi.list({ search: debouncedSearch || undefined }),
        ordersApi.list({ search: debouncedSearch || undefined }),
      ]);

      const pagosFiltrados = isAdmin ? paymentsData : paymentsData.filter(p => clientesIds.has(p.customerId));
      const allOrders = isAdmin
        ? (ordersData.pedidos ?? []).filter(o => typeof o.clienteId === 'string' && o.clienteId.trim().length > 0)
        : (ordersData.pedidos ?? []).filter(o => typeof o.clienteId === 'string' && o.clienteId.trim().length > 0 && clientesIds.has(o.clienteId));

      const pagosPorPedido = new Map(pagosFiltrados.map(p => [p.orderId, p]));
      const acceptedOrders = allOrders.filter(o => o.estado === 'Aceptado');
      const deliveredOrders = allOrders.filter(o => o.estado === 'Entregado');
      const ordersSinPago = acceptedOrders.filter(o => !pagosPorPedido.has(o.id));
      const deliveredSinPago = deliveredOrders.filter(o => !pagosPorPedido.has(o.id));

      const pagosDesdePedidos: Payment[] = [
        ...ordersSinPago.map((o): Payment => ({
          id: o.id,
          orderId: o.id,
          customerId: o.clienteId ?? '',
          asesorId: o.asesorId,
          amount: Number(o.total) || 0,
          method: 'Transferencia',
          status: 'Pendiente',
          reference: o.observaciones ?? undefined,
          notes: 'Pago pendiente por pedido aceptado',
          paidAt: undefined,
          createdAt: o.fecha,
          updatedAt: o.fecha,
          orderNumero: o.numero,
          customerNombre: o.cliente,
          asesorNombre: o.asesor,
          orderTotal: Number(o.total) || 0,
          orderEstado: o.estado,
        })),
        ...deliveredSinPago.map((o): Payment => ({
          id: o.id,
          orderId: o.id,
          customerId: o.clienteId ?? '',
          asesorId: o.asesorId,
          amount: Number(o.total) || 0,
          method: 'Transferencia',
          status: 'Aprobado',
          reference: o.observaciones ?? undefined,
          notes: 'Pago completado por pedido entregado',
          paidAt: o.fecha,
          createdAt: o.fecha,
          updatedAt: o.fecha,
          orderNumero: o.numero,
          customerNombre: o.cliente,
          asesorNombre: o.asesor,
          orderTotal: Number(o.total) || 0,
          orderEstado: o.estado,
        })),
        ...allOrders
          .filter(o => (o.estado === 'Aceptado' || o.estado === 'Entregado') && pagosPorPedido.has(o.id))
          .map((o): Payment => pagosPorPedido.get(o.id)!),
      ];

      setPayments([...pagosFiltrados, ...pagosDesdePedidos]);
    } catch {
      setError('No se pudieron cargar los pagos. Intenta nuevamente.');
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const handler = () => {
      void loadPayments();
    };
    window.addEventListener('receipt:paid', handler as EventListener);
    return () => window.removeEventListener('receipt:paid', handler as EventListener);
  }, [loadPayments]);

  const facturas = useMemo(() => facturasFromPayments(payments), [payments]);
  const abonos = useMemo(() => abonosFromPayments(payments), [payments]);

  const filteredFacturas = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return facturas.filter(f => {
      const matchEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
      const matchMetodo = filtroMetodo === 'Todos' || f.metodoPago === filtroMetodo;
      const matchSearch = !q || f.cliente.toLowerCase().includes(q) || f.numeroFactura.toLowerCase().includes(q) || f.vendedor.toLowerCase().includes(q);
      return matchEstado && matchMetodo && matchSearch;
    });
  }, [filtroEstado, filtroMetodo, facturas, debouncedSearch]);

  const metodosUnicos = Array.from(new Set(facturas.map(f => f.metodoPago)));

  const getMetodoIcon = (metodo: string) => {
    switch (metodo) {
      case 'Efectivo': return <DollarSign size={14} />;
      case 'Transferencia': return <FileText size={14} />;
      case 'Tarjeta': return <CreditCard size={14} />;
      case 'Credito': return <CreditCard size={14} />;
      default: return <DollarSign size={14} />;
    }
  };

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
  };

  const stats = {
    totalFacturado: facturas.reduce((sum, f) => sum + (Number(f.total) || 0), 0),
    totalAbonado: facturas.reduce((sum, f) => sum + (Number(f.abonado) || 0), 0),
    totalSaldo: facturas.reduce((sum, f) => sum + (Number(f.saldo) || 0), 0),
    vencidas: facturas.filter(f => f.estado === 'Vencido' || f.estado === 'En Mora').length,
    porVencer: facturas.filter(f => f.estado === 'Parcial' || f.estado === 'Pendiente').length,
  };

  const _handleVerDetalle = (factura: Factura) => {
    setSelectedFactura(factura);
  };

  const handleRegistrarAbono = (factura: Factura) => {
    setSelectedFactura(factura);
    setNuevoAbono({ valor: '', metodo: 'Transferencia', concepto: '', fecha: new Date().toISOString().split('T')[0] });
    setModalAbonoOpen(true);
  };

  const handleGuardarAbono = async () => {
    if (!selectedFactura || !nuevoAbono.valor) return;
    const valor = Number(nuevoAbono.valor);
    if (!Number.isFinite(valor) || valor <= 0 || valor > selectedFactura.saldo) {
      toast.error(`El valor del abono debe ser mayor a 0 y menor o igual al saldo pendiente (${formatCurrency(selectedFactura.saldo)})`);
      return;
    }
    try {
        await paymentsApi.create({
          orderId: selectedFactura.orderId,
          customerId: selectedFactura.customerId,
          asesorId: selectedFactura.asesorId || undefined,
          amount: valor,
          method: nuevoAbono.metodo,
          reference: nuevoAbono.concepto,
          notes: `Abono factura ${selectedFactura.numeroFactura}`,
        });
      toast.success(`Abono de ${formatCurrency(valor)} registrado para factura ${selectedFactura.numeroFactura}`);
      await loadPayments();
      setModalAbonoOpen(false);
      setNuevoAbono({ valor: '', metodo: 'Transferencia', concepto: '', fecha: '' });
    } catch {
      toast.error('No se pudo registrar el abono');
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: String(payment.amount),
      method: payment.method === 'Efectivo' ? 'Efectivo' : payment.method === 'Transferencia' ? 'Transferencia' : payment.method === 'Tarjeta' ? 'Tarjeta' : payment.method === 'Otro' ? 'Credito' : 'Otro',
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    setSaving(true);
    try {
      const updated = await paymentsApi.update(editingPayment.id, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPayments(prev => prev.map(p => p.id === editingPayment.id ? updated : p));
      toast.success('Pago actualizado correctamente');
      setEditModalOpen(false);
      setEditingPayment(null);
    } catch {
      toast.error('No se pudo actualizar el pago');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirm) return;
    try {
      await paymentsApi.remove(deleteConfirm.id);
      setPayments(prev => prev.filter(p => p.id !== deleteConfirm.id));
      toast.success('Pago eliminado');
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar el pago');
    }
  };

  const handleCancelPayment = async (motivo: string) => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await paymentsApi.cancel(cancelConfirm.id, motivo);
      toast.success('Pago anulado correctamente');
      setCancelConfirm(null);
      await loadPayments();
    } catch {
      toast.error('No se pudo anular el pago');
    } finally {
      setCancelling(false);
    }
  };

  const handleCalcularSaldoCliente = async () => {
    if (!saldoClienteSelected?.id) return;
    setLoadingSaldo(true);
    try {
      const data = await paymentsApi.getCustomerBalance(saldoClienteSelected.id);
      setSaldoCliente(data);
      toast.success('Saldo calculado');
    } catch {
      toast.error('No se pudo calcular el saldo');
    } finally {
      setLoadingSaldo(false);
    }
  };

  const handleCalcularSaldoQuote = async () => {
    if (!saldoQuoteSelected?.id) return;
    setLoadingSaldo(true);
    try {
      const cotizaciones = await paymentsApi.listQuotesByCustomer(saldoQuoteSelected.id);
      setCotizacionesCliente(cotizaciones);
      if (cotizaciones.length === 0) {
        toast.info('Este cliente no tiene cotizaciones pendientes.');
      }
      setCotizacionSeleccionada(null);
      setSaldoQuote(null);
    } catch {
      toast.error('No se pudieron cargar las cotizaciones');
    } finally {
      setLoadingSaldo(false);
    }
  };

  const handleSeleccionarCotizacion = async (cotizacion: { quoteId: string; numero?: string; total: number; totalPaid: number; saldo: number; porcentajeAnticipo: number; valorAnticipo: number }) => {
    setCotizacionSeleccionada(cotizacion);
    setSaldoQuote(cotizacion);
  };

  const loadHistorialCliente = useCallback(async (customerId: string) => {
    setLoadingHistorial(true);
    try {
      const [ordersResult, paymentsData] = await Promise.all([
        ordersApi.list({ clienteId: customerId, limit: 100 }),
        paymentsApi.list({ customerId }),
      ]);
      const rawOrders = ordersResult.pedidos;
      setHistorialOrders(rawOrders);
      setHistorialPayments(paymentsData);
      const first = rawOrders[0];
      setHistorialClienteEmail(first?.asesorEmail ?? '');
    } catch {
      setHistorialOrders([]);
      setHistorialPayments([]);
      setHistorialClienteEmail('');
      toast.error('No se pudo cargar el historial del cliente');
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    const term = historialSearch.trim();
    if (term.length < 2) {
      setClientesOptions([]);
      return;
    }
    setLoadingClientes(true);
    let cancelled = false;
    customersApi.list({ search: term, limit: 10 }).then((result) => {
      if (cancelled) return;
      const options = (result.data ?? [])
        .filter((c) => c.estado === 'Activo')
        .map((c) => ({ value: c.id, label: [c.nombre, c.apellidos].filter(Boolean).join(' ') }));
      setClientesOptions(options);
    }).catch(() => {
      if (!cancelled) setClientesOptions([]);
    }).finally(() => {
      if (!cancelled) setLoadingClientes(false);
    });
    return () => { cancelled = true; };
  }, [historialSearch]);

  const handleExportPdf = async (payment: Payment) => {
    try {
      const blob = await paymentsApi.exportPdf(payment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pago-${payment.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo generar el PDF');
    }
  };

  const abonosDeFactura = (facturaId: string) => abonos.filter(a => a.facturaId === facturaId);

  return (
    <div>
      {loading && (
        <div className={s.header}>
          <div>
            <h1 className={s.pageTitle}>Pagos, abonos y financiación</h1>
            <p className={s.pageSubtitle}>Registro y gestión de pagos parciales y planes de financiación</p>
          </div>
          <div className={s.headerActions}>
            <Loader2 size={20} className={s.loadingSpinner} />
            <span className={s.loadingText}>Cargando pagos…</span>
          </div>
        </div>
      )}

      {error && (
        <div className={s.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void loadPayments()}>Reintentar</Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={s.header}>
            <div>
              <h1 className={s.pageTitle}>Pagos, abonos y financiación</h1>
              <p className={s.pageSubtitle}>Registro y gestión de pagos parciales y planes de financiación</p>
            </div>
            <div className={s.headerActions}>
              <Button leftIcon={<Plus size={16} />} onClick={() => {
                const pendiente = facturas.find(f => f.saldo > 0);
                if (pendiente) {
                  handleRegistrarAbono(pendiente);
                } else {
                  toast.info('No hay facturas con saldo pendiente para registrar abono');
                }
              }}>
                Nuevo abono
              </Button>
            </div>
          </div>

          <div className={s.statsRow}>
            <div className={s.statCard}>
              <DollarSign size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{formatCurrency(stats.totalFacturado)}</div>
                <div className={s.statLabel}>Total Facturado</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <CheckCircle size={20} className={s.statIconSuccess} />
              <div>
                <div className={s.statValue}>{formatCurrency(stats.totalAbonado)}</div>
                <div className={s.statLabel}>Total Abonado</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <Clock size={20} className={s.statIconWarning} />
              <div>
                <div className={s.statValue}>{formatCurrency(stats.totalSaldo)}</div>
                <div className={s.statLabel}>Saldo Pendiente</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <AlertTriangle size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{stats.vencidas}</div>
                <div className={s.statLabel}>En Mora / Vencidas</div>
              </div>
            </div>
            <div className={s.statCard}>
              <FileText size={20} className={s.statIconPrimary} />
              <div>
                <div className={s.statValue}>{stats.porVencer}</div>
                <div className={s.statLabel}>Por Vencer</div>
              </div>
            </div>
          </div>

          <div className={s.toolbar}>
            <SearchInput
              placeholder="Buscar por pedido, cliente o vendedor..."
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
                {['Todos', 'Pendiente', 'Parcial', 'Pagado', 'Vencido', 'En Mora'].map(estado => (
                  <button
                    key={estado}
                    className={`${s.filterBtn} ${filtroEstado === estado ? s.filterBtnActive : ''}`}
                    onClick={() => setFiltroEstado(estado as typeof filtroEstado)}
                  >
                    {estado}
                  </button>
                ))}
              </div>
              <div className={s.filterGroup}>
                {['Todos', ...metodosUnicos].map(metodo => (
                  <button
                    key={metodo}
                    className={`${s.filterBtn} ${filtroMetodo === metodo ? s.filterBtnActive : ''}`}
                    onClick={() => setFiltroMetodo(metodo)}
                  >
                    {metodo !== 'Todos' && getMetodoIcon(metodo)}
                    {metodo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={s.financialCard}>
            <div className={s.financialHeader}>
              <h2 className={s.financialTitle}>Consulta de saldos y cotizaciones</h2>
              <p className={s.financialDescription}>Consulta rápidamente los pagos realizados, saldos pendientes y cotizaciones de un cliente.</p>
            </div>
            <div className={s.financialGrid}>
              <div className={s.financialBlock}>
                <div className={s.financialBlockHeader}>
                  <div className={s.financialBlockIcon}>
                    <Wallet size={16} />
                  </div>
                  <div>
                    <div className={s.financialBlockTitle}>Saldo del cliente</div>
                    <div className={s.financialBlockDesc}>Selecciona un cliente para consultar sus pagos y saldo pendiente.</div>
                  </div>
                </div>
                <Combobox
                  label=""
                  placeholder="Buscar cliente por nombre..."
                  options={clientesOptions}
                  value={saldoClienteSearch}
                  onValueChange={(option) => {
                    setSaldoClienteSearch(option.label);
                    const found = clientesOptions.find((o) => o.value === option.value);
                    if (found) {
                      setSaldoClienteSelected({ id: found.value, nombre: found.label });
                    } else {
                      setSaldoClienteSelected(null);
                    }
                  }}
                  loading={loadingClientes}
                  allowCreate={false}
                />
                <div className={s.financialBlockActions}>
                  <Button type="button" onClick={handleCalcularSaldoCliente} disabled={loadingSaldo || !saldoClienteSelected?.id}>Consultar saldo</Button>
                </div>
                {!saldoClienteSelected && !saldoCliente && (
                  <div className={s.financialEmpty}>Selecciona un cliente para consultar su saldo.</div>
                )}
                {saldoClienteSelected && !saldoCliente && !loadingSaldo && (
                  <div className={s.clientResult}>
                    <div className={s.clientName}>{saldoClienteSelected.nombre}</div>
                    <div className={s.financialEmpty}>Presiona "Consultar saldo" para ver el resumen financiero.</div>
                  </div>
                )}
                {loadingSaldo && saldoClienteSelected && (
                  <div className={s.clientResult}>
                    <div className={s.clientName}>{saldoClienteSelected.nombre}</div>
                    <div className={s.financialEmpty}>Cargando información financiera...</div>
                  </div>
                )}
                {saldoCliente && (
                  <div className={s.clientResult}>
                    <div className={s.clientName}>{saldoClienteSelected?.nombre}</div>
                    <div className={s.balanceGrid}>
                      <div className={s.balanceCard}>
                        <div className={s.balanceCardLabel}>Total abonado</div>
                        <div className={s.balanceCardValue}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(saldoCliente.totalPaid || 0)}</div>
                      </div>
                      <div className={`${s.balanceCard} ${s.balanceCardEmphasis}`}>
                        <div className={s.balanceCardLabel}>Saldo pendiente</div>
                        <div className={s.balanceCardValue}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(saldoCliente.pending || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className={s.financialBlock}>
                <div className={s.financialBlockHeader}>
                  <div className={s.financialBlockIcon}>
                    <Receipt size={16} />
                  </div>
                  <div>
                    <div className={s.financialBlockTitle}>Cotizaciones del cliente</div>
                    <div className={s.financialBlockDesc}>Selecciona una cotización para consultar su saldo.</div>
                  </div>
                </div>
                <Combobox
                  label=""
                  placeholder="Buscar cliente por nombre..."
                  options={clientesOptions}
                  value={saldoQuoteSearch}
                  onValueChange={(option) => {
                    setSaldoQuoteSearch(option.label);
                    const found = clientesOptions.find((o) => o.value === option.value);
                    if (found) {
                      setSaldoQuoteSelected({ id: found.value, nombre: found.label });
                    } else {
                      setSaldoQuoteSelected(null);
                    }
                  }}
                  loading={loadingClientes}
                  allowCreate={false}
                />
                <div className={s.financialBlockActions}>
                  <Button type="button" onClick={handleCalcularSaldoQuote} disabled={loadingSaldo || !saldoQuoteSelected?.id}>Buscar cotizaciones</Button>
                </div>
                {!saldoQuoteSelected && cotizacionesCliente.length === 0 && (
                  <div className={s.financialEmpty}>Selecciona un cliente para ver sus cotizaciones.</div>
                )}
                {saldoQuoteSelected && cotizacionesCliente.length === 0 && !loadingSaldo && (
                  <div className={s.financialEmpty}>Este cliente no tiene cotizaciones disponibles.</div>
                )}
                {loadingSaldo && saldoQuoteSelected && (
                  <div className={s.financialEmpty}>Cargando cotizaciones...</div>
                )}
                {cotizacionesCliente.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {cotizacionesCliente.map((cotizacion) => (
                      <button
                        key={cotizacion.quoteId}
                        type="button"
                        onClick={() => handleSeleccionarCotizacion(cotizacion)}
                        className={`${s.quoteCard} ${cotizacionSeleccionada?.quoteId === cotizacion.quoteId ? s.quoteCardSelected : ''}`}
                      >
                        <div className={s.quoteCardInfo}>
                          <div className={s.quoteCardNumber}>{cotizacion.numero ?? `COT-${cotizacion.quoteId.slice(-4)}`}</div>
                          <div className={s.quoteCardMeta}>{cotizacionSeleccionada?.quoteId === cotizacion.quoteId ? 'Seleccionada' : 'Toca para ver detalle'}</div>
                        </div>
                        <div className={s.quoteCardValues}>
                          <div className={s.quoteCardValue}>
                            <span className={s.quoteCardValueLabel}>Total</span>
                            <span className={s.quoteCardValueAmount}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cotizacion.total || 0)}</span>
                          </div>
                          <div className={s.quoteCardValue}>
                            <span className={s.quoteCardValueLabel}>Pagado</span>
                            <span className={s.quoteCardValueAmount}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cotizacion.totalPaid || 0)}</span>
                          </div>
                          <div className={s.quoteCardValue}>
                            <span className={s.quoteCardValueLabel}>Saldo</span>
                            <span className={s.quoteCardValueAmount}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cotizacion.saldo || 0)}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} className={s.quoteCardArrow} />
                      </button>
                    ))}
                    {cotizacionesCliente.length > 0 && (
                      <div className={s.quoteCardFooter}>
                        <span className={s.quoteCardAnticipo}>Anticipo: <strong>{cotizacionesCliente[0].porcentajeAnticipo || 0}%</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={s.historialCard}>
            <div className={s.historialHeader}>
              <div className={s.historialHeaderIcon}>
                <Clock size={16} />
              </div>
              <div className={s.historialHeaderText}>
                <h2 className={s.historialTitle}>Historial por cliente</h2>
                <p className={s.historialDescription}>Consulta pedidos, pagos recibidos y saldo pendiente.</p>
              </div>
            </div>
            <div className={s.historialToolbar}>
              <div className={s.historialSearchBox}>
                <span className={s.historialSearchIcon}><Search size={14} /></span>
                <input
                  className={s.historialSearchInput}
                  placeholder="Buscar cliente por nombre..."
                  value={historialSearch}
                  onChange={(e) => setHistorialSearch(e.target.value)}
                />
                {historialSearch && (
                  <button className={s.historialSearchClear} onClick={() => { setHistorialSearch(''); setHistorialClienteId(null); setHistorialClienteNombre(''); setHistorialClienteEmail(''); setHistorialOrders([]); setHistorialPayments([]); }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {historialClienteId && (
                <div className={s.historialClientChip}>
                  <span className={s.historialClientChipText}>{historialClienteNombre}</span>
                  <button className={s.historialClientChipClear} onClick={() => { setHistorialClienteId(null); setHistorialClienteNombre(''); setHistorialClienteEmail(''); setHistorialOrders([]); setHistorialPayments([]); }}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {historialSearch.length >= 2 && (
              <div className={s.autocompleteList}>
                {clientesOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${s.autocompleteItem} ${historialClienteId === option.value ? s.autocompleteItemActive : ''}`}
                    onClick={() => {
                      setHistorialClienteId(option.value);
                      setHistorialClienteNombre(option.label);
                      void loadHistorialCliente(option.value);
                    }}
                  >
                    <span className={s.autocompleteLabel}>{option.label}</span>
                  </button>
                ))}
                {clientesOptions.length === 0 && !loadingClientes && (
                  <div className={s.autocompleteEmpty}>Sin resultados</div>
                )}
              </div>
            )}

            {!historialClienteId && !loadingHistorial && (
              <div className={s.historialEmpty}>
                <Search size={28} />
                <div className={s.historialEmptyTitle}>Selecciona un cliente para consultar su historial</div>
                <div className={s.historialEmptyDesc}>Busca y selecciona un cliente para visualizar sus pedidos, pagos y saldo pendiente.</div>
              </div>
            )}

            {loadingHistorial && historialClienteId && (
              <div className={s.historialLoading}>Cargando historial...</div>
            )}

            {!loadingHistorial && historialClienteId && historialOrders.length === 0 && (
              <div className={s.historialEmpty}>Este cliente no tiene pedidos asociados.</div>
            )}

            {!loadingHistorial && historialClienteId && historialOrders.length > 0 && (() => {
              const paymentsByOrderId = new Map<string, Payment[]>();
              historialPayments.forEach((p) => {
                if (!paymentsByOrderId.has(p.orderId)) paymentsByOrderId.set(p.orderId, []);
                paymentsByOrderId.get(p.orderId)!.push(p);
              });

              interface PedidoConPagos {
                order: Pedido;
                pagos: Payment[];
                total: number;
                pagosAprobados: number;
                saldo: number;
              }

              const pedidosConPagos: PedidoConPagos[] = historialOrders.map((order) => {
                const pays = paymentsByOrderId.get(order.id) ?? [];
                const totalPedido: number = parsePedidoTotal(order.total);
                const pagosAprobados = pays.filter(p => p.status === 'Aprobado').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const saldo = totalPedido - pagosAprobados;
                return { order, pagos: pays, total: totalPedido, pagosAprobados, saldo };
              });

              const totalPedidos = pedidosConPagos.length;
              const totalComprado = pedidosConPagos.reduce((sum, o) => sum + o.total, 0);
              const totalRecibido = pedidosConPagos.reduce((sum, o) => sum + o.pagosAprobados, 0);
              const saldoPendiente = totalComprado - totalRecibido;

              return (
                <>
                  <div className={s.historialStatsRow}>
                    <div className={s.historialStatCard}>
                      <div className={s.historialStatValue}>{totalPedidos}</div>
                      <div className={s.historialStatLabel}>Pedidos</div>
                    </div>
                    <div className={s.historialStatCard}>
                      <div className={s.historialStatValue}>{formatCurrency(totalComprado)}</div>
                      <div className={s.historialStatLabel}>Total comprado</div>
                    </div>
                    <div className={`${s.historialStatCard} ${s.historialStatCardSuccess}`}>
                      <div className={s.historialStatValue}>{formatCurrency(totalRecibido)}</div>
                      <div className={s.historialStatLabel}>Total recibido</div>
                    </div>
                    <div className={`${s.historialStatCard} ${saldoPendiente > 0 ? s.historialStatCardWarning : s.historialStatCardSuccess}`}>
                      <div className={s.historialStatValue}>{formatCurrency(saldoPendiente)}</div>
                      <div className={s.historialStatLabel}>Saldo pendiente</div>
                    </div>
                  </div>

                  <div className={s.historialOrdersSection}>
                    <div className={s.historialOrdersTitle}>Pedidos del cliente</div>
                    <div className={s.historialOrdersList}>
                      {pedidosConPagos.map((pedido) => (
                        <HistorialOrderCard
                          key={pedido.order.id}
                          pedido={pedido.order}
                          pagos={pedido.pagos}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <DataTable<Factura>
            data={filteredFacturas}
            pageSize={10}
            emptyMessage="No se encontraron facturas con pagos registrados"
            maxVisibleColumns={5}
            modalSize="xl"
            enableExport
            exportFileName="pagos"
            detailPanel={{
              title: (f) => `Factura ${f.numeroFactura}`,
              render: (f) => (
                <div className={s.detailPanel}>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Información de la factura</h4>
                    <div className={s.detailGrid}>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cliente</span><span>{f.cliente}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Vendedor</span><span>{f.vendedor}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Total</span><span className={s.tdBold}>{formatCurrency(f.total)}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Abonado</span><span className={s.abonadoPositive}>{formatCurrency(f.abonado)}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Saldo</span><span className={f.saldo > 0 ? s.saldoNegative : ''}>{formatCurrency(f.saldo)}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cuotas</span><span>{f.cuotasPagadas}/{f.cuotasTotales}</span></div>
                    </div>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Información adicional</h4>
                    <div className={s.detailGrid}>
                      <div className={s.detailItem}><span className={s.detailLabel}>Fecha próxima cuota</span><span>{f.fechaProximaCuota}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Método de pago</span><span>{f.metodoPago}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Fecha creación</span><span>{f.fechaCreacion}</span></div>
                    </div>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Historial de Abonos</h4>
                    {abonosDeFactura(f.orderId).length === 0 ? (
                      <p className={s.noAbonos}>Sin abonos registrados</p>
                    ) : (
                      <div className={s.abonosList}>
                        {abonosDeFactura(f.orderId).map(abono => (
                          <div key={abono.id} className={s.abonoRow}>
                            <div className={s.abonoInfo}>
                              <div className={s.abonoFecha}>{abono.fecha}</div>
                              <div className={s.abonoConcepto}>{abono.concepto}</div>
                              <div className={s.abonoMetodo}>{abono.metodoPago} · {abono.recibidoPor}</div>
                            </div>
                            <div className={s.abonoValor}>+{formatCurrency(abono.valor)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            }}
            actions={(f) => [
              ...(f.saldo > 0 ? [{ label: 'Registrar abono', icon: <DollarSign size={14} />, onClick: () => handleRegistrarAbono(f) }] : []),
              ...(f.estado !== 'Pagado' ? [{ label: 'Aprobar', icon: <CheckCircle size={14} />, onClick: async () => { await paymentsApi.updateStatus(f.id, 'Aprobado'); await loadPayments(); toast.success(`Pago ${f.numeroFactura} aprobado`); } }] : []),
              ...(f.estado === 'Pendiente' || f.estado === 'Parcial' ? [{ label: 'Rechazar', icon: <X size={14} />, onClick: async () => { await paymentsApi.updateStatus(f.id, 'Rechazado'); await loadPayments(); toast.success(`Pago ${f.numeroFactura} rechazado`); } }] : []),
              ...(f.estado === 'Pagado' ? [{ label: 'Reembolsar', icon: <Download size={14} />, onClick: async () => { await paymentsApi.updateStatus(f.id, 'Reembolsado'); await loadPayments(); toast.success(`Pago ${f.numeroFactura} reembolsado`); } }] : []),
               { label: 'Editar', icon: <Edit size={14} />, onClick: () => handleEditPayment(payments.find(p => p.id === f.id)!) },
               ...(f.status !== 'ANULADO' ? [{ label: 'Anular', icon: <Ban size={14} />, onClick: () => setCancelConfirm(f), danger: true }] : []),
               ...(f.status === 'ANULADO' ? [{ label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(f), danger: true }] : []),
               { label: 'PDF', icon: <FileText size={14} />, onClick: () => handleExportPdf(payments.find(p => p.id === f.id)!) },
             ]}
            columns={[
              { key: 'numeroFactura', header: 'N° Pedido/Cotización', width: '140px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar número...', render: (f) => <span className={s.tdPrimary}>{f.numeroFactura}</span> },
              { key: 'cliente', header: 'Cliente', sortable: true, filterable: true, render: (f) => f.cliente },
              { key: 'total', header: 'Total', width: '120px', sortable: true, align: 'right', render: (f) => <span className={`${s.tdRight} ${s.tdBold}`}>{formatCurrency(f.total)}</span> },
              { key: 'saldo', header: 'Saldo', width: '120px', sortable: true, align: 'right', render: (f) => <span className={`${s.tdRight} ${f.saldo > 0 ? s.saldoNegative : ''}`}>{formatCurrency(f.saldo)}</span> },
              { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
                { value: 'Pendiente', label: 'Pendiente' },
                { value: 'Parcial', label: 'Parcial' },
                { value: 'Pagado', label: 'Pagado' },
                { value: 'Vencido', label: 'Vencido' },
                { value: 'En Mora', label: 'En Mora' },
              ], render: (f) => (
                <StatusBadge status={f.estado} />
              )},
            ]}
          />
        </>
      )}

      <Modal
        open={modalAbonoOpen}
        onClose={() => setModalAbonoOpen(false)}
        title="Registrar abono"
        size="md"
        variant="form"
      >
        <div className={f.form}>
          {selectedFactura && (
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Información de la factura</h3>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Cliente</label>
                  <input type="text" className={f.input} value={selectedFactura.cliente} readOnly />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Pedido / Cotización</label>
                  <input type="text" className={f.input} value={selectedFactura.numeroFactura} readOnly />
                </div>
              </div>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Saldo pendiente</label>
                  <input type="text" className={f.input} value={formatCurrency(selectedFactura.saldo)} readOnly />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Método de pago</label>
                  <select
                    className={f.select}
                    value={nuevoAbono.metodo}
                    onChange={e => setNuevoAbono({ ...nuevoAbono, metodo: e.target.value as 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito' })}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Detalle del abono</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Valor del abono *</label>
                <input
                  type="number"
                  className={f.input}
                  value={nuevoAbono.valor}
                  onChange={e => setNuevoAbono({ ...nuevoAbono, valor: e.target.value })}
                  placeholder="Ingrese el valor"
                  min={1}
                  max={selectedFactura?.saldo ?? 0}
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Fecha</label>
                <input
                  type="date"
                  className={f.input}
                  value={nuevoAbono.fecha}
                  onChange={e => setNuevoAbono({ ...nuevoAbono, fecha: e.target.value })}
                />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Concepto / Observación</label>
                <input
                  type="text"
                  className={f.input}
                  value={nuevoAbono.concepto}
                  onChange={e => setNuevoAbono({ ...nuevoAbono, concepto: e.target.value })}
                  placeholder="Ej: Abono cuota 2/3"
                />
              </div>
            </div>
          </div>

          <div className={f.formActions}>
            <ModalFooter
              actions={[{ label: 'Cancelar', variant: 'secondary', onClick: () => setModalAbonoOpen(false) }, { label: 'Guardar abono', onClick: handleGuardarAbono, leftIcon: <DollarSign size={16} /> }]} />
          </div>
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar pago" size="md" variant="form">
        <form onSubmit={e => { e.preventDefault(); handleUpdatePayment(); }} className={f.form}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información del pago</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Monto *</label>
                <input type="number" className={f.input} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required min="0" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Método de pago</label>
                <select className={f.select} value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentForm['method'] })}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Otro">Otro</option>
                  <option value="Credito">Crédito</option>
                </select>
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Detalles adicionales</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Referencia</label>
                <input type="text" className={f.input} value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Notas</label>
                <textarea className={f.textarea} value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>

          <div className={f.formActions}>
            <ModalFooter
              actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: () => setEditModalOpen(false), disabled: saving }, { label: saving ? 'Guardando...' : 'Guardar cambios' , type: 'submit', disabled: saving }]} />
          </div>
        </form>
      </Modal>

      <ConfirmWithReasonModal
        open={!!cancelConfirm}
        onClose={() => { setCancelConfirm(null); }}
        onConfirm={handleCancelPayment}
        title="Anular pago"
        description={`¿Estás seguro de que deseas anular el pago "${cancelConfirm?.id}"? Esta acción no se puede deshacer.`}
        referenceLabel={cancelConfirm ? `Pago: ${cancelConfirm.numeroFactura}` : undefined}
        confirmLabel="Anular pago"
        loading={cancelling}
      />

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeletePayment}
        title="Eliminar pago"
        description={`¿Estás seguro de que deseas eliminar el pago "${deleteConfirm?.id}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
