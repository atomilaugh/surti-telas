import React, { useState, useEffect } from 'react';
import { Search, Download, Users, UserPlus, Activity, Mail, ShoppingBag, TrendingUp, Calendar, Loader2, AlertCircle } from 'lucide-react';
import s from './ReportesUsuarios.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { usersApi, type Usuario as User } from '@/infrastructure/api/usersApi';
import { reportsApi } from '@/infrastructure/api/reportsApi';
import { ROL_LABELS, ROL_COLORS, ROLES_SISTEMA } from '@/shared/constants/options';

interface UsuarioData {
  mes: string;
  nuevos: number;
}

interface UsuarioRep {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'asesor' | 'domiciliario' | 'cliente';
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
  fechaRegistro: string;
  pedidosRealizados: number;
}

const mapRol = (rol: string): UsuarioRep['rol'] => {
  if (rol === 'admin' || rol === 'asesor' || rol === 'domiciliario' || rol === 'cliente') return rol;
  return 'cliente';
};

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Construye la serie de "usuarios nuevos por mes" a partir de las fechas de
 * registro reales. Devuelve los últimos `months` meses hasta el mes actual.
 */
const buildUsuariosMensuales = (fechasRegistro: string[], months = 6): UsuarioData[] => {
  const now = new Date();
  const buckets: UsuarioData[] = [];
  const index = new Map<string, number>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    index.set(key, buckets.length);
    buckets.push({ mes: MESES_CORTOS[d.getMonth()], nuevos: 0 });
  }

  for (const fecha of fechasRegistro) {
    if (!fecha) continue;
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const pos = index.get(key);
    if (pos !== undefined) buckets[pos].nuevos += 1;
  }

  return buckets;
};

const DONUT_CX = 90;
const DONUT_CY = 90;
const DONUT_RADIUS = 54;
const DONUT_STROKE = 18;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_GAP = 1.2;

