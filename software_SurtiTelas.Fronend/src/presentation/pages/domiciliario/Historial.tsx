import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye, MapPin, Clock, Package, AlertCircle, Phone, MessageCircle } from 'lucide-react';
import s from './Historial.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DetailModal } from '@/shared/ui/DetailModal';
import { deliveriesApi } from '@/infrastructure/api/deliveriesApi';
import { useAuthStore } from '@/core/stores/authStore';

interface Entrega {
  id: string;
  pedido: string;
  cliente: string;
  direccion: string;
  telefono?: string;
  fecha: string;
  hora: string;
  estado: 'Entregado' | 'Fallido';
  observaciones: string;
}

export const DomiciliarioHistorial: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [filterRange, setFilterRange] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setRange = useCallback((range: typeof filterRange) => {
    setFilterRange(range);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === 'hoy') {
      setDesde(today.toISOString().slice(0, 10));
      setHasta(today.toISOString().slice(0, 10));
    } else if (range === 'semana') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setDesde(start.toISOString().slice(0, 10));
      setHasta(end.toISOString().slice(0, 10));
    } else if (range === 'mes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDesde(start.toISOString().slice(0, 10));
      setHasta(end.toISOString().slice(0, 10));
    }
  }, [setFilterRange, setDesde, setHasta]);

  useEffect(() => {
    setRange('mes');
  }, [setRange]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await deliveriesApi.list(user?.uid ? { domiciliarioId: user.uid } : undefined);
        const mapped: Entrega[] = result
          .filter((d) => d.estado === 'ENTREGADO' || d.estado === 'FALLIDO')
          .map((d) => ({
            id: d.id,
            pedido: d.orderId || d.id,
            cliente: d.clienteNombre || '',
            direccion: d.direccion || '',
            telefono: (d as unknown as { telefono?: string }).telefono || '',
            fecha: d.entregadoEn ? new Date(d.entregadoEn).toISOString().slice(0, 10) : d.createdAt?.slice(0, 10) || '',
            hora: d.entregadoEn ? new Date(d.entregadoEn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '',
            estado: d.estado === 'ENTREGADO' ? 'Entregado' : 'Fallido',
            observaciones: d.notas || '',
          }));
        setEntregas(mapped);
      } catch {
        setError('No se pudo cargar el historial. Intenta nuevamente.');
        toast.error('No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) void load();
  }, [user?.uid]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Entrega[]> = {};
    entregas.forEach((e) => {
      if (!groups[e.fecha]) groups[e.fecha] = [];
      groups[e.fecha].push(e);
    });
    return groups;
  }, [entregas]);

  const filteredHistorial = useMemo(() => {
    if (!desde && !hasta) return groupedByDate;
    const desdeDate = desde ? new Date(`${desde}T00:00:00`).getTime() : undefined;
    const hastaDate = hasta ? new Date(`${hasta}T23:59:59`).getTime() : undefined;

    const result: Record<string, Entrega[]> = {};
    Object.entries(groupedByDate).forEach(([fecha, ents]) => {
      const parsed = new Date(`${fecha}T00:00:00`).getTime();
      if (Number.isNaN(parsed)) return;
      if (desdeDate !== undefined && parsed < desdeDate) return;
      if (hastaDate !== undefined && parsed > hastaDate) return;
      result[fecha] = ents;
    });
    return result;
  }, [desde, hasta, groupedByDate]);

  const totalEntregas = entregas.length;
  const exitosas = entregas.filter((e) => e.estado === 'Entregado').length;
  const fallidas = entregas.filter((e) => e.estado === 'Fallido').length;
  const tasaExito = totalEntregas > 0 ? Math.round((exitosas / totalEntregas) * 100) : 0;

  const rendimientoCards = [
    { value: String(totalEntregas), label: 'Total Entregas', sub: 'Desde inicio', color: 'default' as const },
    { value: `${tasaExito}%`, label: 'Tasa de Éxito', sub: `${exitosas} exitosas`, color: 'success' as const },
    { value: String(fallidas), label: 'Fallidas Total', sub: `${totalEntregas > 0 ? Math.round((fallidas / totalEntregas) * 100) : 0}% del total`, color: 'error' as const },
    { value: '—', label: 'Calificación', sub: 'Promedio clientes', color: 'default' as const },
  ];

  const abrirWhatsApp = (entrega: Entrega) => {
    if (!entrega.telefono) return;
    const texto = encodeURIComponent(`Hola ${entrega.cliente}, soy tu domiciliario de SurtiTelas. Te confirmo que tu pedido fue entregado.`);
    window.open(`https://wa.me/${entrega.telefono}?text=${texto}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div>
        <h1 className={s.pageTitle}>Historial</h1>
        <p className={s.pageSubtitle}>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={s.pageTitle}>Historial</h1>
        <p className={s.pageSubtitle}>{error}</p>
        <div className={s.errorState}>
          <AlertCircle size={28} />
          <span>{error}</span>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.pageTitle}>Historial</h1>
      <p className={s.pageSubtitle}>Registro de todas tus entregas</p>

      <div className={s.rendimientoGrid}>
        {rendimientoCards.map((r, i) => (
          <div key={i} className={s.rendimientoCard}>
            <div className={`${s.rendimientoValue} ${r.color === 'success' ? s.rendimientoValueSuccess : r.color === 'error' ? s.rendimientoValueError : ''}`}>
              {r.value}
            </div>
            <div className={s.rendimientoLabel}>{r.label}</div>
            <div className={s.rendimientoSub}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div className={s.historialFilters}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['hoy', 'semana', 'mes', 'custom'] as const).map((range) => (
            <button
              key={range}
              className={`${s.dateRangeGroup} ${filterRange === range ? s.dateRangeGroupActive : ''}`}
              onClick={() => setRange(range)}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: filterRange === range ? 'var(--color-accent)' : 'var(--color-bg-card)', color: filterRange === range ? 'var(--text-inverse)' : 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {range === 'hoy' ? 'Hoy' : range === 'semana' ? 'Semana' : range === 'mes' ? 'Mes' : 'Personalizado'}
            </button>
          ))}
        </div>
        <div className={s.dateRangeGroup}>
          <span className={s.dateRangeLabel}>Desde:</span>
          <input type="date" className={s.dateInput} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className={s.dateRangeGroup}>
          <span className={s.dateRangeLabel}>Hasta:</span>
          <input type="date" className={s.dateInput} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>

      {Object.keys(filteredHistorial).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          No hay entregas en el rango seleccionado.
        </div>
      ) : (
        Object.entries(filteredHistorial).map(([date, entregas]) => (
          <div key={date} className={s.dayGroup}>
            <div className={s.dayGroupHeader}>
              <span className={s.dayGroupDate}>{date}</span>
              <div className={s.dayGroupLine} />
              <span className={s.dayGroupCount}>{entregas.length} entregas</span>
            </div>
            {entregas.map((entrega) => (
              <button type="button" key={entrega.id} className={s.historialRow} onClick={() => setSelectedEntrega(entrega)} title={`Ver detalle de ${entrega.id}`}>
                <span className={s.historialRowId}>{entrega.id}</span>
                <span style={{ flex: 0.8 }}>{entrega.pedido}</span>
                <div className={s.historialRowCliente}>
                  <div className={s.historialRowClienteName}>{entrega.cliente}</div>
                  <div className={s.historialRowAddress}>{entrega.direccion}</div>
                </div>
                <span className={s.historialRowHora}>{entrega.hora}</span>
                <StatusBadge status={entrega.estado} />
                <span className={s.historialRowObs}>{entrega.observaciones || '-'}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {entrega.telefono && (
                    <>
                      <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]" onClick={() => window.open(`tel:${entrega.telefono}`, '_self')} title="Llamar">
                        <Phone size={14} />
                      </button>
                      <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]" onClick={() => abrirWhatsApp(entrega)} title="WhatsApp">
                        <MessageCircle size={14} />
                      </button>
                    </>
                  )}
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]" title="Ver detalle">
                    <Eye size={14} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        ))
      )}

      <div style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Mostrando {Object.values(filteredHistorial).flat().length} entregas filtradas.
      </div>

      <DetailModal
        children={null}
        open={Boolean(selectedEntrega)}
        onClose={() => setSelectedEntrega(null)}
        title={selectedEntrega ? `Historial ${selectedEntrega.id}` : 'Historial'}
        subtitle={selectedEntrega?.fecha}
        size="lg"
        header={{
          icon: <Eye size={18} />,
          status: selectedEntrega ? <StatusBadge status={selectedEntrega.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Detalle de entrega',
            fields: [
              { label: 'Pedido', value: selectedEntrega?.pedido, icon: <Package size={16} /> },
              { label: 'Cliente', value: selectedEntrega?.cliente, icon: <Eye size={16} /> },
              { label: 'Dirección', value: selectedEntrega?.direccion, icon: <MapPin size={16} /> },
              { label: 'Fecha', value: selectedEntrega?.fecha, icon: <Clock size={16} /> },
              { label: 'Hora', value: selectedEntrega?.hora, icon: <Clock size={16} /> },
              { label: 'Teléfono', value: selectedEntrega?.telefono, icon: <Phone size={16} /> },
              { label: 'Observaciones', value: selectedEntrega?.observaciones || 'Sin observaciones', fullWidth: true, icon: <Eye size={16} /> },
            ],
          },
        ]}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="inline-flex h-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-sm font-medium text-[var(--color-text-primary)]" onClick={() => {
              toast.info(`Historial ${selectedEntrega?.id} listo para consulta`);
              setSelectedEntrega(null);
            }}>
              Cerrar
            </button>
            {selectedEntrega?.telefono && (
              <>
                <Button size="sm" onClick={() => window.open(`tel:${selectedEntrega.telefono}`, '_self')}>
                  <Phone size={14} />
                  Llamar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => abrirWhatsApp(selectedEntrega)}>
                  <MessageCircle size={14} />
                  WhatsApp
                </Button>
              </>
            )}
          </div>
        }
      />
    </div>
  );
};
