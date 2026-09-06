import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Package, Calendar, Factory, Hash, AlertTriangle, Truck, CheckCircle2, ClipboardCheck, User, Phone, MessageSquare, ShieldCheck } from 'lucide-react';
import s from './OrderTracking.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { productionApi, type ProductionOrder } from '@/infrastructure/api/productionApi';
import type { Pedido } from '@/core/types';

type TrackingStatus = 'Recibido / Pendiente' | 'En Taller' | 'En Camino (Despachado)' | 'Entregado' | 'Con Novedad';

interface TrackingStep {
  key: TrackingStatus;
  label: TrackingStatus;
  icon: React.ReactNode;
}

const trackingSteps: TrackingStep[] = [
  { key: 'Recibido / Pendiente', label: 'Recibido / Pendiente', icon: <ClipboardCheck size={18} /> },
  { key: 'En Taller', label: 'En Taller', icon: <Factory size={18} /> },
  { key: 'En Camino (Despachado)', label: 'En Camino (Despachado)', icon: <Truck size={18} /> },
  { key: 'Entregado', label: 'Entregado', icon: <CheckCircle2 size={18} /> },
  { key: 'Con Novedad', label: 'Con Novedad', icon: <AlertTriangle size={18} /> },
];

const getTrackingState = (pedido: Pedido) => {
  const hasNovedad = /novedad|problema|reclamo|fall|daño|ausente|pendiente de revisión/i.test(pedido.observaciones || '');
  if (hasNovedad) return { status: 'Con Novedad' as TrackingStatus, hasNovedad: true };
  if (pedido.estado === 'Pendiente') return { status: 'Recibido / Pendiente' as TrackingStatus, hasNovedad: false };
  if (['Aceptado', 'En validación', 'Recibo generado', 'Listo'].includes(pedido.estado)) return { status: 'En Taller' as TrackingStatus, hasNovedad: false };
  if (pedido.estado === 'Enviado') return { status: 'En Camino (Despachado)' as TrackingStatus, hasNovedad: false };
  if (pedido.estado === 'Entregado') return { status: 'Entregado' as TrackingStatus, hasNovedad: false };
  return { status: 'Recibido / Pendiente' as TrackingStatus, hasNovedad: false };
};

