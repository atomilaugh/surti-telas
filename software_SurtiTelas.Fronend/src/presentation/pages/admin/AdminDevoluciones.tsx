import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  AlertCircle,
  Search,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { returnsApi, type Return, type DevolucionEstado } from '@/infrastructure/api/returnsApi';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/utils';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import s from './AdminDevoluciones.module.css';

const ESTADO_LABELS: Record<DevolucionEstado, string> = {
  RECIBIDO: 'Recibido',
  EN_INSPECCION: 'En Inspección',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  EN_REPARACION: 'En Reparación',
  REINGRESADO: 'Reingresado',
  DESCARTADO: 'Descartado',
};

export const AdminDevoluciones: React.FC = () => {
  const [devoluciones, setDevoluciones] = useState<Return[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<DevolucionEstado | 'TODOS'>('TODOS');
  const [selectedDevolucion, setSelectedDevolucion] = useState<Return | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchDevoluciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await returnsApi.list();
      setDevoluciones(data);
    } catch {
      setError('No se pudieron cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevoluciones();
  }, [fetchDevoluciones]);

  const filteredDevoluciones = useMemo(() => {
    return devoluciones.filter((d) => {
      const matchesSearch = !debouncedSearch ||
        d.numeroDevolucion.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        d.numeroOrden.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        d.cliente.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        d.prenda.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesEstado = estadoFilter === 'TODOS' || d.estado === estadoFilter;

      return matchesSearch && matchesEstado;
    });
  }, [devoluciones, debouncedSearch, estadoFilter]);

  const handleChangeStatus = async (id: string, newStatus: DevolucionEstado) => {
    try {
      await returnsApi.changeStatus(id, newStatus);
      toast.success('Estado actualizado');
      void fetchDevoluciones();
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const openDetail = (devolucion: Return) => {
    setSelectedDevolucion(devolucion);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedDevolucion(null);
  };

  const estadoCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: devoluciones.length };
    for (const d of devoluciones) {
      counts[d.estado] = (counts[d.estado] || 0) + 1;
    }
    return counts;
  }, [devoluciones]);

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Devoluciones</h1>
          <p className={s.pageSubtitle}>
            Gestión de devoluciones de productos
          </p>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Buscar por nÓºmero, cliente, prenda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchDevoluciones}>
          <RefreshCw size={16} />
        </Button>
      </div>

      <div className={s.filterTabs}>
        <button
          className={cn(s.filterTab, estadoFilter === 'TODOS' && s.filterTabActive)}
          onClick={() => setEstadoFilter('TODOS')}
        >
          Todos ({estadoCounts.TODOS || 0})
        </button>
        {(Object.keys(ESTADO_LABELS) as DevolucionEstado[]).map((estado) => (
          <button
            key={estado}
            className={cn(s.filterTab, estadoFilter === estado && s.filterTabActive)}
            onClick={() => setEstadoFilter(estado)}
          >
            {ESTADO_LABELS[estado]} ({estadoCounts[estado] || 0})
          </button>
        ))}
      </div>

      {loading && (
        <div className={s.stateBox}>
          <Loader2 size={28} className={s.spin} />
          <p>Cargando devoluciones...</p>
        </div>
      )}

      {error && (
        <div className={cn(s.stateBox, s.errorBox)}>
          <AlertCircle size={28} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className={s.tableContainer}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>No. Devolución</th>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Prenda</th>
                <th>Motivo</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevoluciones.length === 0 ? (
                <tr>
                  <td colSpan={9} className={s.emptyCell}>
                    No se encontraron devoluciones
                  </td>
                </tr>
              ) : (
                filteredDevoluciones.map((devolucion) => (
                  <tr key={devolucion.id}>
                    <td className={s.codeCell}>{devolucion.numeroDevolucion}</td>
                    <td className={s.codeCell}>{devolucion.numeroOrden}</td>
                    <td>{devolucion.cliente}</td>
                    <td>{devolucion.prenda}</td>
                    <td className={s.motivoCell}>{devolucion.motivo}</td>
                    <td className={s.numberCell}>{devolucion.cantidad}</td>
                    <td>
                      <StatusBadge status={devolucion.estado} label={ESTADO_LABELS[devolucion.estado]} />
                    </td>
                    <td className={s.dateCell}>{devolucion.fechaDevolucion}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetail(devolucion)}
                      >
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailOpen && selectedDevolucion && (
        <div className={s.modalOverlay} onClick={closeDetail}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Devolución {selectedDevolucion.numeroDevolucion}</h2>
              <button className={s.closeBtn} onClick={closeDetail}>×</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Orden:</span>
                  <span className={s.detailValue}>{selectedDevolucion.numeroOrden}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Cliente:</span>
                  <span className={s.detailValue}>{selectedDevolucion.cliente}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Prenda:</span>
                  <span className={s.detailValue}>{selectedDevolucion.prenda}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Referencia:</span>
                  <span className={s.detailValue}>{selectedDevolucion.referencia || '—'}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Motivo:</span>
                  <span className={s.detailValue}>{selectedDevolucion.motivo}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Cantidad:</span>
                  <span className={s.detailValue}>{selectedDevolucion.cantidad}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Destino:</span>
                  <span className={s.detailValue}>{selectedDevolucion.destino.replace(/_/g, ' ')}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Estado:</span>
                  <StatusBadge status={selectedDevolucion.estado} label={ESTADO_LABELS[selectedDevolucion.estado]} />
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Fecha Devolución:</span>
                  <span className={s.detailValue}>{selectedDevolucion.fechaDevolucion}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Responsable:</span>
                  <span className={s.detailValue}>{selectedDevolucion.responsable || '—'}</span>
                </div>
              </div>
              {selectedDevolucion.observaciones && (
                <div className={s.observacionesSection}>
                  <h4>Observaciones</h4>
                  <p>{selectedDevolucion.observaciones}</p>
                </div>
              )}
              <div className={s.statusActions}>
                <h4>Cambiar Estado</h4>
                <div className={s.statusButtons}>
                  {(Object.keys(ESTADO_LABELS) as DevolucionEstado[]).map((estado) => (
                    <Button
                      key={estado}
                      size="sm"
                      variant={selectedDevolucion.estado === estado ? 'primary' : 'outline'}
                      onClick={() => handleChangeStatus(selectedDevolucion.id, estado)}
                    >
                      {ESTADO_LABELS[estado]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <Button variant="secondary" onClick={closeDetail}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDevoluciones;

