import React, { useMemo, useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, User, MapPin, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import s from '../admin/Clientes.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DetailModal, type DetailSection } from '@/shared/ui/DetailModal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { Tooltip } from '@/shared/components/Tooltip';
import { useClientes, usePedidos } from '@/core/stores';
import { useAuthStore } from '@/core/stores/authStore';
import { authApi, type CreateUserRequest } from '@/infrastructure/api/authApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import type { Cliente } from '@/core/types';

const emptyClienteForm: Omit<Cliente, 'id' | 'pedidos'> = {
  nombre: '',
  ciudad: '',
  tel: '',
  asesor: '',
  estado: 'Activo',
  nit: '',
  cupoTotal: 0,
  cupoUsado: 0,
  deudaVencida: 0,
  isTrustedCustomer: false,
  email: '',
  direccion: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  password: '',
  confirmPassword: '',
};

export const AsesorClientes: React.FC = () => {
  const user = useAuthStore((st) => st.user);
  const asesorActual = user?.name || '';
  const { clientes, deleteCliente } = useClientes();
  const { pedidos } = usePedidos();
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<Omit<Cliente, 'id' | 'pedidos'>>(emptyClienteForm);

  const misClientes = useMemo(() => clientes.filter(c => c.asesor === asesorActual), [clientes, asesorActual]);

  const filteredClientes = useMemo(() => {
    return misClientes.filter(c =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.ciudad.toLowerCase().includes(search.toLowerCase()) ||
      c.tel.includes(search)
    );
  }, [misClientes, search]);

  const resetForm = () => {
    setForm({ ...emptyClienteForm, asesor: asesorActual });
    setEditingId(null);
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setForm({
      nombre: cliente.nombre,
      ciudad: cliente.ciudad,
      tel: cliente.tel,
      asesor: cliente.asesor,
      estado: cliente.estado,
      nit: cliente.nit || '',
      cupoTotal: cliente.cupoTotal || 0,
      cupoUsado: cliente.cupoUsado || 0,
      deudaVencida: cliente.deudaVencida || 0,
      isTrustedCustomer: cliente.isTrustedCustomer || false,
      email: (cliente as unknown as { email?: string }).email || '',
      direccion: (cliente as unknown as { direccion?: string }).direccion || '',
      tipoDocumento: ((cliente as unknown as { tipoDocumento?: string })?.tipoDocumento || 'CC') as Cliente['tipoDocumento'],
      numeroDocumento: (cliente as unknown as { numeroDocumento?: string }).numeroDocumento || '',
      password: '',
      confirmPassword: '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openDetail = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDetailOpen(true);
  };

  const openDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteOpen(true);
  };

  const saveCliente = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!form.apellidos?.trim()) {
      setFormError('El apellido es obligatorio.');
      return;
    }
    if (!editingId && !form.email?.trim()) {
      setFormError('El email es obligatorio.');
      return;
    }
    if (!form.tel.trim()) {
      setFormError('El teléfono es obligatorio.');
      return;
    }
    if (!form.tipoDocumento) {
      setFormError('El tipo de documento es obligatorio.');
      return;
    }
    if (!form.numeroDocumento?.trim()) {
      setFormError('El número de documento es obligatorio.');
      return;
    }
    if (!editingId && !form.password) {
      setFormError('La contraseña es obligatoria.');
      return;
    }
    if (!editingId && form.password !== form.confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    try {
      if (editingId) {
        const cliente = clientes.find(c => c.id === editingId);
        const customerId = (cliente as unknown as { customerId?: string })?.customerId || editingId;
        await customersApi.update(customerId, {
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email,
          tel: form.tel,
          nit: form.numeroDocumento,
          direccion: form.direccion,
          tipoDocumento: form.tipoDocumento as Cliente['tipoDocumento'],
          isTrustedCustomer: form.isTrustedCustomer,
          estado: form.estado,
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        const userPayload: CreateUserRequest = {
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email || '',
          password: form.password || '',
          role: 'CLIENTE',
          telefono: form.tel,
          direccion: form.direccion,
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: form.numeroDocumento,
        };
        await authApi.createUser(userPayload);
        await customersApi.create({
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email,
          tel: form.tel,
          nit: form.numeroDocumento,
          direccion: form.direccion,
          tipoDocumento: form.tipoDocumento as Cliente['tipoDocumento'],
          isTrustedCustomer: form.isTrustedCustomer,
          estado: form.estado,
        });
        toast.success('Cliente creado con usuario de acceso');
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el cliente';
      if (message.toLowerCase().includes('ya está registrado') || message.toLowerCase().includes('ya existe') || message.toLowerCase().includes('duplicado')) {
        setFormError(`No se puede crear la cuenta: ${message}`);
      } else if (message.includes('422')) {
        setFormError(`No se puede crear la cuenta: datos inválidos - ${message}`);
      } else {
        setFormError(`No se puede crear la cuenta: ${message}`);
      }
    }
  };

  const confirmDelete = async () => {
    if (!selectedCliente) return;
    await deleteCliente(selectedCliente.id);
    toast.success(`Cliente ${selectedCliente.nombre} eliminado`);
    setIsDeleteOpen(false);
    setSelectedCliente(null);
  };

  const pedidosCliente = selectedCliente
    ? pedidos.filter(p => p.cliente === selectedCliente.nombre).slice(0, 5)
    : [];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Mis Clientes</h1>
          <p className={s.pageSubtitle}>Clientes asignados a tu cartera</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nuevo Cliente
        </Button>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
      </div>

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Ciudad</th>
              <th>Teléfono</th>
              <th>Pedidos</th>
              <th>Estado</th>
              <th>Confianza</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              filteredClientes.map(cliente => (
                <tr key={cliente.id}>
                  <td className={s.tdMono}>{cliente.id}</td>
                  <td className={s.tdPrimary}>{cliente.nombre}</td>
                  <td>{cliente.ciudad}</td>
                  <td>{cliente.tel}</td>
                  <td>{cliente.pedidos}</td>
                  <td>
                    <StatusBadge status={cliente.estado} />
                  </td>
                  <td>
                    <StatusBadge status={cliente.isTrustedCustomer ? 'Cliente de Confianza' : 'Estándar'} dot={cliente.isTrustedCustomer} />
                  </td>
                  <td>
                    <div className={s.actions}>
                      <Tooltip title="Ver"><button className={s.actionBtn} onClick={() => openDetail(cliente)}>
                        <Eye size={14} />
                      </button></Tooltip>
                      <Tooltip title="Editar"><button className={s.actionBtn} onClick={() => openEdit(cliente)}>
                        <Edit size={14} />
                      </button></Tooltip>
                      <Tooltip title="Eliminar"><button className={s.actionBtn} onClick={() => openDelete(cliente)}>
                        <Trash2 size={14} />
                      </button></Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DetailModal
        children={null}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedCliente ? `Cliente ${selectedCliente.id}` : 'Cliente'}
        subtitle={selectedCliente?.ciudad}
        size="xl"
        header={{
          icon: <User size={18} />,
          status: selectedCliente ? <StatusBadge status={selectedCliente.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Información comercial',
            fields: [
              { label: 'Nombre', value: selectedCliente?.nombre, icon: <User size={16} /> },
              { label: 'Ciudad', value: selectedCliente?.ciudad, icon: <MapPin size={16} /> },
              { label: 'Teléfono', value: selectedCliente?.tel, icon: <Phone size={16} /> },
              { label: 'NIT', value: selectedCliente?.nit || 'No registrado', icon: <CreditCard size={16} /> },
              { label: 'Asesor asignado', value: selectedCliente?.asesor, icon: <User size={16} /> },
            ],
          },
          {
            title: 'Cupo y cartera',
            fields: [
              { label: 'Cupo total', value: `$${(selectedCliente?.cupoTotal || 0).toLocaleString()}`, icon: <CreditCard size={16} /> },
              { label: 'Cupo usado', value: `$${(selectedCliente?.cupoUsado || 0).toLocaleString()}`, icon: <CreditCard size={16} /> },
              { label: 'Disponible', value: `$${Math.max((selectedCliente?.cupoTotal || 0) - (selectedCliente?.cupoUsado || 0), 0).toLocaleString()}`, icon: <CreditCard size={16} /> },
              { label: 'Deuda vencida', value: `$${(selectedCliente?.deudaVencida || 0).toLocaleString()}`, icon: <CreditCard size={16} />, tone: selectedCliente && selectedCliente.deudaVencida ? 'danger' : undefined },
            ],
          },
          {
            title: 'Pedidos recientes',
            children: pedidosCliente.length > 0 ? (
              <div className="grid gap-3">
                {pedidosCliente.map(pedido => (
                  <div key={pedido.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[var(--color-text-primary)]">{pedido.id}</div>
                        <div className="text-sm text-[var(--color-text-secondary)]">{pedido.fecha} • {pedido.items} artículos</div>
                      </div>
                      <StatusBadge status={pedido.estado} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
                Este cliente aún no tiene pedidos registrados.
              </div>
            ),
          },
        ]}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            {selectedCliente && (
              <Button onClick={() => { setIsDetailOpen(false); openEdit(selectedCliente); }}>
                <Edit size={14} />
                Editar cliente
              </Button>
            )}
          </div>
        }
      />

      <DetailModal
        children={null}
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); resetForm(); }}
        title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
        subtitle={editingId ? 'Actualiza la información de la cuenta' : 'Crea un cliente para tu cartera'}
        size="lg"
        sections={[
          {
            title: 'Datos personales',
            children: (
              <div className={f.form}>
                {formError && <div className={f.formError}>{formError}</div>}
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="nombre">Nombre *</label>
                    <input id="nombre" type="text" className={f.input} name="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100} autoComplete="given-name" />
                  </div>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="apellidos">Apellidos *</label>
                    <input id="apellidos" type="text" className={f.input} name="apellidos" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required maxLength={100} autoComplete="family-name" />
                  </div>
                </div>
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="email">Email {editingId ? '' : '*'}</label>
                    <input id="email" type="email" className={f.input} name="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!editingId} maxLength={100} autoComplete="email" />
                  </div>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="telefono">Teléfono</label>
                    <input id="telefono" type="tel" className={f.input} name="telefono" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} maxLength={11} pattern="[0-9]*" inputMode="numeric" autoComplete="tel" />
                  </div>
                </div>
              </div>
            ),
          },
          {
            title: 'Documento y dirección',
            children: (
              <div className={f.form}>
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="tipoDocumento">Tipo de documento *</label>
                    <select id="tipoDocumento" className={f.select} name="tipoDocumento" value={form.tipoDocumento} onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value as Cliente['tipoDocumento'] })} required>
                      <option value="">Selecciona...</option>
                      <option value="CC">Cédula de ciudadanía</option>
                      <option value="NIE">NIE</option>
                      <option value="PASSPORT">Pasaporte</option>
                      <option value="CE">Cédula de extranjería</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="numeroDocumento">Número de documento *</label>
                    <input id="numeroDocumento" type="text" className={f.input} name="numeroDocumento" value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })} required maxLength={20} inputMode="numeric" />
                  </div>
                </div>
                <div className={f.field}>
                  <label className={f.label} htmlFor="direccion">Dirección</label>
                  <input id="direccion" type="text" className={f.input} name="direccion" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} maxLength={200} autoComplete="street-address" />
                </div>
              </div>
            ),
          },
          !editingId && {
            title: 'Seguridad',
            children: (
              <div className={f.form}>
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="password">Contraseña *</label>
                     <input id="password" type="password" className={f.input} name="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                  </div>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="confirmPassword">Confirmar contraseña *</label>
                    <input id="confirmPassword" type="password" className={f.input} name="confirmPassword" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required minLength={8} placeholder="Repite la contraseña" autoComplete="new-password" />
                  </div>
                </div>
              </div>
            ),
          },
          {
            title: 'Estado',
            children: (
              <div className={f.form}>
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label} htmlFor="estado">Estado</label>
                    <select id="estado" className={f.select} name="estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Cliente['estado'] })}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div className={f.field} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" id="isTrustedCustomer" name="isTrustedCustomer" checked={form.isTrustedCustomer} onChange={(e) => setForm({ ...form, isTrustedCustomer: e.target.checked })} />
                    <label htmlFor="isTrustedCustomer" className={f.label} style={{ margin: 0 }}>Cliente de confianza</label>
                  </div>
                </div>
              </div>
            ),
          },
        ].filter(Boolean) as DetailSection[]}
        footer={
          <div className={f.formActions}>
            <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancelar</Button>
            <Button type="button" onClick={saveCliente}>{editingId ? 'Guardar cambios' : 'Crear cliente'}</Button>
          </div>
        }
      />

      <ConfirmationModal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar cliente"
        description={`¿Estás seguro de eliminar a ${selectedCliente?.nombre}? Esta acción no elimina el historial de pedidos existentes.`}
        variant="danger"
        confirmLabel="Eliminar"
      />
    </div>
  );
};
