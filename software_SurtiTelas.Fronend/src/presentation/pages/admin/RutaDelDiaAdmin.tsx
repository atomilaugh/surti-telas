import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Package, Truck, Clock, MapPin, Phone, User, X } from 'lucide-react';
import s from './RutaDelDiaAdmin.module.css';
import { Button } from '@/shared/ui/Button';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { DataTable } from '@/shared/ui/DataTable';
import { deliveriesApi } from '@/infrastructure/api/deliveriesApi';
import { usersApi } from '@/infrastructure/api/usersApi';
import type { Usuario } from '@/infrastructure/api/usersApi';

export interface DeliveryRutaItem {
  id: string;
  orderId: string;
  estado: 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'FALLIDO';
  domiciliarioId?: string | null;
  domiciliarioNombre?: string | null;
  domiciliarioTelefono?: string | null;
  domiciliarioZona?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  notas?: string | null;
  motivo?: string | null;
  asignadoEn?: string | null;
  inicioRutaEn?: string | null;
  entregadoEn?: string | null;
  order?: {
    numero?: string;
    cliente?: string;
    telefono?: string;
    direccion?: string | null;
    ciudad?: string | null;
    total?: number;
  };
}

type UsuarioConZona = Usuario & { zona?: string | null };

const MOTIVOS_FALLO = [
  { value: 'CLIENTE_NO_ESTABA', label: 'Cliente no estaba' },
  { value: 'DIRECCION_INCORRECTA', label: 'Dirección incorrecta' },
  { value: 'CLIENTE_NO_PUDO_RECIBIR', label: 'Cliente no pudo recibir' },
  { value: 'NO_FUE_POSIBLE_CONTACTAR', label: 'No fue posible contactar' },
  { value: 'CLIENTE_RECHAZO_PEDIDO', label: 'Cliente rechazó pedido' },
  { value: 'OTRO', label: 'Otro' },
];

