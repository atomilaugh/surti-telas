import { create } from 'zustand';
import type { Cliente, Pedido, Producto, OrdenProduccion, MovimientoInventario, Notificacion, Proveedor } from '@/core/types';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';

/* ──────────────────────────────────────────────
   SEED DATA (solo para módulos aún sin backend:
   proveedores, producción, notificaciones — Fase 3/4)
   productos, clientes y pedidos ahora vienen del backend.
   ────────────────────────────────────────────── */
const seedProduccion: OrdenProduccion[] = [];
const _seedNotificaciones: Notificacion[] = [];
const seedProveedores: Proveedor[] = [];

/* ──────────────────────────────────────────────
   LOCAL STORAGE HELPERS (persistencia temporal de
   los módulos que todavía no tienen backend)
   ────────────────────────────────────────────── */
const STORAGE_KEYS = {
  proveedores: 'surti_proveedores',
  produccion: 'surti_produccion',
  inventario: 'surti_inventario',
  notificaciones: 'surti_notificaciones',
} as const;

function loadFromStorage<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

let _proveedores = loadFromStorage<Proveedor>(STORAGE_KEYS.proveedores, seedProveedores);
let _produccion = loadFromStorage<OrdenProduccion>(STORAGE_KEYS.produccion, seedProduccion);
let _inventario = loadFromStorage<MovimientoInventario>(STORAGE_KEYS.inventario, []);

/* Ýndice numero(pedido visible) → id(cuid) para mutaciones contra el backend. */
let _orderIdByNumero: Record<string, string> = {};

/* ──────────────────────────────────────────────
   ID GENERATORS  (para entidades optimistas locales)
   ────────────────────────────────────────────── */
