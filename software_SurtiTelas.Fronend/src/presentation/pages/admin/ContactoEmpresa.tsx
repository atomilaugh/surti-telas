import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Mail, Phone, MapPin, Clock, Send, MessageSquare, Plus, Archive, Paperclip, ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import s from './ContactoEmpresa.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { contactApi, type ContactMessage } from '@/infrastructure/api/contactApi';
import { companyApi } from '@/infrastructure/api/companyApi';
import { TIPOS_CONTACTO, ESTADOS_CONTACTO } from '@/shared/constants/options';

interface MensajeContacto {
  id: string;
  asunto: string;
  remitente: string;
  email: string;
  telefono?: string;
  empresa?: string;
  tipo: (typeof TIPOS_CONTACTO)[number];
  fecha: string;
  estado: (typeof ESTADOS_CONTACTO)[number];
  mensaje: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

const formatFecha = (value: string): string => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toMensajeContacto = (m: ContactMessage): MensajeContacto => ({
  id: m.id,
  asunto: m.asunto,
  remitente: m.nombre,
  email: m.email,
  telefono: m.telefono,
  empresa: m.nombre,
  tipo: 'Consulta general',
  fecha: formatFecha(m.createdAt),
  estado: m.estado === 'Nuevo' ? 'Nuevo' : m.estado === 'Respondido' ? 'Respondido' : 'Cerrado',
  mensaje: m.mensaje,
  prioridad: m.prioridad === 'Alta' ? 'Alta' : m.prioridad === 'Media' ? 'Media' : 'Baja',
});

interface InfoEmpresa {
  email: string;
  telefono: string;
  direccion: string;
  horario: string;
}

export const AdminContactoEmpresa: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | (typeof ESTADOS_CONTACTO)[number]>('Todos');
  const [filtroTipo, _setFiltroTipo] = useState<string>('Todos');
  const [showNuevoMensaje, setShowNuevoMensaje] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [mensajes, setMensajes] = useState<MensajeContacto[]>([]);
  const [infoEmpresa, setInfoEmpresa] = useState<InfoEmpresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await contactApi.list();
        setMensajes(data.map(toMensajeContacto));
      } catch {
        setError('No se pudieron cargar los mensajes de contacto');
        toast.error('No se pudieron cargar los mensajes de contacto');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const company = await companyApi.get();
      setInfoEmpresa({
        email: company.email ?? 'No disponible',
        telefono: company.telefono ?? 'No disponible',
        direccion: company.direccion ?? 'No disponible',
        horario: company.ciudad ?? 'No disponible',
      });
    } catch {
      setInfoEmpresa(null);
    }
  };

  useEffect(() => {
    void loadCompanyInfo();
  }, []);

  const filteredMensajes = useMemo(() => {
    return mensajes.filter(m =>
      (filtroEstado === 'Todos' || m.estado === filtroEstado) &&
      (filtroTipo === 'Todos' || m.tipo === filtroTipo) &&
      (m.asunto.toLowerCase().includes(search.toLowerCase()) ||
       m.remitente.toLowerCase().includes(search.toLowerCase()) ||
       m.empresa?.toLowerCase().includes(search.toLowerCase()) ||
       m.mensaje.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search, filtroEstado, filtroTipo, mensajes]);

  const _getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return s.prioridadAlta;
      case 'Media': return s.prioridadMedia;
      case 'Baja': return s.prioridadBaja;
      default: return '';
    }
  };

  const stats = {
    nuevos: mensajes.filter(m => m.estado === 'Nuevo').length,
    urgentes: mensajes.filter(m => m.prioridad === 'Alta' && m.estado !== 'Cerrado').length,
    respondidos: mensajes.filter(m => m.estado === 'Respondido').length,
    cerrados: mensajes.filter(m => m.estado === 'Cerrado').length,
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Contacto con Empresa</h1>
          <p className={s.pageSubtitle}>Comunicación institucional</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setShowNuevoMensaje(!showNuevoMensaje)}>
          Nuevo Mensaje
        </Button>
      </div>

      {showNuevoMensaje && (
        <div className={s.nuevoMensajePanel}>
          <h3 className={s.nuevoMensajeTitle}>Redactar nuevo mensaje</h3>
          <div className={s.formGrid}>
            <div className={s.field}>
              <label className={s.label}>Destinatario / Empresa</label>
              <input type="text" className={s.input} placeholder="Nombre o empresa..." />
            </div>
            <div className={s.field}>
              <label className={s.label}>Email</label>
              <input type="email" className={s.input} placeholder="correo@empresa.com" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Asunto</label>
              <input type="text" className={s.input} placeholder="Asunto del mensaje..." />
            </div>
            <div className={s.field}>
              <label className={s.label}>Tipo</label>
              <div className={s.selectWrapper}>
                <select className={s.select}>
                  <option value="">Seleccione...</option>
                  {TIPOS_CONTACTO.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown size={16} className={s.selectIcon} />
              </div>
            </div>
            <div className={s.fieldFull}>
              <label className={s.label}>Mensaje</label>
              <textarea className={s.textarea} rows={4} placeholder="Escriba su mensaje..." />
            </div>
            <div className={s.fieldFull}>
              <label className={s.label}>Adjuntar archivo</label>
              <div className={s.adjuntoBox}>
                <Paperclip size={16} />
                <span>Haga clic para adjuntar archivo</span>
              </div>
            </div>
          </div>
          <div className={s.formActions}>
            <Button variant="secondary" onClick={() => setShowNuevoMensaje(false)}>Cancelar</Button>
            <Button leftIcon={<Send size={16} />} onClick={() => { toast.info('La creación de mensajes desde el panel administrativo no está implementada'); setShowNuevoMensaje(false); }} disabled>Enviar mensaje</Button>
          </div>
        </div>
      )}

      <div className={s.infoBar}>
        <div className={s.infoCard}>
          <Mail size={18} className={s.infoIcon} />
          <div>
            <div className={s.infoLabel}>{infoEmpresa?.email ?? 'No disponible'}</div>
            <div className={s.infoValue}>Email</div>
          </div>
        </div>
        <div className={s.infoCard}>
          <Phone size={18} className={s.infoIcon} />
          <div>
            <div className={s.infoLabel}>{infoEmpresa?.telefono ?? 'No disponible'}</div>
            <div className={s.infoValue}>Teléfono</div>
          </div>
        </div>
        <div className={s.infoCard}>
          <MapPin size={18} className={s.infoIcon} />
          <div>
            <div className={s.infoLabel}>{infoEmpresa?.direccion ?? 'No disponible'}</div>
            <div className={s.infoValue}>Dirección</div>
          </div>
        </div>
        <div className={s.infoCard}>
          <Clock size={18} className={s.infoIcon} />
          <div>
            <div className={s.infoLabel}>{infoEmpresa?.horario ?? 'No disponible'}</div>
            <div className={s.infoValue}>Horario</div>
          </div>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <MessageSquare size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{stats.nuevos}</div>
            <div className={s.statLabel}>Nuevos</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardWarning}`}>
          <AlertTriangle size={20} className={s.statIconWarning} />
          <div>
            <div className={s.statValue}>{stats.urgentes}</div>
            <div className={s.statLabel}>Urgentes</div>
          </div>
        </div>
        <div className={s.statCard}>
          <Send size={20} className={s.statIconSuccess} />
          <div>
            <div className={s.statValue}>{stats.respondidos}</div>
            <div className={s.statLabel}>Respondidos</div>
          </div>
        </div>
        <div className={s.statCard}>
          <Archive size={20} className={s.statIconDone} />
          <div>
            <div className={s.statValue}>{stats.cerrados}</div>
            <div className={s.statLabel}>Cerrados</div>
          </div>
        </div>
      </div>

      <div className={s.filters}>
        <div className={s.filterGroup}>
          {['Todos', ...ESTADOS_CONTACTO].map(estado => (
            <button
              key={estado}
              className={`${s.filterBtn} ${filtroEstado === estado ? s.filterBtnActive : ''}`}
              onClick={() => setFiltroEstado(estado as typeof filtroEstado)}
            >
              {estado}
            </button>
          ))}
        </div>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por asunto, remitente o mensaje..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
      </div>

      {loading && (
        <div className={s.loadingRow}>
          <Loader2 size={18} className={s.spin} />
          <span>Cargando mensajes de contacto...</span>
        </div>
      )}
      {error && !loading && (
        <div className={s.errorRow}>{error}</div>
      )}

      <DataTable enableExport={false} enableRowSelection={false}
        data={filteredMensajes}
        pageSize={10}
        emptyMessage={loading ? 'Cargando mensajes de contacto...' : error ? error : 'No se encontraron mensajes de contacto'}
        maxVisibleColumns={5}
        detailPanel={{
          title: (m) => m.asunto,
          render: (m) => (
            <div className={s.detailPanel}>
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Datos del contacto</h4>
                <div className={s.detailGrid}>
                  <div className={s.detailItem}><span className={s.detailLabel}>Remitente</span><span>{m.remitente}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Empresa</span><span>{m.empresa || '-'}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Email</span><span>{m.email}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Teléfono</span><span>{m.telefono || '-'}</span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Tipo</span><span><StatusBadge status={m.tipo} /></span></div>
                  <div className={s.detailItem}><span className={s.detailLabel}>Prioridad</span><span>{m.prioridad}</span></div>
                </div>
              </div>
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Mensaje</h4>
                <div className={s.detailItemFull}><span>{m.mensaje}</span></div>
              </div>
              {m.estado !== 'Cerrado' && (
                <div className={s.detailSection}>
                  <h4 className={s.detailSectionTitle}>Responder</h4>
                  <textarea className={s.textarea} rows={4} placeholder="Escriba su respuesta..." value={respuesta} onChange={e => setRespuesta(e.target.value)} />
                </div>
              )}
            </div>
          ),
        }}
        actions={(m) => [
           ...((m.estado === 'Nuevo' || m.estado === 'Leído') ? [{ label: 'Responder', icon: <Send size={14} />, onClick: async () => {
             if (!respuesta.trim()) { toast.error('Escribe una respuesta antes de enviar'); return; }
             await contactApi.reply(m.id, respuesta.trim());
             setMensajes(prev => prev.map(msg => msg.id === m.id ? { ...msg, estado: 'Respondido', respuesta: respuesta.trim(), respondidoPor: 'Tú', respondidoEn: new Date().toISOString() } : msg));
             setRespuesta('');
             toast.success('Respuesta enviada');
           } }] : []),
          ...(m.estado === 'Respondido' ? [{ label: 'Cerrar mensaje', icon: <Archive size={14} />, onClick: async () => {
             await contactApi.close(m.id);
             setMensajes(prev => prev.map(msg => msg.id === m.id ? { ...msg, estado: 'Cerrado' } : msg));
             toast.success(`Mensaje ${m.id} cerrado`);
           } }] : []),
        ]}
        columns={[
          { key: 'id', header: 'ID', width: '80px', sortable: true, render: (m) => <span className={s.tdMono}>{m.id}</span> },
          { key: 'tipo', header: 'Tipo', width: '120px', sortable: true, filterable: true, filterType: 'select', filterOptions: TIPOS_CONTACTO.map(t => ({ value: t, label: t })), render: (m) => (
            <StatusBadge status={m.tipo} />
          )},
          { key: 'asunto', header: 'Asunto', sortable: true, render: (m) => <span className={s.tdPrimary}>{m.asunto}</span> },
          { key: 'fecha', header: 'Fecha', width: '120px', sortable: true, render: (m) => (
            <div className={s.fechaCell}>
              <Clock size={14} />
              {m.fecha}
            </div>
          )},
          { key: 'prioridad', header: 'Prioridad', width: '100px', sortable: true, render: (m) => (
            <StatusBadge status={m.prioridad} />
          )},
          { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: ESTADOS_CONTACTO.map(e => ({ value: e, label: e })), render: (m) => (
            <StatusBadge status={m.estado} />
          )},
        ]}
      />
    </div>
  );
};