export const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [productionOrder, setProductionOrder] = useState<ProductionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [reportedNovedad, setReportedNovedad] = useState(false);
  const [supportForm, setSupportForm] = useState({ tipo: 'Entrega', detalle: '', contacto: '' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const selectedOrderId = orderId ? decodeURIComponent(orderId) : searchParams.get('order');
        if (selectedOrderId) {
          const found = await ordersApi.getById(selectedOrderId);
          setPedido(found);
        } else {
          const result = await ordersApi.list();
          setPedido(result.pedidos[0] || null);
        }
      } catch {
        setError('No se pudo cargar el pedido');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [orderId, searchParams]);

  useEffect(() => {
    let active = true;
    const loadProduction = async () => {
      if (!pedido?.id) return;
      try {
        const result = await productionApi.list({ pedidoId: pedido.id });
        if (!active) return;
        const po = result.find((p) => p.pedidoId === pedido.id);
        setProductionOrder(po ?? null);
      } catch {
        setProductionOrder(null);
      }
    };
    void loadProduction();
    return () => { active = false; };
  }, [pedido?.id]);

  const trackingState = pedido ? getTrackingState(pedido) : { status: 'Recibido / Pendiente' as TrackingStatus, hasNovedad: false };
  const currentStepIndex = trackingSteps.findIndex((step) => step.key === trackingState.status);
  const hasNovedad = trackingState.hasNovedad || reportedNovedad;
  const totalPrendas = pedido?.itemsList?.reduce((sum, item) => sum + item.cantidad, 0) || pedido?.items || 0;

  const submitSupport = async () => {
    if (!pedido) return;
    if (!supportForm.detalle.trim()) {
      toast.error('Describe la novedad o problema del pedido.');
      return;
    }
    const observaciones = `${pedido.observaciones || ''}\nNovedad reportada el ${new Date().toLocaleDateString('es-CO')}: ${supportForm.detalle}`.trim();
    await ordersApi.updateStatus(pedido.id, pedido.estado);
    setPedido((prev) => prev ? { ...prev, observaciones } : null);
    toast.success('Novedad reportada correctamente. El equipo de soporte revisará tu caso.');
    setReportedNovedad(true);
    setSupportOpen(false);
    setSupportForm({ tipo: 'Entrega', detalle: '', contacto: '' });
  };

  const tallerNombre = productionOrder?.taller?.nombre || 'Pendiente de asignación';
  const operarioNombre = productionOrder?.operario?.nombre;

  const domiciliarioAsignado = {
    nombre: operarioNombre || 'Sin asignar',
    telefono: productionOrder?.operario?.telefono || (operarioNombre ? '' : 'Sin asignar'),
    iniciales: operarioNombre ? operarioNombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '—',
  };

  const resumenCards = useMemo(() => pedido ? [
    { label: 'Número de orden', value: pedido.id, icon: <Hash size={18} />, accent: 'var(--color-info)' },
    { label: 'Fecha de compra', value: pedido.fecha, icon: <Calendar size={18} />, accent: 'var(--color-accent)' },
    { label: 'Taller asignado', value: tallerNombre, icon: <Factory size={18} />, accent: 'var(--color-warning, #f59e0b)' },
    { label: 'Total prendas/unidades', value: String(totalPrendas), icon: <Package size={18} />, accent: 'var(--color-success)' },
  ] : [], [pedido, totalPrendas, tallerNombre]);

  if (loading) {
    return (
      <div className={s.trackingPage}>
        <div className={s.emptyState}>
          <Package size={44} className={s.emptyIcon} />
          <h1 className={s.pageTitle}>Seguimiento de Pedido</h1>
          <p className={s.pageSubtitle}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className={s.trackingPage}>
        <div className={s.emptyState}>
          <Package size={44} className={s.emptyIcon} />
          <h1 className={s.pageTitle}>Seguimiento de Pedido</h1>
          <p className={s.pageSubtitle}>{error || 'No encontramos un pedido para mostrar.'}</p>
          <Button onClick={() => navigate('/cliente/pedidos')}>
            <ArrowLeft size={16} />
            Volver a Mis Pedidos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.trackingPage}>
      <div className={s.pageHeader}>
        <div>
          <div className={s.eyebrow}>Order Tracking</div>
          <h1 className={s.pageTitle}>Seguimiento de Pedido</h1>
          <p className={s.pageSubtitle}>Consulta el estado, prendas y acciones disponibles para tu orden.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/cliente/pedidos')}>
          <ArrowLeft size={16} />
          Regresar
        </Button>
      </div>

      {hasNovedad && (
        <div className={s.alertNovedad}>
          <AlertTriangle size={18} />
          <div>
            <strong>Hay una novedad activa en este pedido</strong>
            <span>El equipo de soporte revisará el caso y se comunicará contigo pronto.</span>
          </div>
        </div>
      )}

      <div className={s.summaryGrid}>
        {resumenCards.map((card) => (
          <div key={card.label} className={s.summaryCard}>
            <div className={s.summaryIcon} style={{ background: `${card.accent}14`, color: card.accent }}>
              {card.icon}
            </div>
            <div>
              <span className={s.summaryLabel}>{card.label}</span>
              <strong className={s.summaryValue}>{card.value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className={s.timelineCard}>
        <div className={s.timelineHeader}>
          <div>
            <h2 className={s.sectionTitle}>Línea de tiempo</h2>
            <p className={s.sectionSubtitle}>Estado actual: <strong>{trackingState.status}</strong></p>
          </div>
          <StatusBadge status={trackingState.status} />
        </div>

        <div className={s.timeline}>
          {trackingSteps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex || (!hasNovedad && index < currentStepIndex);
            const isWarning = hasNovedad && step.key === 'Con Novedad';
            return (
              <div key={step.key} className={`${s.step} ${isActive ? s.stepActive : ''} ${index < currentStepIndex || (!hasNovedad && index < currentStepIndex) ? s.stepDone : ''} ${isWarning ? s.stepWarning : ''}`}>
                <div className={s.stepConnector} />
                <div className={s.stepIconWrapper}>
                  {step.icon}
                </div>
                <div className={s.stepBody}>
                  <strong>{step.label}</strong>
                  <span>{isWarning ? 'Requiere atención' : isActive ? 'Estado actual' : isDone ? 'Completado' : 'Pendiente'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.contentGrid}>
        <section className={s.sectionCard}>
          <div className={s.sectionHeader}>
            <Package size={18} />
            <div>
              <h2 className={s.sectionTitle}>Detalle de las prendas</h2>
              <p className={s.sectionSubtitle}>{totalPrendas} unidades registradas en esta orden</p>
            </div>
          </div>
          <div className={s.tableWrapper}>
            <table className={s.productsTable}>
              <thead>
                <tr>
                  <th>Nombre de la prenda</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {(pedido.itemsList || []).map((item, index) => (
                  <tr key={`${item.nombre}-${index}`}>
                    <td>{item.nombre}</td>
                    <td>Prenda / Textil</td>
                    <td>{item.cantidad}</td>
                    <td className={s.referenceCell}>REF-{String(index + 1).padStart(3, '0')}</td>
                  </tr>
                ))}
                {(pedido.itemsList || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className={s.emptyRow}>No hay detalle de prendas registrado para esta orden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={s.sidePanel}>
          <div className={s.actionCard}>
            <h2 className={s.sectionTitle}>Acciones del pedido</h2>
            <p className={s.sectionSubtitle}>Gestiona soporte, envío y novedades desde aquí.</p>
            <div className={s.actionButtons}>
              <Button className={s.actionButton} onClick={() => setShipmentOpen(true)}>
                <Truck size={16} />
                Ver Detalles del Envío
              </Button>
              <Button variant="secondary" className={s.actionButton} onClick={() => setSupportOpen(true)}>
                <MessageSquare size={16} />
                Reportar Novedad / Soporte
              </Button>
              <Button variant="outline" className={s.actionButton} onClick={() => navigate('/cliente/pedidos')}>
                <ArrowLeft size={16} />
                Volver al historial
              </Button>
            </div>
          </div>

          <div className={s.contactCard}>
            <ShieldCheck size={18} />
            <div>
              <h3>Soporte asignado</h3>
              <p>{pedido?.asesor && pedido.asesor !== 'Sin asignar' ? `${pedido.asesor} te acompaña en el seguimiento comercial de esta orden.` : 'Tu asesor te acompaña en el seguimiento comercial de esta orden.'}</p>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={shipmentOpen} onClose={() => setShipmentOpen(false)} title="Detalles del Envío y Producción" size="lg">
        <div className={s.modalGrid}>
          <div className={s.infoBlock}>
            <div className={s.avatarLarge}>{domiciliarioAsignado.iniciales}</div>
            <div>
              <h3>Domiciliario asignado</h3>
              <p>{domiciliarioAsignado.nombre}</p>
              {domiciliarioAsignado.telefono && <div className={s.infoRow}><Phone size={14} /> {domiciliarioAsignado.telefono}</div>}
            </div>
          </div>
          <div className={s.infoBlock}>
            <Factory size={24} className={s.blockIcon} />
            <div>
              <h3>Taller asignado</h3>
              <p>{tallerNombre}</p>
              <div className={s.infoRow}><Package size={14} /> Estado: {productionOrder?.estado || 'Sin producción asignada'}</div>
            </div>
          </div>
          <div className={s.infoBlock}>
            <User size={24} className={s.blockIcon} />
            <div>
              <h3>Cliente</h3>
              <p>{pedido.cliente}</p>
              <div className={s.infoRow}><Calendar size={14} /> {pedido.fecha}</div>
            </div>
          </div>
        </div>
        <div className={s.modalActions}>
          <Button variant="secondary" onClick={() => setShipmentOpen(false)}>Cerrar</Button>
        </div>
      </Modal>

      <Modal open={supportOpen} onClose={() => setSupportOpen(false)} title="Reportar Novedad / Soporte" size="md">
        <form className={f.form}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Reporte</h3>
            <div className={f.field}>
              <label className={f.label}>Tipo de novedad</label>
              <select value={supportForm.tipo} onChange={(e) => setSupportForm({ ...supportForm, tipo: e.target.value })}>
                <option value="Entrega">Entrega</option>
                <option value="Producto">Producto / Prendas</option>
                <option value="Facturación">Facturación</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>Descripción del problema</label>
              <textarea
                className={f.textarea}
                placeholder="Ej: El pedido llegó con una referencia diferente..."
                value={supportForm.detalle}
                onChange={(e) => setSupportForm({ ...supportForm, detalle: e.target.value })}
              />
            </div>
            <div className={f.field}>
              <label className={f.label}>Teléfono o correo de contacto</label>
              <input
                className={f.input}
                placeholder="310 234 5678"
                value={supportForm.contacto}
                onChange={(e) => setSupportForm({ ...supportForm, contacto: e.target.value })}
              />
            </div>
          </div>
          <div className={f.formActions}>
            <Button variant="secondary" onClick={() => setSupportOpen(false)}>Cancelar</Button>
            <Button onClick={submitSupport}>
              <MessageSquare size={14} />
              Enviar reporte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
