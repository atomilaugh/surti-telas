import React, { useEffect, useRef, useState } from 'react';
import { Send, Package, User, Paperclip, CheckCircle2, Clock, FileText, UserCheck, Archive, CreditCard, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import s from './Atencion-cliente.module.css';
import f from '@/styles/Form.module.css';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { DetailModal } from '@/shared/ui/DetailModal';
import { useClientes, usePedidos } from '@/core/stores';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Tooltip } from '@/shared/components/Tooltip';
import { useAuthStore } from '@/core/stores/authStore';
import type { Pedido } from '@/core/types';

interface Mensaje {
  id: number;
  texto: string;
  remitente: 'asesor' | 'cliente';
  hora: string;
}

export const AtencionCliente: React.FC = () => {
  const asesorActual = useAuthStore((st) => st.user?.name) || 'Sin asesor';
  const clientesStore = useClientes();
  const pedidosStore = usePedidos();
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoData, setPedidoData] = useState({ detalle: '', urgencia: 'Estándar' as 'Estándar' | 'Prioritario' });
  const [clienteActualId, setClienteActualId] = useState<string>('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  const clientes = clientesStore.clientes;
  const pedidos = pedidosStore.pedidos;

  const clienteInicial = clientes.find(c => c.asesor === asesorActual) || clientes[0];
  const clienteActual = clientes.find(c => c.id === clienteActualId) || clienteInicial || null;

  useEffect(() => {
    if (!clienteActualId && clienteInicial) {
      setClienteActualId(clienteInicial.id);
    }
  }, [clienteActualId, clienteInicial]);

  const historialCliente = pedidos.filter(p => p.cliente === clienteActual?.nombre).slice(0, 8);

  const openPedidoDetail = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setIsHistorialOpen(true);
  };

  const enviarMensaje = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    setMensajes(prev => [
      ...prev,
      { id: prev.length + 1, texto: nuevoMensaje, remitente: 'asesor', hora: new Date().toLocaleTimeString() },
    ]);
    setNuevoMensaje('');
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setMensajes(prev => [
        ...prev,
        { id: prev.length + 1, texto: `Archivo adjunto: ${file.name}`, remitente: 'asesor', hora: new Date().toLocaleTimeString() },
      ]);
    }
  };

  const handleGenerarPedido = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPedidoModalOpen(false);
    setPedidoData({ detalle: '', urgencia: 'Estándar' });
    toast.success('Pedido generado correctamente');
  };

  useEffect(() => { mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  return (
    <div className={s.container}>
      <header className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Centro de Atención</h1>
          <p className={s.pageSubtitle}>Gestiona las consultas, cotizaciones y pedidos de tus clientes asignados.</p>
        </div>
      </header>

      <div className={s.dashboardGrid}>
        <div className={s.chatContainer}>
          <div className={s.chatHeader}>
            <div className={s.asesorProfile}>
              <div className={s.avatarWrapper}>
                <User size={20} />
                <span className={s.statusDot}></span>
              </div>
              <div className={s.asesorMeta}>
                <h3>{clienteActual?.nombre || 'Cliente'}</h3>
                <span>{clienteActual?.ciudad || 'Sin ciudad'} • {clienteActual?.asesor || 'Sin asesor'}</span>
              </div>
            </div>
            <select className={s.select} value={clienteActualId} onChange={e => setClienteActualId(e.target.value)}>
              {clientes.filter(c => c.asesor === asesorActual).map(cliente => (
                <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
              ))}
            </select>
          </div>

          <div className={s.chatBody}>
            {mensajes.map((msg) => (
              <div key={msg.id} className={`${s.messageWrapper} ${msg.remitente === 'asesor' ? s.messageRight : s.messageLeft}`}>
                <div className={s.messageBubble}>
                  <p>{msg.texto}</p>
                  <span className={s.messageTime}>{msg.hora}</span>
                </div>
              </div>
            ))}
            <div ref={mensajesEndRef} />
          </div>

          <form className={s.chatInputArea} onSubmit={enviarMensaje}>
            <Tooltip title="Adjuntar catálogo o cotización"><button type="button" className={s.attachBtn} onClick={handleAttach}>
              <Paperclip size={20} />
            </button></Tooltip>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <input
              type="text"
              className={s.chatInput}
              placeholder="Escribe tu respuesta al cliente..."
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
            />
            <Button type="submit" className={s.sendBtn}>
              <Send size={18} />
            </Button>
          </form>
        </div>

        <div className={s.sidebar}>
          <div className={s.widgetCard}>
            <div className={s.widgetHeader}>
              <h3>Perfil del Cliente</h3>
              <UserCheck size={18} className={s.widgetIcon} />
            </div>
            <div className={s.statsGrid}>
              <div className={s.statBox}>
                <span className={s.statLabel}>Cartera Pendiente</span>
                <span className={s.statValue} style={{ color: '#ef4444' }}>${(clienteActual?.deudaVencida || 0).toLocaleString()}</span>
              </div>
              <div className={s.statBox}>
                <span className={s.statLabel}>Cupo Disponible</span>
                <span className={s.statValue}>${Math.max((clienteActual?.cupoTotal || 0) - (clienteActual?.cupoUsado || 0), 0).toLocaleString()}</span>
              </div>
              <div className={s.statBox} style={{ gridColumn: '1 / -1' }}>
                <span className={s.statLabel}>Tipo de Cliente</span>
                <StatusBadge status={clienteActual?.isTrustedCustomer ? 'Cliente de Confianza' : 'Cliente Estándar'} dot={clienteActual?.isTrustedCustomer} />
              </div>
              <div className={s.statBox} style={{ gridColumn: '1 / -1' }}>
                <span className={s.statLabel}>Contacto</span>
                <span className={s.statValue}>{clienteActual?.tel || '-'}</span>
              </div>
            </div>
          </div>

          <div className={s.widgetCard}>
            <h3>Acciones Rápidas</h3>
            <p className={s.widgetText}>Inicia un requerimiento formal en nombre de este cliente.</p>
            <Button className={s.fullWidthBtn} onClick={() => setIsPedidoModalOpen(true)}>
              <Package size={16} />
              Generar Pedido al Cliente
            </Button>
          </div>

          <div className={s.widgetCard}>
            <div className={s.widgetHeader}>
              <h3>Historial del Cliente</h3>
              <Button variant="ghost" size="sm" className={s.textBtn} onClick={() => setIsHistorialOpen(true)}>Ver todos</Button>
            </div>
            <div className={s.orderList}>
              {historialCliente.map(p => (
                <button key={p.id} type="button" className={s.orderItem} onClick={() => openPedidoDetail(p)}>
                  <div className={s.orderIcon}>
                    {p.estado === 'Entregado' ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} color="#C4A574" />}
                  </div>
                  <div className={s.orderInfo}>
                    <strong>{p.id}</strong>
                    <span>{p.estado} • {p.fecha}</span>
                  </div>
                </button>
              ))}
              {historialCliente.length === 0 && (
                <div className={s.orderItem}>
                  <div className={s.orderIcon}><Clock size={16} color="#C4A574" /></div>
                  <div className={s.orderInfo}>
                    <strong>Sin pedidos</strong>
                    <span>Este cliente aún no registra compras</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={s.widgetCard}>
            <div className={s.widgetHeader}>
              <h3>Herramientas de Venta</h3>
              <FileText size={18} className={s.widgetIcon} />
            </div>
            <div className={s.resourceList}>
              <div className={s.resourceItem}>
                <div className={s.resourceIcon}><FileText size={16} /></div>
                <span className={s.resourceName}>Recursos disponibles desde el panel de administración</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={isPedidoModalOpen} onClose={() => setIsPedidoModalOpen(false)} title={`Generar Pedido para ${clienteActual?.nombre || 'Cliente'}`}>
        <form className={f.form}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Detalles del pedido</h3>
            <div className={f.field}>
              <label className={f.label}>Detalles del requerimiento (Cantidades y Referencias)</label>
              <textarea
                className={f.textarea}
                placeholder="Ej: 50 metros de lino blanco (REF-002)..."
                value={pedidoData.detalle}
                onChange={(e) => setPedidoData({ ...pedidoData, detalle: e.target.value })}
              />
            </div>
            <div className={f.field}>
              <label className={f.label}>Prioridad de Despacho</label>
              <select className={f.select} value={pedidoData.urgencia} onChange={(e) => setPedidoData({ ...pedidoData, urgencia: e.target.value as 'Estándar' | 'Prioritario' })}>
                <option value="Estándar">Estándar (3-5 días hábiles)</option>
                <option value="Prioritario">Prioritario (48 hrs - Requiere aprobación)</option>
              </select>
            </div>
          </div>
          <div className={f.formActions}>
            <Button variant="secondary" onClick={() => setIsPedidoModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerarPedido}>Enviar a Bodega</Button>
          </div>
        </form>
      </Modal>

      <DetailModal
        children={null}
        open={isHistorialOpen}
        onClose={() => { setIsHistorialOpen(false); setSelectedPedido(null); }}
        title={selectedPedido ? `Pedido ${selectedPedido.id}` : 'Historial'}
        subtitle={selectedPedido?.fecha}
        size="xl"
        header={{
          icon: <Archive size={18} />,
          status: selectedPedido ? <StatusBadge status={selectedPedido.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Información del pedido',
            fields: [
              { label: 'Cliente', value: selectedPedido?.cliente, icon: <User size={16} /> },
              { label: 'Asesor', value: selectedPedido?.asesor, icon: <User size={16} /> },
              { label: 'Total', value: selectedPedido?.total, icon: <CreditCard size={16} /> },
              { label: 'Prioridad', value: selectedPedido?.prioridad || 'Estándar', icon: <Clock size={16} /> },
              { label: 'Observaciones', value: selectedPedido?.observaciones || 'Sin observaciones', fullWidth: true, icon: <FileText size={16} /> },
            ],
          },
          {
            title: 'Ubicación y contacto',
            fields: [
              { label: 'Ciudad cliente', value: clienteActual?.ciudad || 'No registrada', icon: <MapPin size={16} /> },
              { label: 'Teléfono cliente', value: clienteActual?.tel || 'No registrado', icon: <Phone size={16} /> },
            ],
          },
        ]}
      />
    </div>
  );
};