function tempRef(list: Producto[]): string {
  const max = list.reduce((a, p) => {
    const n = parseInt((p.ref || '').replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? a : Math.max(a, n);
  }, 0);
  return `REF-${String(max + 1).padStart(3, '0')}`;
}

function nextProveedorId(list: Proveedor[]): string {
  const max = list.reduce((a, p) => {
    const n = parseInt(p.id.replace('PRV-', ''), 10);
    return Number.isNaN(n) ? a : Math.max(a, n);
  }, 0);
  return `PRV-${String(max + 1).padStart(3, '0')}`;
}

function nextOpId(list: OrdenProduccion[]): string {
  const max = list.reduce((a, o) => {
    const n = parseInt(o.id.replace('OP-', ''), 10);
    return Number.isNaN(n) ? a : Math.max(a, n);
  }, 0);
  return `OP-${String(max + 1).padStart(3, '0')}`;
}

function parseTotal(total: number | string): number {
  return parseInt(String(total).replace(/[^0-9]/g, ''), 10) || 0;
}

/* ──────────────────────────────────────────────
   ZUSTAND STORE
   ────────────────────────────────────────────── */
export interface AppState {
  // datos
  productos: Producto[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  pedidos: Pedido[];
  produccion: OrdenProduccion[];
  inventario: MovimientoInventario[];
  notificaciones: Notificacion[];

  // operaciones pendientes (optimistic updates)
  pendingOperations: Set<string>;
  hasPendingOperations: () => boolean;

  // helpers internos de concurrencia
  _addPending: (key: string) => void;
  _removePending: (key: string) => void;

  // hidratación desde el backend
  hydrateProductos: () => Promise<void>;
  hydrateClientes: () => Promise<void>;
  hydratePedidos: () => Promise<void>;
  hydrateAll: () => Promise<void>;

  // acciones productos
  createProducto: (data: Omit<Producto, 'ref'>) => Promise<Producto>;
  updateProducto: (ref: string, data: Partial<Producto>) => Promise<Producto>;
  deleteProducto: (ref: string) => Promise<void>;
  publishProducto: (ref: string) => Promise<boolean>;
  unpublishProducto: (ref: string) => Promise<boolean>;
  getCatalogProducts: () => Producto[];

  // acciones clientes
  createCliente: (data: Omit<Cliente, 'id' | 'pedidos'>) => Promise<Cliente>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<Cliente>;
  deleteCliente: (id: string) => Promise<void>;

  // acciones proveedores
  createProveedor: (data: Omit<Proveedor, 'id'>) => Proveedor;
  updateProveedor: (id: string, data: Partial<Proveedor>) => Proveedor;
  deleteProveedor: (id: string) => void;

  // acciones pedidos
  createPedido: (data: Omit<Pedido, 'id'>) => Promise<Pedido>;
  updatePedido: (id: string, data: Partial<Pedido>) => Promise<Pedido>;
  deletePedido: (id: string) => Promise<void>;

  // acciones producción
  createOrden: (data: Omit<OrdenProduccion, 'id'>) => OrdenProduccion;
  updateOrden: (id: string, data: Partial<OrdenProduccion>) => OrdenProduccion;
  deleteOrden: (id: string) => void;

  // inventario
  addMovimiento: (mov: Omit<MovimientoInventario, 'id' | 'fecha'>) => MovimientoInventario;
  getMovimientosPorProducto: (ref: string) => MovimientoInventario[];

  // métricas dashboard
  getMetricas: () => {
    totalVentas: number;
    totalPedidos: number;
    totalClientes: number;
    totalProductos: number;
    stockBajo: number;
    productosAgotados: number;
    ingresosTotales: number;
  };
}

export const useAppStore = create<AppState>((_set, _get) => ({
  productos: [],
  clientes: [],
  proveedores: _proveedores,
  pedidos: [],
  produccion: _produccion,
  inventario: _inventario,
  notificaciones: [],
  pendingOperations: new Set<string>(),

  /* ── Helpers de concurrencia ── */
  _addPending: (key: string) => _set((s) => ({ pendingOperations: new Set(s.pendingOperations).add(key) })),
  _removePending: (key: string) => {
    const next = new Set(_get().pendingOperations);
    next.delete(key);
    _set({ pendingOperations: next });
  },
  hasPendingOperations: () => _get().pendingOperations.size > 0,

  /* ── Hidratación ── */
  hydrateProductos: async () => {
    try {
      const result = await catalogApi.list();
      _set({ productos: result.data });
    } catch {
      /* backend no disponible: se mantiene lista actual */
    }
  },

  hydrateClientes: async () => {
    if (!tokenStorage.getAccessToken()) return;
    try {
      const result = await customersApi.list();
      _set({ clientes: result.data });
    } catch {
      /* sin sesión o backend no disponible */
    }
  },

  hydratePedidos: async () => {
    if (!tokenStorage.getAccessToken()) return;
    try {
      const result = await ordersApi.list();
      _orderIdByNumero = result.idByNumero;
      _set({ pedidos: result.pedidos });
    } catch {
      /* sin sesión o backend no disponible */
    }
  },

  hydrateAll: async () => {
    await Promise.all([
      _get().hydrateProductos(),
      _get().hydrateClientes(),
      _get().hydratePedidos(),
    ]);
  },

  /* ── Productos (backend: /catalog) ── */
  createProducto: (data) => {
    const productos = _get().productos;
    const base = data as Omit<Producto, 'ref'>;
    const ref = tempRef(productos);
    const optimista: Producto = {
      ref,
      codigo: base.codigo || ref,
      nombre: base.nombre,
      descripcion: base.descripcion || '',
      descripcionCorta: base.descripcionCorta || base.descripcion || base.nombre || 'Sin descripción',
      categoria: base.categoria || 'General',
      subcategoria: base.subcategoria || '',
      marca: base.marca || 'SurtiTelas',
      precio: base.precio,
      precioAnterior: base.precioAnterior || 0,
      descuento: base.descuento || 0,
      stock: base.stock,
      cantidadStock: base.cantidadStock,
      estado: base.estado || 'Activo',
      imagenes: base.imagenes || [],
      imagenPrincipal: base.imagenPrincipal || (base.imagenes && base.imagenes[0]) || '',
      publicado: false,
      fechaPublicacion: undefined,
      destacado: base.destacado || false,
      oferta: base.oferta || false,
      nuevo: base.nuevo || false,
      masVendido: base.masVendido || false,
      tela: base.tela,
      colores: base.colores,
      tallas: base.tallas,
    };
    _set({ productos: [...productos, optimista] });
    const pendingKey = `producto:${ref}`;
    _get()._addPending(pendingKey);

    return catalogApi
      .create(optimista)
      .then((creado) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? creado : p)) });
        return creado;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.filter((p) => p.ref !== ref) });
        // Notificación manejada por backend
        throw err;
      });
  },

  updateProducto: (ref, data) => {
    const productos = _get().productos;
    const idx = productos.findIndex((p) => p.ref === ref);
    if (idx === -1) return Promise.reject(new Error('Producto no encontrado'));
    const actualizado = { ...productos[idx], ...data };
    const anteriores = [...productos];
    anteriores[idx] = actualizado;
    _set({ productos: anteriores });

    const pendingKey = `producto:${ref}`;
    _get()._addPending(pendingKey);
    return catalogApi
      .update(ref, data)
      .then((actualizadoSrv) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? actualizadoSrv : p)) });
        return actualizadoSrv;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? productos[idx] : p)) });
        // Notificaci�n manejada por backend
        throw err;
      });
  },

  deleteProducto: (ref) => {
    _set({ productos: _get().productos.filter((p) => p.ref !== ref) });
    const pendingKey = `producto:${ref}`;
    _get()._addPending(pendingKey);
    return catalogApi
      .remove(ref)
      .then(() => {
        _get()._removePending(pendingKey);
      })
      .catch(() => {
        _get()._removePending(pendingKey);
        _get().hydrateProductos();
        // Notificaci�n manejada por backend
        throw new Error('No se pudo eliminar el producto');
      });
  },

  publishProducto: (ref) => {
    const productos = _get().productos;
    const idx = productos.findIndex((p) => p.ref === ref);
    if (idx === -1) return Promise.resolve(false);

    const product = productos[idx];
    const hasRequiredFields = product.nombre?.trim() !== '' && (product.categoria ?? '').trim() !== '' && product.precio > 0 && ((product.imagenPrincipal && product.imagenPrincipal.trim() !== '') || (product.imagenes && product.imagenes.length > 0));
    if (!hasRequiredFields) return Promise.resolve(false);

    const anteriores = [...productos];
    const now = new Date().toISOString();
    anteriores[idx] = { ...product, publicado: true, fechaPublicacion: product.fechaPublicacion || now };
    _set({ productos: anteriores });

    const pendingKey = `producto:${ref}`;
    _get()._addPending(pendingKey);
    return catalogApi
      .publish(ref)
      .then((prodSrv) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? prodSrv : p)) });
        // Notificaci�n manejada por backend
        return true;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? productos[idx] : p)) });
        // Notificaci�n manejada por backend
        throw err;
      });
  },

  unpublishProducto: (ref) => {
    const productos = _get().productos;
    const idx = productos.findIndex((p) => p.ref === ref);
    if (idx === -1) return Promise.resolve(false);
    const anteriores = [...productos];
    anteriores[idx] = { ...productos[idx], publicado: false };
    _set({ productos: anteriores });

    const pendingKey = `producto:${ref}`;
    _get()._addPending(pendingKey);
    return catalogApi
      .unpublish(ref)
      .then((prodSrv) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? prodSrv : p)) });
        return true;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ productos: _get().productos.map((p) => (p.ref === ref ? productos[idx] : p)) });
        // Notificaci�n manejada por backend
        throw err;
      });
  },

  getCatalogProducts: () => _get().productos.filter((p) => p.publicado && p.stock !== 'Agotado'),

  /* ── Clientes (backend: /customers) ── */
  createCliente: (data) => {
    const clientes = _get().clientes;
    const optimista: Cliente = { ...data, id: `tmp-${Date.now()}`, pedidos: 0, isTrustedCustomer: data.isTrustedCustomer ?? false };
    _set({ clientes: [...clientes, optimista] });

    const pendingKey = `cliente:${optimista.id}`;
    _get()._addPending(pendingKey);
    return customersApi
      .create(data)
      .then((creado) => {
        _get()._removePending(pendingKey);
        _set({ clientes: _get().clientes.map((c) => (c.id === optimista.id ? creado : c)) });
        return creado;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ clientes: _get().clientes.filter((c) => c.id !== optimista.id) });
        // Notificaci�n manejada por backend
        throw err;
      });
  },

  updateCliente: (id, data) => {
    const clientes = _get().clientes;
    const idx = clientes.findIndex((c) => c.id === id);
    if (idx === -1) return Promise.reject(new Error('Cliente no encontrado'));
    const actualizado = { ...clientes[idx], ...data };
    const anteriores = [...clientes];
    anteriores[idx] = actualizado;
    _set({ clientes: anteriores });

    const pendingKey = `cliente:${id}`;
    _get()._addPending(pendingKey);
    return customersApi
      .update(id, data)
      .then((actualizadoSrv) => {
        _get()._removePending(pendingKey);
        _set({ clientes: _get().clientes.map((c) => (c.id === id ? actualizadoSrv : c)) });
        return actualizadoSrv;
      })
      .catch((err) => {
        _get()._removePending(pendingKey);
        _set({ clientes: _get().clientes.map((c) => (c.id === id ? clientes[idx] : c)) });
        // Notificaci�n manejada por backend
        throw err;
      });
  },

  deleteCliente: (id) => {
    _set({ clientes: _get().clientes.filter((c) => c.id !== id) });
    return Promise.resolve();
  },

  /* ── Proveedores (pendiente backend: Fase 3 stock) ── */
  createProveedor: (data) => {
    const proveedores = _get().proveedores;
    const nuevo: Proveedor = { ...data, id: nextProveedorId(proveedores), pedidosRealizados: 0 };
    const nuevos = [...proveedores, nuevo];
    _proveedores = nuevos;
    saveToStorage(STORAGE_KEYS.proveedores, nuevos);
    _set({ proveedores: nuevos });
    return nuevo;
  },

  updateProveedor: (id, data) => {
    const proveedores = _get().proveedores;
    const idx = proveedores.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Proveedor no encontrado');
    const actualizado = { ...proveedores[idx], ...data };
    const nuevos = [...proveedores];
    nuevos[idx] = actualizado;
    _proveedores = nuevos;
    saveToStorage(STORAGE_KEYS.proveedores, nuevos);
    _set({ proveedores: nuevos });
    return actualizado;
  },

  deleteProveedor: (id) => {
    const proveedores = _get().proveedores.filter((p) => p.id !== id);
    _proveedores = proveedores;
    saveToStorage(STORAGE_KEYS.proveedores, proveedores);
    _set({ proveedores });
  },

  /* ── Pedidos (backend: /orders) ── */
  createPedido: (data) => {
    const pedidos = _get().pedidos;
    const numero = `TEMP-${Date.now()}`;
    const optimista: Pedido = { ...data, id: numero };
    _set({ pedidos: [optimista, ...pedidos] });

    const pendingKey = `pedido:${numero}`;
    _get()._addPending(pendingKey);

    const cliente = _get().clientes.find((c) => c.nombre === data.cliente);
    if (cliente && !cliente.id.startsWith('tmp-')) {
      const itemsCount = data.items || 1;
      return ordersApi
        .create({
          clienteId: cliente.id,
          itemsList: data.itemsList && data.itemsList.length > 0
            ? data.itemsList
            : [{ nombre: 'Solicitud personalizada', precio: Math.round(parseTotal(data.total) / itemsCount), cantidad: itemsCount }],
          prioridad: data.prioridad,
          observaciones: data.observaciones,
        })
        .then(({ pedido, id }) => {
          _get()._removePending(pendingKey);
          _orderIdByNumero[pedido.id] = id;
          _set({ pedidos: _get().pedidos.map((p) => (p.id === numero ? pedido : p)) });
          return pedido;
        })
        .catch((err) => {
          _get()._removePending(pendingKey);
          _set({ pedidos: _get().pedidos.filter((p) => p.id !== numero) });
          // Notificaci�n manejada por backend
          throw err;
        });
    } else {
      _get()._removePending(pendingKey);
      _set({ pedidos: _get().pedidos.filter((p) => p.id !== numero) });
      const noCreado = new Error('El cliente no está sincronizado con el servidor; el pedido no se creó');
      // Notificaci�n manejada por backend
      return Promise.reject(noCreado);
    }
  },

  updatePedido: (id, data) => {
    const pedidos = _get().pedidos;
    const idx = pedidos.findIndex((p) => p.id === id);
    if (idx === -1) return Promise.reject(new Error('Pedido no encontrado'));
    const actualizado = { ...pedidos[idx], ...data };
    const anteriores = [...pedidos];
    anteriores[idx] = actualizado;
    _set({ pedidos: anteriores });

    const cuid = _orderIdByNumero[id];
    if (data.estado && cuid) {
      const pendingKey = `pedido:${id}`;
      _get()._addPending(pendingKey);
      return ordersApi
        .updateStatus(cuid, data.estado)
        .then((pedidoSrv) => {
          _get()._removePending(pendingKey);
          _set({ pedidos: _get().pedidos.map((p) => (p.id === id ? pedidoSrv : p)) });
          return pedidoSrv;
        })
        .catch((err) => {
          _get()._removePending(pendingKey);
          _set({ pedidos: _get().pedidos.map((p) => (p.id === id ? pedidos[idx] : p)) });
          // Notificaci�n manejada por backend
          throw err;
        });
    }
    return Promise.resolve(actualizado);
  },

  deletePedido: (id) => {
    _set({ pedidos: _get().pedidos.filter((p) => p.id !== id) });
    return Promise.resolve();
  },

  /* ── Producción (pendiente backend: Fase 3) ── */
  createOrden: (data) => {
    const ordenes = _get().produccion;
    const nueva: OrdenProduccion = { ...data, id: nextOpId(ordenes) };
    const nuevas = [nueva, ...ordenes];
    _produccion = nuevas;
    saveToStorage(STORAGE_KEYS.produccion, nuevas);
    _set({ produccion: nuevas });
    return nueva;
  },

  updateOrden: (id, data) => {
    const ordenes = _get().produccion;
    const idx = ordenes.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Orden no encontrada');
    const actualizada = { ...ordenes[idx], ...data };
    const nuevas = [...ordenes];
    nuevas[idx] = actualizada;
    _produccion = nuevas;
    saveToStorage(STORAGE_KEYS.produccion, nuevas);
    _set({ produccion: nuevas });
    return actualizada;
  },

  deleteOrden: (id) => {
    const ordenes = _get().produccion.filter((o) => o.id !== id);
    _produccion = ordenes;
    saveToStorage(STORAGE_KEYS.produccion, ordenes);
    _set({ produccion: ordenes });
  },

  /* ── Inventario (pendiente backend: Fase 3) ── */
  addMovimiento: (mov) => {
    const movs = _get().inventario;
    const nuevo: MovimientoInventario = {
      ...mov,
      id: `MOV-${String(movs.length + 1).padStart(4, '0')}`,
      fecha: new Date().toISOString(),
    };
    const nuevos = [...movs, nuevo];
    _inventario = nuevos;
    saveToStorage(STORAGE_KEYS.inventario, nuevos);
    _set({ inventario: nuevos });
    return nuevo;
  },

  getMovimientosPorProducto: (ref) => _get().inventario.filter((m) => m.productoRef === ref),

  getMetricas: () => {
    const { productos, pedidos, clientes } = _get();
    const ingresos = pedidos
      .filter((p) => p.estado === 'Entregado')
      .reduce((sum, p) => sum + parseTotal(p.total), 0);

    return {
      totalVentas: pedidos.filter((p) => p.estado === 'Entregado').length,
      totalPedidos: pedidos.length,
      totalClientes: clientes.length,
      totalProductos: productos.length,
      stockBajo: productos.filter((p) => p.stock === 'Bajo stock').length,
      productosAgotados: productos.filter((p) => p.stock === 'Agotado').length,
      ingresosTotales: ingresos,
    };
  },
}));

