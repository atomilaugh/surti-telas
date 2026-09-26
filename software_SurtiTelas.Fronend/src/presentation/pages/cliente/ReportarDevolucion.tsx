import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Eye, FileText, Info, List, Loader2 } from 'lucide-react';
import s from './ReportarDevolucion.module.css';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ReturnRequestForm, type ReturnFormOrderOption } from '@/presentation/components/returns/ReturnRequestForm';
import { ReturnEvidenceGallery } from '@/presentation/components/returns/ReturnEvidenceGallery';
import { returnsApi, type ReturnRequestDetailDTO, type ReturnRequestDTO, type ReturnRequestStatus } from '@/infrastructure/api/returnsApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { ApiError } from '@/infrastructure/api/httpClient';

const ESTADO_TO_UI: Record<ReturnRequestStatus, string> = {
  SOLICITADA: 'Solicitada',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PRODUCTO_RECIBIDO: 'Producto recibido',
  EN_INSPECCION: 'En inspección',
  RESUELTA: 'Resuelta',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CO');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CO');
};

function getFriendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
    if (err.status === 404) return 'No fue posible cargar la información solicitada.';
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'No fue posible realizar la acción. Inténtalo nuevamente.';
}

export const ReportarDevolucion: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [ordenes, setOrdenes] = useState<ReturnFormOrderOption[]>([]);
  const [loadingOrdenes, setLoadingOrdenes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [politicasGarantia, setPoliticasGarantia] = useState<{ tipo: string; diasGarantia: number; activa: boolean } | null>(null);
  const [myReturns, setMyReturns] = useState<ReturnRequestDTO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReturnRequestDetailDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrdenes = async () => {
    setLoadingOrdenes(true);
    try {
      const misPedidos = await ordersApi.me({ limit: 100 });
      const mapped = (misPedidos.pedidos ?? []).map((p) => ({
        id: p.id,
        numero: p.numero ?? '',
        fecha: p.fecha,
        estado: p.estado,
      }));
      setOrdenes(mapped.filter((o) => o.estado === 'Entregado'));
    } catch (err) {
      toast.error(getFriendlyError(err));
    } finally {
      setLoadingOrdenes(false);
    }
  };

  const loadWarrantyPolicies = async () => {
    try {
      const policies = await returnsApi.getWarrantyPolicies();
      const ventaPolicy = policies.find((p) => p.tipo === 'VENTA' && p.activa);
      if (ventaPolicy) setPoliticasGarantia(ventaPolicy);
    } catch {
      // la garantía es opcional
    }
  };

  const loadMyReturns = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await returnsApi.listReturnRequests();
      setMyReturns(data);
    } catch (err) {
      setHistoryError(getFriendlyError(err));
      setMyReturns([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadOrdenes();
    void loadWarrantyPolicies();
    void loadMyReturns();
  }, []);

  const handleSubmit = async (input: Parameters<typeof returnsApi.createReturnRequest>[0]) => {
    setSaving(true);
    setFormError(null);
    try {
      await returnsApi.createReturnRequest(input);
      toast.success('Solicitud de devolución registrada correctamente');
      await loadMyReturns();
      setActiveTab('history');
    } catch (err) {
      const message = getFriendlyError(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (request: ReturnRequestDTO) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await returnsApi.getReturnRequest(request.id);
      if (!response) throw new Error('No fue posible cargar el detalle de la solicitud.');
      setDetail(response);
    } catch (err) {
      toast.error(getFriendlyError(err));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Garantía y devolución</h1>
          <p className={s.subtitle}>Registra una solicitud de garantía o devolución</p>
        </div>
      </div>

      <div className={s.tabs}>
        <button
          type="button"
          className={`${s.tab} ${activeTab === 'new' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <FileText size={16} />
          <span>Nueva solicitud</span>
        </button>
        <button
          type="button"
          className={`${s.tab} ${activeTab === 'history' ? s.tabActive : ''}`}
          onClick={() => {
            setActiveTab('history');
            void loadMyReturns();
          }}
        >
          <List size={16} />
          <span>Mis solicitudes</span>
        </button>
      </div>

      {activeTab === 'new' && (
        <div className={s.card}>
          <ReturnRequestForm
            orders={ordenes}
            loadingOrders={loadingOrdenes}
            submitLabel="Enviar solicitud"
            saving={saving}
            formError={formError}
            onSubmit={handleSubmit}
          />

          {politicasGarantia && (
            <div className={s.infoBox}>
              <Info size={16} />
              <div>
                <strong>Estado:</strong> {politicasGarantia.activa ? 'Vigente' : 'Inactiva'}
              </div>
              <div>
                <strong>Tipo:</strong>{' '}
                {politicasGarantia.tipo === 'VENTA'
                  ? 'Garantía por venta'
                  : politicasGarantia.tipo === 'FABRICANTE'
                    ? 'Garantía del fabricante'
                    : 'Sin garantía'}
              </div>
              <div>
                <strong>Días:</strong> {politicasGarantia.diasGarantia}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className={s.card}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Historial de mis solicitudes</h3>
            <Button variant="secondary" size="xs" onClick={() => void loadMyReturns()} loading={loadingHistory}>
              Actualizar
            </Button>
          </div>
          {loadingHistory ? (
            <p className={s.emptyText}>Cargando...</p>
          ) : historyError ? (
            <p className={s.imageError}>{historyError}</p>
          ) : myReturns.length === 0 ? (
            <p className={s.emptyText}>No tienes solicitudes de devolución registradas</p>
          ) : (
            <div className={s.tableWrapper}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>N° Solicitud</th>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Actualización</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {myReturns.map((ret) => (
                    <tr key={ret.id}>
                      <td>{ret.numeroDevolucion}</td>
                      <td>{formatDate(ret.createdAt)}</td>
                      <td>{ret.motivo ?? '—'}</td>
                      <td>
                        <span className={`${s.statusBadge} ${s[`status${ret.estado}`]}`}>
                          {ESTADO_TO_UI[ret.estado] ?? ret.estado}
                        </span>
                      </td>
                      <td>{formatDate(ret.updatedAt)}</td>
                      <td>
                        <Button variant="outline" size="xs" leftIcon={<Eye size={14} />} onClick={() => void openDetail(ret)}>
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail ? `Solicitud ${detail.numeroDevolucion}` : 'Detalle de la solicitud'}
        description={detail ? `Pedido ${detail.orderId} · ${detail.clienteSnapshot ?? ''}` : undefined}
        size="lg"
      >
        {detailLoading && (
          <div className={s.loadingRow}>
            <Loader2 size={20} className={s.spin} />
            <span>Cargando detalle...</span>
          </div>
        )}
        {!detailLoading && detail && (
          <div className={s.detailPanel}>
            <div className={s.statusSummary}>
              <StatusBadge status={detail.estado} label={ESTADO_TO_UI[detail.estado] ?? detail.estado} />
              <span>{detail.cantidadTotal} unidades</span>
              <span>Solicitada: {formatDate(detail.createdAt)}</span>
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>Información de la solicitud</h3>
              <div className={s.detailGrid}>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Motivo</span>
                  <span>{detail.motivo ?? '—'}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Canal</span>
                  <span>{detail.canalRegistro ?? 'PORTAL'}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Garantía</span>
                  <span>
                    {detail.tipoGarantiaSnapshot ?? 'NINGUNA'}
                    {detail.diasGarantiaSnapshot ? ` · ${detail.diasGarantiaSnapshot} días` : ''}
                  </span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Última actualización</span>
                  <span>{formatDateTime(detail.updatedAt)}</span>
                </div>
              </div>
              {detail.observaciones && (
                <div className={s.observationBox}>
                  <strong>Observaciones</strong>
                  <p>{detail.observaciones}</p>
                </div>
              )}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>Productos</h3>
              {detail.items.length === 0 ? (
                <p className={s.emptyText}>Sin productos registrados</p>
              ) : (
                <div className={s.tableWrapper}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Prenda</th>
                        <th>Solicitadas</th>
                        <th>Recibidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.ref}</td>
                          <td>{item.prenda}</td>
                          <td>{item.cantidadSolicitada}</td>
                          <td>{item.cantidadRecibida ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>Evidencias</h3>
              <ReturnEvidenceGallery
                returnRequestId={detail.id}
                evidencias={detail.evidencias}
                numeroDevolucion={detail.numeroDevolucion}
              />
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>Seguimiento</h3>
              {detail.histories.length === 0 ? (
                <p className={s.emptyText}>Sin cambios registrados</p>
              ) : (
                <div className={s.historyList}>
                  {detail.histories.map((history) => (
                    <div key={history.id} className={s.historyRow}>
                      <strong>{history.estadoNuevo ? ESTADO_TO_UI[history.estadoNuevo] : history.accion}</strong>
                      <p>
                        {formatDateTime(history.fecha)}
                        {history.observaciones ? ` · ${history.observaciones}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportarDevolucion;