interface DonutChartProps {
  data: { label: string; cantidad: number; color: string }[];
  centerValue?: number | string;
  centerLabel?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, centerValue, centerLabel }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum: number, d: { cantidad: number }) => sum + d.cantidad, 0);

  const segments = data.map((item: { label: string; cantidad: number; color: string }) => {
    const segmentLen = total > 0 ? (item.cantidad / total) * 2 * Math.PI * 54 : 0;
    const drawLen = Math.max(0, segmentLen - 1.2);
    return {
      color: item.color,
      drawLen,
      pct: total > 0 ? (item.cantidad / total) * 100 : 0,
    };
  });

  let accumulated = 0;

  return (
    <div className={s.pieContainer}>
      <svg width={180} height={180} viewBox="0 0 180 180" className={s.pieSvg}>
        <g transform="rotate(-90 90 90)">
          <circle cx={90} cy={90} r={54} fill="none" stroke="var(--chart-grid)" strokeWidth={18} />
          {segments.map((seg: { color: string; drawLen: number; pct: number }, i: number) => {
            const offset = -accumulated;
            accumulated += (seg.drawLen + DONUT_GAP);

            return (
              <circle
                key={i}
                cx={DONUT_CX}
                cy={DONUT_CY}
                r={DONUT_RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${seg.drawLen} ${DONUT_CIRCUMFERENCE}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={s.pieSlice}
                style={{
                  transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease',
                  opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.25 : 1,
                  filter: hoveredIndex === i ? 'drop-shadow(0 0 12px rgba(255,255,255,0.28))' : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </g>
        <text x={DONUT_CX} y={DONUT_CY - 5} textAnchor="middle" className={s.pieNum}>
          {centerValue ?? total}
        </text>
        <text x={DONUT_CX} y={DONUT_CY + 14} textAnchor="middle" className={s.pieTxt}>
          {centerLabel}
        </text>
      </svg>
      <div className={s.legendCol}>
        {data.map((item, i) => (
          <div key={i} className={s.legendRow}>
            <div className={s.legendSwatch} style={{ background: item.color }} />
            <div className={s.legendInfo}>
              <span className={s.legendName}>{item.label}</span>
              <span className={s.legendMeta}>
                {item.cantidad} · {segments[i]?.pct.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminReportesUsuarios: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('Todos');
  const [usuarios, setUsuarios] = useState<UsuarioRep[]>([]);
  const [usuariosMensuales, setUsuariosMensuales] = useState<UsuarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [users, usersReport] = await Promise.all([
          usersApi.list(),
          reportsApi.getUsersReport().catch(() => null),
        ]);
        if (!active) return;
        const mapped: UsuarioRep[] = users.map((u: User) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: mapRol(u.rol),
          estado: u.estado,
          fechaRegistro: u.fechaRegistro,
          pedidosRealizados: u.pedidosRealizados,
        }));
        setUsuarios(mapped.length > 0 ? mapped : (usersReport?.recentUsers ?? []).map(u => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: mapRol(u.role),
          estado: 'Activo',
          fechaRegistro: u.fechaRegistro,
          pedidosRealizados: 0,
        })));

        const fechasRegistro = (mapped.length > 0
          ? mapped.map(u => u.fechaRegistro)
          : (usersReport?.recentUsers ?? []).map(u => u.fechaRegistro)
        ).filter((f): f is string => Boolean(f));
        setUsuariosMensuales(buildUsuariosMensuales(fechasRegistro));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes de usuarios');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const total = usuarios.length;
  const activos = usuarios.filter(u => u.estado === 'Activo').length;
  const nuevosMes = usuariosMensuales.length > 0 ? usuariosMensuales[usuariosMensuales.length - 1].nuevos : 0;
  const nuevosMesAnterior = usuariosMensuales.length > 1 ? usuariosMensuales[usuariosMensuales.length - 2].nuevos : 0;
  const crecimiento = nuevosMesAnterior > 0
    ? (((nuevosMes - nuevosMesAnterior) / nuevosMesAnterior) * 100).toFixed(1)
    : '0.0';

  const rolData = Object.entries(
    usuarios.reduce<Record<string, number>>((acc, u) => {
      acc[u.rol] = (acc[u.rol] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([rol, cantidad]) => ({
    rol: ROL_LABELS[rol] ?? rol,
    cantidad,
    color: ROL_COLORS[rol] ?? '#64748b',
  }));

  const estadoData = [
    { estado: 'Activos', cantidad: usuarios.filter(u => u.estado === 'Activo').length, color: 'var(--chart-series-4)' },
    { estado: 'Inactivos', cantidad: usuarios.filter(u => u.estado === 'Inactivo').length, color: 'var(--color-error)' },
    { estado: 'Pendientes', cantidad: usuarios.filter(u => u.estado === 'Pendiente').length, color: 'var(--chart-series-3)' },
  ];

  const filtrados = usuarios.filter(u =>
    (filtroRol === 'Todos' || u.rol === filtroRol) &&
    (u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const maxNuevos = usuariosMensuales.length > 0 ? Math.max(...usuariosMensuales.map(d => d.nuevos)) : 0;

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Reportes de Usuarios</h1>
          <p className={s.pageSubtitle}>Análisis de usuarios</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<Download size={16} />}>Exportar</Button>
        </div>
      </div>

      {loading && (
        <div className={s.stateBox}>
          <Loader2 size={28} className={s.spin} />
          <p>Cargando reportes de usuarios...</p>
        </div>
      )}
      {error && (
        <div className={s.errorBox}>
          <AlertCircle size={28} />
          <p>{error}</p>
        </div>
      )}
      {!loading && !error && (
      <div>
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <Users size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{total}</div>
            <div className={s.statLabel}>Total Usuarios</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}>
          <Activity size={20} className={s.statIconSuccess} />
          <div>
            <div className={s.statValue}>{activos}</div>
            <div className={s.statLabel}>Activos</div>
          </div>
        </div>
        <div className={s.statCard}>
          <UserPlus size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>+{nuevosMes}</div>
            <div className={s.statLabel}>Nuevos este mes</div>
          </div>
        </div>
        <div className={s.statCard}>
          <TrendingUp size={20} className={s.statIconAccent} />
          <div>
            <div className={s.statValue}>+{crecimiento}%</div>
            <div className={s.statLabel}>Crecimiento</div>
          </div>
        </div>
      </div>

      <div className={s.chartsRow}>
        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Distribución por Rol</h3>
          <DonutChart data={rolData.map(d => ({ label: d.rol, cantidad: d.cantidad, color: d.color }))} centerValue={total} centerLabel="Usuarios" />
        </div>

        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Estado de Usuarios</h3>
          <DonutChart data={estadoData.map(d => ({ label: d.estado, cantidad: d.cantidad, color: d.color }))} centerValue={activos} centerLabel="Activos" />
        </div>
      </div>

      <div className={s.chartSection}>
        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Usuarios Nuevos por Mes</h3>
          <div className={s.miniChart}>
            {usuariosMensuales.map((d) => (
              <div key={d.mes} className={s.miniBarGroup}>
                <div className={s.miniBarCol}>
                  <div className={s.miniBarTrack}>
                    <div className={s.miniBarFill} style={{ height: `${(d.nuevos / Math.max(maxNuevos, 1)) * 100}%` }} />
                  </div>
                </div>
                <div className={s.miniBarLabel}>{d.mes}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.chartCard}>
          <h3 className={s.chartTitle}>Resumen</h3>
          <div className={s.summaryGrid}>
            <div className={s.summaryItem}>
              <div className={s.summaryVal}>{usuarios.filter(u => u.rol === 'asesor').length}</div>
              <div className={s.summaryLbl}>Asesores</div>
            </div>
            <div className={s.summaryItem}>
              <div className={s.summaryVal}>{usuarios.filter(u => u.rol === 'cliente').length}</div>
              <div className={s.summaryLbl}>Clientes</div>
            </div>
            <div className={s.summaryItem}>
              <div className={s.summaryVal}>{usuarios.filter(u => u.estado === 'Inactivo').length}</div>
              <div className={s.summaryLbl}>Inactivos</div>
            </div>
            <div className={s.summaryItem}>
              <div className={s.summaryVal}>{usuarios.filter(u => u.rol === 'domiciliario').length}</div>
              <div className={s.summaryLbl}>Domiciliarios</div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.tableSection}>
        <div className={s.tableHeader}>
          <h3 className={s.tableTitle}>Usuarios Registrados</h3>
          <div className={s.tableFilters}>
            <div className={s.filterGroup}>
              {ROLES_SISTEMA.map(rol => (
                <button key={rol} className={`${s.filterBtn} ${filtroRol === rol ? s.filterBtnActive : ''}`} onClick={() => setFiltroRol(rol)}>
                  {ROL_LABELS[rol] ?? rol}
                </button>
              ))}
            </div>
            <div className={s.searchBox}>
              <Search size={16} className={s.searchIcon} />
              <input type="text" placeholder="Buscar usuario..." value={search} onChange={e => setSearch(e.target.value)} className={s.searchInput} />
            </div>
          </div>
        </div>
        <DataTable
          data={filtrados}
          pageSize={10}
          emptyMessage="Sin resultados"
          enableSorting
          enableColumnFilters
          enableRowSelection={false}
          enableExport={false}
          exportFileName="reportes_usuarios"
          maxVisibleColumns={5}
          detailPanel={{
            title: (item) => item.nombre,
            render: (item) => (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-700 to-amber-600 text-white font-semibold text-lg">
                    {item.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{item.nombre}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{item.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                    <Mail size={16} className="text-[var(--color-text-muted)]" />
                    <div className="flex-1">
                      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Email</p>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                    <Calendar size={16} className="text-[var(--color-text-muted)]" />
                    <div className="flex-1">
                      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Fecha Registro</p>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.fechaRegistro ? new Date(item.fechaRegistro).toLocaleDateString('es-CO') : '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                    <ShoppingBag size={16} className="text-[var(--color-text-muted)]" />
                    <div className="flex-1">
                      <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Pedidos</p>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.pedidosRealizados} pedidos realizados</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Estado</span>
                  <StatusBadge status={item.estado} dot />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Rol</span>
                  <StatusBadge status={item.rol} />
                </div>
              </div>
            ),
          }}
          columns={[
            { key: 'id', header: 'ID', width: '80px', sortable: true, filterable: true, render: (u) => <span className={s.tdMono}>{u.id}</span> },
            { key: 'nombre', header: 'Nombre', sortable: true, filterable: true, render: (u) => (
              <div className="flex flex-col">
                <span className={s.tdPrimary}>{u.nombre}</span>
                <span className={s.tdMuted}>{u.email}</span>
              </div>
            )},
            { key: 'rol', header: 'Rol', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
              { value: 'admin', label: 'Admin' },
              { value: 'asesor', label: 'Asesor' },
              { value: 'domiciliario', label: 'Domiciliario' },
              { value: 'cliente', label: 'Cliente' },
            ], render: (u) => (
              <StatusBadge status={u.rol} />
            )},
            { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
              { value: 'Pendiente', label: 'Pendiente' },
            ], render: (u) => (
              <StatusBadge status={u.estado} dot />
            )},
            { key: 'fechaRegistro', header: 'Registro', width: '110px', sortable: true, render: (u) => (
              <span className={s.tdMuted}>{new Date(u.fechaRegistro).toLocaleDateString('es-CO')}</span>
            )},
          ]}
        />
      </div>
      </div>
      )}
    </div>
  );
};