/* ──────────────────────────────────────────────
   REACT HOOKS — suscripción automática
   ────────────────────────────────────────────── */
export function useProductos() {
  const productos = useAppStore((s) => s.productos);
  return {
    productos,
    createProducto: useAppStore((s) => s.createProducto),
    updateProducto: useAppStore((s) => s.updateProducto),
    deleteProducto: useAppStore((s) => s.deleteProducto),
    publishProducto: useAppStore((s) => s.publishProducto),
    unpublishProducto: useAppStore((s) => s.unpublishProducto),
    getCatalogProducts: useAppStore((s) => s.getCatalogProducts),
    hasPendingOperations: useAppStore((s) => s.hasPendingOperations),
  };
}

export function useClientes() {
  const clientes = useAppStore((s) => s.clientes);
  return {
    clientes,
    createCliente: useAppStore((s) => s.createCliente),
    updateCliente: useAppStore((s) => s.updateCliente),
    deleteCliente: useAppStore((s) => s.deleteCliente),
    hasPendingOperations: useAppStore((s) => s.hasPendingOperations),
  };
}

export function usePedidos() {
  const pedidos = useAppStore((s) => s.pedidos);
  return {
    pedidos,
    createPedido: useAppStore((s) => s.createPedido),
    updatePedido: useAppStore((s) => s.updatePedido),
    deletePedido: useAppStore((s) => s.deletePedido),
    hasPendingOperations: useAppStore((s) => s.hasPendingOperations),
  };
}

export function useProduccion() {
  const produccion = useAppStore((s) => s.produccion);
  return {
    ordenes: produccion,
    createOrden: useAppStore((s) => s.createOrden),
    updateOrden: useAppStore((s) => s.updateOrden),
    deleteOrden: useAppStore((s) => s.deleteOrden),
  };
}

export function useMetricas() {
  return useAppStore((s) => s.getMetricas());
}

export function useInventario() {
  const inventario = useAppStore((s) => s.inventario);
  return {
    movimientos: inventario,
    addMovimiento: useAppStore((s) => s.addMovimiento),
    getMovimientosPorProducto: useAppStore((s) => s.getMovimientosPorProducto),
  };
}

