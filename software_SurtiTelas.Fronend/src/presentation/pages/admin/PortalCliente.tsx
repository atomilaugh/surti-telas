import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Package, Clock, Truck, CheckCircle, XCircle,
  Download, MessageSquare, RefreshCw,
} from 'lucide-react';
import s from './PortalCliente.module.css';
import { Button } from '@/shared/ui/Button';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import type { Pedido } from '@/core/types';

import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

const STATUS_ICONS: Record<string, ComponentType<LucideProps>> = {
  Pendiente: Clock,
  Aceptado: Package,
  'En validación': Clock,
  'Recibo generado': Package,
  'Recibo enviado': Package,
  Listo: Package,
  Enviado: Truck,
  Entregado: CheckCircle,
  Rechazado: XCircle,
  Cancelado: XCircle,
};

const ESTADOS_ORDEN = ['Pendiente', 'Aceptado', 'Listo', 'Enviado', 'Entregado', 'Rechazado', 'En validación', 'Recibo generado', 'Recibo enviado', 'Cancelado'] as const;

export const PortalCliente: React.FC = () => {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ordersApi.list();
      setOrders(result.pedidos);
    } catch {
      toast.error('No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.estado === filter);

  const handleDownload = () => {
    toast.info('Descargando recibo...');
  };

  const handleContact = () => {
    toast.info('Abriendo chat con asesor...');
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1>Mis Pedidos</h1>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw size={16} /> Actualizar
        </Button>
      </div>

      <div className={s.filters}>
        {['all', ...ESTADOS_ORDEN].map((status) => (
          <button
            key={status}
            className={`${s.filterBtn} ${filter === status ? s.active : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'Todos' : status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.loading}><p>Cargando pedidos...</p></div>
      ) : (
        <div className={s.orderList}>
          {filtered.map((order) => {
            const Icon = STATUS_ICONS[order.estado as keyof typeof STATUS_ICONS] || Package;
            return (
              <div key={order.id} className={s.orderCard}>
                <div className={s.orderHeader}>
                  <Icon size={20} />
                  <span className={s.orderId}>#{order.numero}</span>
                  <span className={`${s.status} ${s[order.estado?.toLowerCase() || 'pending']}`}>
                    {order.estado}
                  </span>
                </div>
                <div className={s.orderDetails}>
                  <span>Fecha: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</span>
                  <span>Total: ${typeof order.total === 'number' ? order.total.toLocaleString('es-CO') : order.total}</span>
                </div>
                <div className={s.orderActions}>
                  <Button variant="ghost" size="sm" leftIcon={<Download size={14} />} onClick={() => handleDownload()}>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleContact}>
                    <MessageSquare size={14} /> Asesor
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className={s.empty}>
              <Package size={48} />
              <p>No se encontraron pedidos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


