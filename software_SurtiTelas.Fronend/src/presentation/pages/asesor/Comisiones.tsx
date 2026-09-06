import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Eye, Download, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import s from './Comisiones.module.css';
import { DetailModal } from '@/shared/ui/DetailModal';
import { InfoModal } from '@/shared/ui/InfoModal';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Tooltip } from '@/shared/components/Tooltip';
import { commissionsApi } from '@/infrastructure/api/commissionsApi';
import { useAuthStore } from '@/core/stores/authStore';
import { parseCurrency } from '@/shared/utils/number';

interface Comision {
  mes: string;
  pedidos: number;
  ventas: string;
  porcentaje: string;
  comision: string;
  estado: 'Pagado' | 'Pendiente';
  comprobante: string | null;
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(d);
  return formatted.replace(/^\w/, (c) => c.toUpperCase());
}

function toComisiones(raw: { createdAt: string; monto: number; porcentaje: number; estado: string; id: string }[]): Comision[] {
  const groups = new Map<string, { count: number; totalMonto: number; totalVentas: number; estado: string; ids: string[]; totalPorcentaje: number }>();
  for (const c of raw) {
    const mes = formatMonth(c.createdAt);
    const g = groups.get(mes) ?? { count: 0, totalMonto: 0, totalVentas: 0, estado: c.estado, ids: [], totalPorcentaje: 0 };
    g.count += 1;
    g.totalMonto += c.monto;
    g.totalVentas += c.porcentaje > 0 ? c.monto / (c.porcentaje / 100) : 0;
    g.totalPorcentaje += c.porcentaje;
    g.estado = c.estado;
    g.ids.push(c.id);
    groups.set(mes, g);
  }
  return Array.from(groups.entries()).map(([mes, g]) => ({
    mes,
    pedidos: g.count,
    ventas: `$${Math.round(g.totalVentas).toLocaleString('es-CO')}`,
    porcentaje: `${g.count > 0 ? Math.round(g.totalPorcentaje / g.count) : 0}%`,
    comision: `$${Math.round(g.totalMonto).toLocaleString('es-CO')}`,
    estado: g.estado === 'pagado' ? 'Pagado' : 'Pendiente',
    comprobante: g.ids[0] ?? null,
  }));
}