export const RutaDelDiaAdmin: React.FC = () => {
  const [items, setItems] = useState<DeliveryRutaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterDomiciliario, setFilterDomiciliario] = useState<string>('');
  const [domiciliarios, setDomiciliarios] = useState<UsuarioConZona[]>([]);
  const [_loadingDomiciliarios, setLoadingDomiciliarios] = useState(true);
  const [_statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<DeliveryRutaItem | null>(null);
  const [failureItem, setFailureItem] = useState<DeliveryRutaItem | null>(null);
  const [failureMotivo, setFailureMotivo] = useState('');
  const [failureObservacion, setFailureObservacion] = useState('');
  const [confirmingFailure, setConfirmingFailure] = useState(false);
  const [assigningItem, setAssigningItem] = useState<DeliveryRutaItem | null>(null);
  const [assigningSelectedId, setAssigningSelectedId] = useState<string | null>(null);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [assigningSearch, setAssigningSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await deliveriesApi.rutaDelDia({
        ...(filterEstado ? { estado: filterEstado } : {}),
        ...(filterDomiciliario ? { domiciliarioId: filterDomiciliario } : {}),
      });
      setItems(result);
    } catch {
      toast.error('No se pudo cargar la ruta del día');
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterDomiciliario]);

  const loadDomiciliarios = useCallback(async () => {
    setLoadingDomiciliarios(true);
    try {
      const result = await usersApi.list({ role: 'DOMICILIARIO', estado: 'ACTIVO' });
      setDomiciliarios(result as UsuarioConZona[]);
    } catch {
      toast.error('No se pudieron cargar los domiciliarios');
    } finally {
      setLoadingDomiciliarios(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadDomiciliarios();
  }, [load, loadDomiciliarios]);

  const sync = async () => {
    setSyncing(true);
    try {
      await load();
      toast.success('Ruta sincronizada');
    } catch {
      toast.error('No se pudo sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const changeStatus = async (deliveryId: string, estado: DeliveryRutaItem['estado'], motivo?: string) => {
    setStatusUpdatingId(deliveryId);
    try {
      await deliveriesApi.updateStatus(deliveryId, estado, motivo);
      setItems(prev => prev.map(item => item.id === deliveryId ? { ...item, estado, motivo: motivo ?? item.motivo } : item));
      toast.success('Estado actualizado');
    } catch {
      toast.error('No se pudo actualizar el estado');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openFailureModal = (item: DeliveryRutaItem) => {
    setFailureItem(item);
    setFailureMotivo('');
    setFailureObservacion('');
    setConfirmingFailure(false);
  };

  const confirmFailure = async () => {
    if (!failureItem) return;
    if (!failureMotivo) {
      toast.error('Selecciona un motivo de fallo');
      return;
    }
    setConfirmingFailure(true);
    try {
      const motivoFinal = failureObservacion ? `${failureMotivo}: ${failureObservacion}` : failureMotivo;
      await changeStatus(failureItem.id, 'FALLIDO', motivoFinal);
      setFailureItem(null);
    } finally {
      setConfirmingFailure(false);
    }
  };

  const assignOptions = useMemo(() => {
    const q = assigningSearch.trim().toLowerCase();
    return domiciliarios.filter((d) => {
      if (!q) return true;
      return (d.nombre ?? '').toLowerCase().includes(q) || (d.telefono ?? '').toLowerCase().includes(q);
    });
  }, [domiciliarios, assigningSearch]);

  const confirmAssign = async () => {
    if (!assigningItem || !assigningSelectedId) return;
    setAssigningLoading(true);
    try {
      await assignDriver(assigningItem.id, assigningSelectedId);
      setAssigningItem(null);
      setAssigningSelectedId(null);
    } finally {
      setAssigningLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (filterEstado) {
      result = result.filter(i => i.estado === filterEstado);
    }
    if (filterDomiciliario) {
      result = result.filter(i => i.domiciliarioId === filterDomiciliario);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(i =>
        (i.order?.numero ?? '').toLowerCase().includes(q) ||
        (i.order?.cliente ?? '').toLowerCase().includes(q) ||
        (i.direccion ?? '').toLowerCase().includes(q) ||
        (i.telefono ?? '').toLowerCase().includes(q) ||
        (i.orderId ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filterEstado, filterDomiciliario, searchQuery]);

  const total = items.length;
  const sinDomiciliario = items.filter(i => !i.domiciliarioId).length;
  const pendientes = items.filter(i => i.estado === 'ASIGNADO').length;
  const enRuta = items.filter(i => i.estado === 'EN_RUTA').length;
  const entregados = items.filter(i => i.estado === 'ENTREGADO').length;
  const fallidos = items.filter(i => i.estado === 'FALLIDO').length;

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-CO');
  };

  const assignDriver = async (deliveryId: string, domiciliarioId?: string) => {
    try {
      await deliveriesApi.update(deliveryId, { domiciliarioId: domiciliarioId || undefined });
      setItems(prev => prev.map(item => item.id === deliveryId ? {
        ...item,
        domiciliarioId: domiciliarioId || undefined,
        domiciliarioNombre: domiciliarioId ? (domiciliarios.find(d => d.id === domiciliarioId)?.nombre ?? undefined) : undefined,
        domiciliarioTelefono: domiciliarioId ? (domiciliarios.find(d => d.id === domiciliarioId)?.telefono ?? undefined) : undefined,
        domiciliarioZona: domiciliarioId ? (domiciliarios.find(d => d.id === domiciliarioId)?.zona ?? undefined) : undefined,
      } : item));
      toast.success(domiciliarioId ? 'Domiciliario asignado' : 'Asignación eliminada');
    } catch {
      toast.error('No se pudo asignar el domiciliario');
    }
  };

  const getRowActions = (item: DeliveryRutaItem) => {
    const actions: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'ghost' }> = [];
    if (!item.domiciliarioId) {
      actions.push({ label: 'Asignar repartidor', onClick: () => setAssigningItem(item), variant: 'primary' });
    } else {
      if (item.estado === 'ASIGNADO') {
        actions.push({ label: 'Iniciar ruta', onClick: () => changeStatus(item.id, 'EN_RUTA'), variant: 'primary' });
        actions.push({ label: 'Marcar fallo', onClick: () => openFailureModal(item), variant: 'danger' });
      } else if (item.estado === 'EN_RUTA') {
        actions.push({ label: 'Marcar entregado', onClick: () => changeStatus(item.id, 'ENTREGADO'), variant: 'primary' });
        actions.push({ label: 'Marcar fallo', onClick: () => openFailureModal(item), variant: 'danger' });
      }
    }
    actions.push({ label: 'Ver detalle', onClick: () => setDetailItem(item), variant: 'ghost' });
    return actions;
  };

  return (
    <div className={s.pageRoot}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Ruta del Día</h1>
          <p className={s.pageSubtitle}>
            Supervisa y administra las entregas del día · {total} entrega{total === 1 ? '' : 's'} registrada{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<RefreshCw size={15} />} onClick={sync} disabled={syncing}>
            Sincronizar
          </Button>
        </div>
      </div>

      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={s.statCard}>
              <Package size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{total}</div>
                <div className={s.statLabel}>Total</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <Truck size={20} className={s.statIconWarning} />
              <div>
                <div className={s.statValue}>{sinDomiciliario}</div>
                <div className={s.statLabel}>Sin domiciliario</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <Clock size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{pendientes}</div>
                <div className={s.statLabel}>Pendientes</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <MapPin size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{enRuta}</div>
                <div className={s.statLabel}>En camino</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Entregas</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <Package size={20} className={s.statIconSuccess} />
              <div>
                <div className={s.statValue}>{entregados}</div>
                <div className={s.statLabel}>Entregados</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <Clock size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{fallidos}</div>
                <div className={s.statLabel}>Fallidos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <SearchInput
            placeholder="Buscar por pedido, cliente, dirección o teléfono"
            value={searchQuery}
            onSearch={(value) => setSearchQuery(value)}
            debounceMs={150}
            minChars={0}
          />
        </div>

        <select
          className={s.toolbarSelect}
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="ASIGNADO">Pendientes</option>
          <option value="EN_RUTA">En camino</option>
          <option value="ENTREGADO">Entregados</option>
          <option value="FALLIDO">Fallidos</option>
        </select>

        <select
          className={s.toolbarSelect}
          value={filterDomiciliario}
          onChange={(e) => setFilterDomiciliario(e.target.value)}
        >
          <option value="">Todos los domiciliarios</option>
          {domiciliarios.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>

        <Button size="sm" variant="ghost" onClick={() => { setFilterEstado(''); setFilterDomiciliario(''); setSearchQuery(''); }}>
          Limpiar filtros
        </Button>
      </div>

      <div className={s.tableCard}>
        {loading && (
          <div className={s.loadingRow}>Cargando ruta del día...</div>
        )}
        {!loading && (
          <div className={s.tableScroll}>
            <DataTable<DeliveryRutaItem>
              title="Ruta del Día"
              subtitle="Listado de entregas del día"
              data={filteredItems}
              pageSize={10}
              emptyMessage="No hay entregas para mostrar"
              enableSorting
              enableColumnFilters={false}
              enableRowSelection={false}
              enableExport
              exportFileName="ruta-del-dia"
              maxVisibleColumns={8}
              actions={getRowActions}
              columns={[
                {
                  key: 'pedido',
                  header: 'Pedido',
                  width: '128px',
                  render: (item) => <span className={s.tdMono}>{item.order?.numero || item.orderId}</span>,
                },
                {
                  key: 'cliente',
                  header: 'Cliente',
                  render: (item) => {
                    const cliente = item.order?.cliente?.trim() || item.domiciliarioNombre?.trim() || '-';
                    return <span className={s.tdPrimary}>{cliente}</span>;
                  },
                },
                {
                  key: 'direccion',
                  header: 'Dirección',
                  render: (item) => {
                    const direccion = (item.order?.direccion?.trim() || item.direccion?.trim()) || '-';
                    return <span className={s.tdMuted}>{direccion}</span>;
                  },
                },
                {
                  key: 'telefono',
                  header: 'Teléfono',
                  width: '120px',
                  render: (item) => {
                    const telefono = item.order?.telefono?.trim() || item.telefono?.trim() || '-';
                    return <span className={s.tdMuted}>{telefono}</span>;
                  },
                },
                {
                  key: 'domiciliario',
                  header: 'Domiciliario',
                  render: (item) => {
                    if (!item.domiciliarioNombre) {
                      return <span className={s.domiciliarioEmpty}>— Sin asignar</span>;
                    }
                    const telefono = item.domiciliarioTelefono || item.order?.telefono || null;
                    return (
                      <div className={s.domiciliarioCell}>
                        <div className={s.domiciliarioRow}>
                          <User size={14} className={s.domiciliarioIcon} />
                          <span className={s.domiciliarioName}>{item.domiciliarioNombre}</span>
                        </div>
                        {telefono ? (
                          <div className={s.domiciliarioRow}>
                            <a
                              href={`tel:${telefono}`}
                              className={s.domiciliarioLink}
                              aria-label={`Llamar a ${item.domiciliarioNombre}`}
                              title="Llamar"
                            >
                              <Phone size={12} className={s.domiciliarioPhoneIcon} />
                            </a>
                            <span className={s.domiciliarioPhone}>{telefono}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                },
                {
                  key: 'estado',
                  header: 'Estado',
                  width: '120px',
                  render: (item) => {
                    const estado = item.estado;
                    return <StatusBadge status={estado} />;
                  },
                },
                {
                  key: 'asignadoEn',
                  header: 'Asignado',
                  width: '120px',
                  render: (item) => <span className={s.cellDate}>{formatDate(item.asignadoEn)}</span>,
                },
              ]}
            />
          </div>
        )}
      </div>

      {detailItem && (
        <div className={s.modalOverlay} onClick={() => setDetailItem(null)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Package size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Detalle de entrega</div>
                  <div className={s.detailHeaderSubtitle}>
                    Pedido #{detailItem.order?.numero || detailItem.orderId}
                  </div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {detailItem && <StatusBadge status={detailItem.estado} />}
                <button
                  type="button"
                  className={s.detailClose}
                  onClick={() => setDetailItem(null)}
                  aria-label="Cerrar detalle"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={s.detailContent}>
              <div className={s.detailSection}>
                <div className={s.detailSectionTitle}>Resumen</div>
                <div className={s.detailSummaryGrid}>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Pedido</div>
                    <div className={s.detailValueMono}>
                      {detailItem.order?.numero || detailItem.orderId}
                    </div>
                  </div>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Cliente</div>
                    <div className={s.detailValue}>
                      {detailItem.order?.cliente || '-'}
                    </div>
                  </div>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Estado</div>
                    <div>
                      <StatusBadge status={detailItem.estado} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailSectionTitle}>Contacto</div>
                <div className={s.detailContactGrid}>
                  <div className={s.detailContactItem}>
                    <div className={s.detailLabel}>Teléfono</div>
                    <div className={s.detailValue}>
                      {detailItem.order?.telefono || detailItem.telefono ? (
                        <a
                          href={`tel:${detailItem.order?.telefono || detailItem.telefono}`}
                          className={s.detailLink}
                        >
                          {detailItem.order?.telefono || detailItem.telefono}
                        </a>
                      ) : (
                        <span className={s.detailMuted}>-</span>
                      )}
                    </div>
                  </div>
                  <div className={s.detailContactItem}>
                    <div className={s.detailLabel}>Dirección</div>
                    <div className={s.detailValue}>
                      {detailItem.order?.direccion || detailItem.direccion ? (
                        <span className={s.detailText}>
                          {detailItem.order?.direccion || detailItem.direccion}
                        </span>
                      ) : (
                        <span className={s.detailMuted}>-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailSectionTitle}>Domicilio</div>
                <div className={s.detailDomicilioRow}>
                  <div>
                    <div className={s.detailLabel}>Domiciliario</div>
                    <div className={s.detailValue}>
                      {detailItem.domiciliarioNombre || <span className={s.detailMuted}>Sin asignar</span>}
                    </div>
                  </div>
                  <div>
                    <div className={s.detailLabel}>Fecha de asignación</div>
                    <div className={s.detailValue}>
                      {detailItem.asignadoEn ? (
                        <span className={s.detailText}>{formatDate(detailItem.asignadoEn)}</span>
                      ) : (
                        <span className={s.detailMuted}>-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.detailSection}>
                <div className={s.detailSectionTitle}>Seguimiento</div>
                <div className={s.detailTimeline}>
                  <div className={s.detailTimelineItem}>
                    <div className={s.detailTimelineDot} />
                    <div className={s.detailTimelineContent}>
                      <div className={s.detailLabel}>Asignado</div>
                      <div className={s.detailValueText}>
                        {detailItem.asignadoEn ? formatDate(detailItem.asignadoEn) : <span className={s.detailMuted}>-</span>}
                      </div>
                    </div>
                  </div>
                  <div className={s.detailTimelineItem}>
                    <div className={s.detailTimelineDot} />
                    <div className={s.detailTimelineContent}>
                      <div className={s.detailLabel}>Inicio de ruta</div>
                      <div className={s.detailValueText}>
                        {detailItem.inicioRutaEn ? formatDate(detailItem.inicioRutaEn) : <span className={s.detailMuted}>-</span>}
                      </div>
                    </div>
                  </div>
                  <div className={s.detailTimelineItem}>
                    <div className={`${s.detailTimelineDot} ${s.detailTimelineDotLast}`} />
                    <div className={s.detailTimelineContent}>
                      <div className={s.detailLabel}>Entrega</div>
                      <div className={s.detailValueText}>
                        {detailItem.entregadoEn ? formatDate(detailItem.entregadoEn) : <span className={s.detailMuted}>-</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {detailItem.notas && (
                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Notas</div>
                  <div className={s.detailNotes}>
                    {detailItem.notas}
                  </div>
                </div>
              )}

              {!detailItem.notas && (
                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Notas</div>
                  <div className={s.detailNotesEmpty}>Sin notas</div>
                </div>
              )}

              {detailItem.estado === 'FALLIDO' && detailItem.motivo && (
                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Motivo de fallo</div>
                  <div className={s.detailNotes}>{detailItem.motivo}</div>
                </div>
              )}
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => setDetailItem(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {assigningItem && (
        <div className={s.modalOverlay} onClick={() => !assigningLoading && setAssigningItem(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <h2 className={s.modalTitle}>Asignar repartidor</h2>
                <p className={s.modalSubtitle}>Selecciona el repartidor que realizará esta entrega.</p>
              </div>
              {!assigningLoading && (
                <button type="button" className={s.modalClose} onClick={() => setAssigningItem(null)}>
                  <X size={18} />
                </button>
              )}
            </div>
            <div className={s.modalBody}>
              <div className={s.field}>
                <label className={s.label}>Buscar repartidor</label>
                <SearchInput
                  placeholder="Buscar por nombre o teléfono"
                  value={assigningSearch}
                  onSearch={(value) => setAssigningSearch(value)}
                  debounceMs={120}
                  minChars={0}
                />
              </div>
              <div className={s.assignList}>
                {assignOptions.length === 0 && (
                  <div className={s.assignEmpty}>No se encontraron repartidores.</div>
                )}
                {assignOptions.map((d) => {
                  const selected = assigningSelectedId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={`${s.assignOption} ${selected ? s.assignOptionSelected : ''}`}
                      onClick={() => setAssigningSelectedId(d.id)}
                      aria-pressed={selected}
                    >
                      <div className={s.assignRadio}>
                        <span className={selected ? s.assignRadioActive : s.assignRadioInactive} />
                      </div>
                      <div className={s.assignInfo}>
                        <div className={s.assignName}>{d.nombre}</div>
                        <div className={s.assignMeta}>
                          {d.telefono ? (
                            <span className={s.assignPhone}>
                              <Phone size={12} />
                              {d.telefono}
                            </span>
                          ) : null}
                          {(d as UsuarioConZona).zona ? (
                            <span className={s.assignZone}>Zona: {(d as UsuarioConZona).zona}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={s.modalFooter}>
              <Button variant="secondary" onClick={() => setAssigningItem(null)} disabled={assigningLoading}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={confirmAssign} disabled={assigningLoading || !assigningSelectedId}>
                {assigningLoading ? 'Asignando...' : 'Asignar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {failureItem && (
        <div className={s.modalOverlay} onClick={() => !confirmingFailure && setFailureItem(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Marcar entrega como fallida</h2>
              {!confirmingFailure && (
                <button type="button" className={s.modalClose} onClick={() => setFailureItem(null)}>
                  <X size={18} />
                </button>
              )}
            </div>
            <div className={s.modalBody}>
              <div className={s.field}>
                <label className={s.label}>Motivo</label>
                <select
                  className={s.select}
                  value={failureMotivo}
                  onChange={(e) => setFailureMotivo(e.target.value)}
                  disabled={confirmingFailure}
                >
                  <option value="">Selecciona un motivo...</option>
                  {MOTIVOS_FALLO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Observación</label>
                <textarea
                  className={s.textarea}
                  value={failureObservacion}
                  onChange={(e) => setFailureObservacion(e.target.value)}
                  placeholder="Detalles adicionales del fallo..."
                  disabled={confirmingFailure}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <Button variant="secondary" onClick={() => setFailureItem(null)} disabled={confirmingFailure}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmFailure} disabled={confirmingFailure}>
                {confirmingFailure ? 'Guardando...' : 'Confirmar fallo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