export const AsesorComisiones: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedComision, setSelectedComision] = useState<Comision | null>(null);
  const [voucherComision, setVoucherComision] = useState<Comision | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await commissionsApi.list(user?.uid ? { asesorId: user.uid } : undefined);
        const mapped = toComisiones(data.map(c => ({ createdAt: c.createdAt, monto: c.monto, porcentaje: c.porcentaje, estado: c.estado, id: c.id })));
        setComisiones(mapped);
      } catch {
        setError('No se pudieron cargar las comisiones');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.uid]);

  const comisionesFiltradas = useMemo(() => {
    return selectedMonth === 'Todos' ? comisiones : comisiones.filter(item => item.mes === selectedMonth);
  }, [selectedMonth, comisiones]);

  const totalMes = comisionesFiltradas.reduce((sum, item) => sum + parseCurrency(item.comision), 0);

  const resumen = useMemo(() => {
    const current = comisiones[0];
    const total = comisiones.reduce((sum, c) => sum + parseCurrency(c.comision), 0);
    return [
      { label: 'Comisión Este Mes', value: current ? current.comision : '$0', sub: current ? `${current.pedidos} registros` : 'Sin datos', color: 'accent' as const },
      { label: 'Total Histórico', value: `$${Math.round(total).toLocaleString('es-CO')}`, sub: `${comisiones.length} meses`, color: 'default' as const },
      { label: 'Última Liquidación', value: comisiones.length > 1 ? comisiones[1].comision : '$0', sub: comisiones.length > 1 ? `Pagado — ${comisiones[1].mes}` : 'Sin liquidaciones', color: 'success' as const },
    ];
  }, [comisiones]);

  const monthOptions = useMemo(() => {
    return ['Todos', ...comisiones.map(c => c.mes)];
  }, [comisiones]);

  const openDetail = (item: Comision) => {
    setSelectedComision(item);
    setSelectedMonth(item.mes);
  };

  if (loading) {
    return (
      <div>
        <h1 className={s.pageTitle}>Mis Comisiones</h1>
        <p className={s.pageSubtitle}>Cargando comisiones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={s.pageTitle}>Mis Comisiones</h1>
        <p className={s.pageSubtitle}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.pageTitle}>Mis Comisiones</h1>
      <p className={s.pageSubtitle}>Historial de comisiones generadas</p>

      <div className={s.resumenGrid}>
        {resumen.map((r, i) => (
          <div key={i} className={s.resumenCard}>
            <div className={s.resumenLabel}>{r.label}</div>
            <div className={`${s.resumenValue} ${r.color === 'accent' ? s.resumenValueAccent : r.color === 'success' ? s.resumenValueSuccess : ''}`}>
              {r.value}
            </div>
            <div className={s.resumenSub}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div className={s.historialSection}>
        <div className={s.historialHeader}>
          <div className={s.historialTitle}>Historial de comisiones</div>
          <div className={s.monthFilter}>
            {monthOptions.map(month => (
              <button
                key={month}
                className={`${s.monthBtn} ${selectedMonth === month ? s.monthBtnActive : ''}`}
                onClick={() => setSelectedMonth(month)}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Pedidos</th>
                <th>Ventas Totales</th>
                <th>% Comisión</th>
                <th>Comisión Generada</th>
                <th>Estado</th>
                <th>Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comisionesFiltradas.map((item, i) => (
                <tr key={i}>
                  <td className={s.tdPrimary}>{item.mes}</td>
                  <td>{item.pedidos}</td>
                  <td>{item.ventas}</td>
                  <td>{item.porcentaje}</td>
                  <td className={s.tdMono}>{item.comision}</td>
                  <td>
                    <StatusBadge status={item.estado} />
                  </td>
                  <td>
                    {item.comprobante ? (
                      <button type="button" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setVoucherComision(item)}>
                        <FileText size={14} />
                        {item.comprobante}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <Tooltip title="Ver detalle"><button type="button" className={s.actionBtn} onClick={() => openDetail(item)}>
                      <Eye size={14} />
                    </button></Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          <span>Mostrando {comisionesFiltradas.length} registros</span>
          <strong>Total filtrado: ${totalMes.toLocaleString()}</strong>
        </div>
      </div>

      <DetailModal
        children={null}
        open={Boolean(selectedComision)}
        onClose={() => setSelectedComision(null)}
        title={selectedComision ? `Comisión ${selectedComision.mes}` : 'Comisión'}
        subtitle="Resumen de liquidación mensual"
        size="lg"
        header={{
          icon: <TrendingUp size={18} />,
          status: selectedComision ? <StatusBadge status={selectedComision.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Liquidación',
            fields: [
              { label: 'Mes', value: selectedComision?.mes, icon: <Calendar size={16} /> },
              { label: 'Pedidos cerrados', value: selectedComision?.pedidos, icon: <TrendingUp size={16} /> },
              { label: 'Ventas totales', value: selectedComision?.ventas, icon: <CreditCard size={16} /> },
              { label: 'Porcentaje', value: selectedComision?.porcentaje, icon: <TrendingUp size={16} /> },
              { label: 'Comisión generada', value: selectedComision?.comision, icon: <CreditCard size={16} /> },
            ],
          },
        ]}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="inline-flex h-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-transparent px-3 text-sm font-medium text-[var(--color-text-primary)]" onClick={() => { if (selectedComision?.comprobante) setVoucherComision(selectedComision); }}>
              <Download size={14} style={{ marginRight: 6 }} />
              Descargar comprobante
            </button>
            <button type="button" className="inline-flex h-8 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] px-4 text-sm font-medium text-[var(--btn-primary-text)]" onClick={() => setSelectedComision(null)}>
              Cerrar
            </button>
          </div>
        }
      />

      <InfoModal
        children={null}
        open={Boolean(voucherComision)}
        onClose={() => setVoucherComision(null)}
        title="Comprobante de pago"
        description={`Código ${voucherComision?.comprobante || 'pendiente'}`}
        sections={voucherComision ? [
          { label: 'Mes', value: voucherComision.mes },
          { label: 'Comprobante', value: voucherComision.comprobante || 'Pendiente de generación' },
          { label: 'Comisión pagada', value: voucherComision.comision },
          { label: 'Estado', value: <StatusBadge status="Pagado" /> },
        ] : []}
      />
    </div>
  );
};
