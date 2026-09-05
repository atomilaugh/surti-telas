import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import s from './Produccion.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { productionApi, type ProductionOrder, type ProductionItem } from '@/infrastructure/api/productionApi';
import { authApi } from '@/infrastructure/api/authApi';
import { useProductionOrders } from '@/shared/hooks/useProductionOrders';
import { useLocation } from 'react-router-dom';
import { Package, Plus, Clock, AlertTriangle, X } from 'lucide-react';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

const COLOR_ALIASES: Record<string, string> = {
  rojo: '#EF4444',
  azul: '#3B82F6',
  verde: '#22C55E',
  amarillo: '#EAB308',
  naranja: '#F97316',
  morado: '#A855F7',
  violeta: '#8B5CF6',
  rosa: '#EC4899',
  rosado: '#F472B6',
  negro: '#171717',
  blanco: '#FFFFFF',
  gris: '#9CA3AF',
  'gris oscuro': '#4B5563',
  'gris claro': '#D1D5DB',
  marron: '#92400E',
  café: '#78350F',
  beige: '#F5F5DC',
  crema: '#FFFDD0',
  dorado: '#D4AF37',
  plateado: '#C0C0C0',
  celeste: '#38BDF8',
  turquesa: '#14B8A6',
  fucsia: '#D946EF',
  magenta: '#D946EF',
  lila: '#C084FC',
  vino: '#722F37',
  bordó: '#9E2A2B',
  'azul marino': '#1E3A8A',
  'verde oliva': '#556B2F',
  'verde militar': '#4B5320',
};

function normalizeColorName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalizedName = normalizeColorName(trimmed);
  if (COLOR_ALIASES[normalizedName]) {
    return COLOR_ALIASES[normalizedName];
  }

  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return trimmed;
  }

  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgbMatch) {
    const r = Math.min(255, Number(rgbMatch[1]));
    const g = Math.min(255, Number(rgbMatch[2]));
    const b = Math.min(255, Number(rgbMatch[3]));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/);
  if (rgbaMatch) {
    const r = Math.min(255, Number(rgbaMatch[1]));
    const g = Math.min(255, Number(rgbaMatch[2]));
    const b = Math.min(255, Number(rgbaMatch[3]));
    const a = Math.min(1, Math.max(0, Number(rgbaMatch[4])));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const hslMatch = trimmed.match(/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/);
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]);
    const l = Number(hslMatch[3]);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  const hslaMatch = trimmed.match(/^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*,\s*(0|1|0?\.\d+)\s*\)$/);
  if (hslaMatch) {
    const h = Number(hslaMatch[1]);
    const s = Number(hslaMatch[2]);
    const l = Number(hslaMatch[3]);
    const a = Math.min(1, Math.max(0, Number(hslaMatch[4])));
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }

  try {
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', trimmed)) {
      return trimmed;
    }
  } catch {
    // ignore
  }

  return null;
}

function isLightColor(color: string): boolean {
  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const match = computed.match(/\d+/g);
  if (!match || match.length < 3) return false;

  const [, r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.85;
}

interface OrdenProduccion {
  id: string;
  pedido: string;
  operarioId: string;
  operarioNombre: string;
  tallerId?: string;
  tallerNombre?: string;
  referencia: string;
  cantidad: number;
  fechaInicio: string;
  fechaEstimada: string;
  avance: number;
  estado: 'Pendiente' | 'Asignada' | 'En produccion' | 'Completada';
  tela?: string;
  colores: string[];
  notasTecnicas?: string;
  items: ProductionItem[];
}

interface UsuarioOption {
  id: string;
  nombre: string;
}

interface TallerOption {
  id: string;
  nombre: string;
}

  const ESTADO_TO_UI: Record<string, OrdenProduccion['estado']> = {
    PENDIENTE: 'Pendiente',
    ASIGNADA: 'Asignada',
    EN_PROCESO: 'En produccion',
    TERMINADO: 'Completada',
  };
  const _ESTADO_TO_API: Record<string, string> = {
    Pendiente: 'PENDIENTE',
    Asignada: 'ASIGNADA',
    'En produccion': 'EN_PROCESO',
    Completada: 'TERMINADO',
  };

  function toOrden(o: ProductionOrder, operarios: UsuarioOption[] = [], talleres: TallerOption[] = []): OrdenProduccion {
    const operario = operarios.find(u => u.id === o.operarioId);
    const taller = talleres.find(t => t.id === o.tallerId);
    return {
      id: o.id,
      pedido: o.pedidoNumero ?? '',
      operarioId: o.operarioId ?? '',
      operarioNombre: operario?.nombre ?? (o.operario?.nombre ?? 'Sin asignar'),
      tallerId: o.tallerId,
      tallerNombre: taller?.nombre ?? o.taller?.nombre ?? 'Sin asignar',
      referencia: o.referencia,
      cantidad: o.cantidad,
      fechaInicio: o.fechaInicio,
      fechaEstimada: o.fechaEstimada,
      avance: o.avance,
      estado: ESTADO_TO_UI[o.estado] ?? 'Pendiente',
      tela: o.tela,
      colores: o.colores,
      notasTecnicas: o.notasTecnicas,
      items: o.items ?? [],
    };
  }

  function buildEmptyMatrix(sizes: readonly string[], colors: string[]): Record<string, Record<string, number>> {
    return sizes.reduce<Record<string, Record<string, number>>>((acc, size) => {
      acc[size] = colors.reduce<Record<string, number>>((row, color) => {
        row[color] = 0;
        return row;
      }, {});
      return acc;
    }, {});
  }

  function computeMatrixTotals(matrix: Record<string, Record<string, number>>) {
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const [size, row] of Object.entries(matrix)) {
      let rowSum = 0;
      for (const [color, value] of Object.entries(row)) {
        const qty = Number(value) || 0;
        rowSum += qty;
        colTotals[color] = (colTotals[color] || 0) + qty;
      }
      rowTotals[size] = rowSum;
      grandTotal += rowSum;
    }

    return { rowTotals, colTotals, grandTotal };
  }

  function buildCurvaTallas(matrix: Record<string, Record<string, number>>): Record<string, number> {
    const curva: Record<string, number> = {};
    for (const [size, row] of Object.entries(matrix)) {
      curva[size] = Object.values(row).reduce((sum, value) => sum + (Number(value) || 0), 0);
    }
    return curva;
  }

export const AdminProduccion: React.FC = () => {
  const { orders: rawOrders, loading, error, refetch } = useProductionOrders();
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenProduccion | null>(null);
  const [selectedItems, setSelectedItems] = useState<ProductionItem[]>([]);
  const [operarios, setOperarios] = useState<UsuarioOption[]>([]);
  const [talleres, setTalleres] = useState<TallerOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<OrdenProduccion | null>(null);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<ProductionItem | null>(null);
  const [createItems, setCreateItems] = useState<Partial<ProductionItem>[]>([]);
  const [createItemNombre, setCreateItemNombre] = useState('');
  const [createItemCantidad, setCreateItemCantidad] = useState(1);
  const [createItemUnidad, setCreateItemUnidad] = useState('');
  const [createItemPrecio, setCreateItemPrecio] = useState(0);
  const [createItemDescripcion, setCreateItemDescripcion] = useState('');
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>(() => buildEmptyMatrix(DEFAULT_SIZES, []));
  const [matrixColors, setMatrixColors] = useState<string[]>([]);
  const [matrixReferencia, setMatrixReferencia] = useState('');
  const [matrixFechaEstimada, setMatrixFechaEstimada] = useState('');
  const [matrixTela, setMatrixTela] = useState('');
  const [matrixNotas, setMatrixNotas] = useState('');
  const [newColor, setNewColor] = useState('');

  const itemsMapped = useMemo(() => rawOrders.map(o => toOrden(o, operarios, talleres)), [rawOrders, operarios, talleres]);

  const updateCell = useCallback((size: string, color: string, value: number) => {
    setMatrix(prev => ({
      ...prev,
      [size]: {
        ...prev[size],
        [color]: Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0),
      },
    }));
  }, []);

  const addColor = useCallback((color: string) => {
    const trimmed = color.trim();
    if (!trimmed) return;
    setMatrixColors(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setMatrix(m => buildEmptyMatrix(Object.keys(m) as string[], next));
      return next;
    });
    setNewColor('');
  }, []);

  const removeColor = useCallback((color: string) => {
    setMatrixColors(prev => {
      const next = prev.filter(c => c !== color);
      setMatrix(m => {
        const nextMatrix = { ...m };
        for (const size of Object.keys(nextMatrix)) {
          const row = { ...nextMatrix[size] };
          delete row[color];
          nextMatrix[size] = row;
        }
        return nextMatrix;
      });
      return next;
    });
  }, []);

  const matrixTotals = useMemo(() => computeMatrixTotals(matrix), [matrix]);

  const resetCreateForm = useCallback(() => {
    setMatrix(buildEmptyMatrix(DEFAULT_SIZES, []));
    setMatrixColors([]);
    setMatrixReferencia('');
    setMatrixFechaEstimada('');
    setMatrixTela('');
    setMatrixNotas('');
    setNewColor('');
    setCreateItems([]);
    setCreateItemNombre('');
    setCreateItemCantidad(1);
    setCreateItemUnidad('');
    setCreateItemPrecio(0);
    setCreateItemDescripcion('');
  }, []);

  const fetchOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [usersData, _workshopsData] = await Promise.all([
        authApi.listUsers(),
        productionApi.list().catch(() => []),
      ]);
      const users = (usersData as { data: Array<{ id: string; nombre: string; role: string }> }).data;
      const mappedOperarios: UsuarioOption[] = users
        .filter(u => u.role === 'ASESOR' || u.role === 'ADMIN' || u.role === 'PRODUCCION')
        .map(u => ({ id: u.id, nombre: u.nombre }));
      setOperarios(mappedOperarios);
      setTalleres([]);
    } catch {
      toast.error('No se pudieron cargar las opciones');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  const location = useLocation();
  useEffect(() => {
    void refetch();
  }, [location.pathname, refetch]);

  const filtered = useMemo(() => {
    return itemsMapped.filter(o =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.pedido.toLowerCase().includes(search.toLowerCase()) ||
      o.referencia.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, itemsMapped]);

  const closeModals = () => {
    setEditModalOpen(false);
    setCreateModalOpen(false);
    setSelectedOrden(null);
  };

  const handleCreateOrden = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const referencia = matrixReferencia.trim();
    const fechaEstimada = matrixFechaEstimada.trim();
    const tela = matrixTela.trim() || undefined;
    const notasTecnicas = matrixNotas.trim() || undefined;
    const curvaTallas = buildCurvaTallas(matrix);
    const colores = matrixColors;
    const cantidad = matrixTotals.grandTotal;

    if (!referencia) {
      toast.error('La referencia es obligatoria');
      return;
    }
    if (!fechaEstimada) {
      toast.error('La fecha estimada es obligatoria');
      return;
    }
    if (cantidad <= 0) {
      toast.error('Debes ingresar al menos una cantidad en la matriz');
      return;
    }
    if (colores.length === 0) {
      toast.error('Debes agregar al menos un color');
      return;
    }

    try {
      const created = await productionApi.create({
        referencia,
        cantidad,
        fechaEstimada,
        tela,
        colores,
        curvaTallas: Object.keys(curvaTallas).length > 0 ? curvaTallas : undefined,
        notasTecnicas,
      });
      if (createItems.length > 0) {
        await Promise.all(createItems.map(item =>
          productionApi.createItem(created.id, {
            nombre: item.nombre ?? '',
            cantidad: item.cantidad ?? 1,
            descripcion: item.descripcion,
            unidad: item.unidad,
            precioUnitario: item.precioUnitario,
          })
        ));
      }
      await refetch();
      toast.success('Orden de producción creada');
      setCreateModalOpen(false);
      resetCreateForm();
    } catch {
      toast.error('No fue posible crear la orden');
    }
  };

  const handleAddCreateItem = () => {
    if (!createItemNombre.trim()) {
      toast.error('El nombre del item es obligatorio');
      return;
    }
    if (createItemCantidad < 1) {
      toast.error('La cantidad debe ser al menos 1');
      return;
    }
    setCreateItems(prev => [...prev, {
      nombre: createItemNombre.trim(),
      cantidad: createItemCantidad,
      unidad: createItemUnidad.trim() || undefined,
      precioUnitario: createItemPrecio || undefined,
      descripcion: createItemDescripcion.trim() || undefined,
    }]);
    setCreateItemNombre('');
    setCreateItemCantidad(1);
    setCreateItemUnidad('');
    setCreateItemPrecio(0);
    setCreateItemDescripcion('');
  };

  const handleRemoveCreateItem = (index: number) => {
    setCreateItems(prev => prev.filter((_, i) => i !== index));
  };

  const _estadoToApi: Record<string, string> = {
    Pendiente: 'PENDIENTE',
    Asignada: 'ASIGNADA',
    'En produccion': 'EN_PROCESO',
    Completada: 'TERMINADO',
  };

  const handleSubmitOrden = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrden) return;
    const fd = new FormData(e.currentTarget);
    const operarioId = String(fd.get('operarioId') ?? '').trim();
    const estado = (String(fd.get('estado') ?? '') || selectedOrden.estado) as OrdenProduccion['estado'];
    try {
      await productionApi.update(selectedOrden.id, {
        operarioId: operarioId || undefined,
        estado: estado as OrdenProduccion['estado'],
      });
      await refetch();
      toast.success('Orden actualizada');
      closeModals();
    } catch {
      toast.error('No fue posible actualizar la orden');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await productionApi.remove(deleteConfirm.id);
      await refetch();
      toast.success('Orden eliminada');
    } catch {
      toast.error('No fue posible eliminar la orden');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleOpenItems = async (orden: OrdenProduccion) => {
    setSelectedOrden(orden);
    try {
      const data = await productionApi.listItems(orden.id);
      setSelectedItems(data);
      setItemsModalOpen(true);
    } catch {
      toast.error('No se pudieron cargar los items');
    }
  };

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrden) return;
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get('nombre') ?? '').trim();
    const cantidad = Number(fd.get('cantidad'));
    const descripcion = String(fd.get('descripcion') ?? '').trim() || undefined;
    const unidad = String(fd.get('unidad') ?? '').trim() || undefined;
    const precioUnitario = fd.get('precioUnitario') ? Number(fd.get('precioUnitario')) : undefined;
    try {
      const created = await productionApi.createItem(selectedOrden.id, {
        nombre,
        cantidad,
        descripcion,
        unidad,
        precioUnitario,
      });
      setSelectedItems(prev => [...prev, created]);
      toast.success('Item agregado');
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error('No fue posible agregar el item');
    }
  };

  const _handleUpdateItem = async (item: ProductionItem, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = String(fd.get('nombre') ?? '').trim();
    const cantidad = Number(fd.get('cantidad'));
    const descripcion = String(fd.get('descripcion') ?? '').trim() || undefined;
    const unidad = String(fd.get('unidad') ?? '').trim() || undefined;
    const precioUnitario = fd.get('precioUnitario') ? Number(fd.get('precioUnitario')) : undefined;
    try {
      const updated = await productionApi.updateItem(selectedOrden!.id, item.id, {
        nombre,
        cantidad,
        descripcion,
        unidad,
        precioUnitario,
      });
      setSelectedItems(prev => prev.map(it => it.id === item.id ? updated : it));
      toast.success('Item actualizado');
    } catch {
      toast.error('No fue posible actualizar el item');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemConfirm || !selectedOrden) return;
    try {
      await productionApi.removeItem(selectedOrden.id, deleteItemConfirm.id);
      setSelectedItems(prev => prev.filter(it => it.id !== deleteItemConfirm.id));
      toast.success('Item eliminado');
    } catch {
      toast.error('No fue posible eliminar el item');
    } finally {
      setDeleteItemConfirm(null);
    }
  };

  const columns: DataTableColumn<OrdenProduccion>[] = [
    { key: 'id', header: 'ID Orden', sortable: true },
    { key: 'pedido', header: 'Pedido', sortable: true },
    { key: 'referencia', header: 'Referencia', sortable: true },
    { key: 'cantidad', header: 'Cantidad', sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', sortable: true, render: (item) => (
      <Badge variant={item.estado === 'Completada' ? 'success' : item.estado === 'En produccion' || item.estado === 'Asignada' ? 'warning' : 'default'}>
        {item.estado}
      </Badge>
    )},
    { key: 'tallerNombre', header: 'Taller', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<OrdenProduccion> = {
    title: item => `Detalle: ${item.id}`,
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailSection}>
          <h3 className={s.detailSectionTitle}>Información general</h3>
          <div className={s.detailGrid}>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Referencia</span>
              <span className={s.emptyText}>{item.referencia}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Cantidad</span>
              <span className={s.emptyText}>{item.cantidad}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Operario</span>
              <span className={s.emptyText}>{item.operarioNombre}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Taller</span>
              <span className={s.emptyText}>{item.tallerNombre}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Fecha inicio</span>
              <span className={s.emptyText}>{item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : '-'}</span>
            </div>
            <div className={s.detailItem}>
              <span className={s.detailLabel}>Fecha estimada</span>
              <span className={s.emptyText}>{item.fechaEstimada ? new Date(item.fechaEstimada).toLocaleDateString() : '-'}</span>
            </div>
            <div className={s.detailItem} style={{ gridColumn: '1 / -1' }}>
              <span className={s.detailLabel}>Avance</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={s.progressBar} style={{ width: 200 }}>
                  <div className={s.progressFill} style={{ width: `${item.avance}%` }} />
                </div>
                <span className={s.emptyText}>{item.avance}%</span>
              </div>
            </div>
            <div className={s.detailItem} style={{ gridColumn: '1 / -1' }}>
              <span className={s.detailLabel}>Tela</span>
              <span className={s.emptyText}>{item.tela || '-'}</span>
            </div>
            <div className={s.detailItem} style={{ gridColumn: '1 / -1' }}>
              <span className={s.detailLabel}>Colores</span>
              <span className={s.emptyText}>{item.colores.join(', ') || '-'}</span>
            </div>
            <div className={s.detailItem} style={{ gridColumn: '1 / -1' }}>
              <span className={s.detailLabel}>Notas técnicas</span>
              <span className={s.emptyText}>{item.notasTecnicas || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const actions: DataTableAction<OrdenProduccion>[] = [
    { label: 'Editar', onClick: (item) => { setSelectedOrden(item); setEditModalOpen(true); } },
    { label: 'Items', onClick: (item) => { void handleOpenItems(item); } },
    { label: 'Eliminar', onClick: (item) => { setDeleteConfirm(item); }, danger: true },
  ];

  const pendientes = useMemo(() => itemsMapped.filter(i => i.estado === 'Pendiente').length, [itemsMapped]);
  const enProceso = useMemo(() => itemsMapped.filter(i => i.estado === 'En produccion' || i.estado === 'Asignada').length, [itemsMapped]);
  const completadas = useMemo(() => itemsMapped.filter(i => i.estado === 'Completada').length, [itemsMapped]);

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Producción</h1>
          <p className={s.pageSubtitle}>Órdenes de producción activas</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>Nueva Orden</Button>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <Package className={s.statIcon} />
          <div>
            <div className={s.statValue}>{itemsMapped.length}</div>
            <div className={s.statLabel}>Total órdenes</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardDanger}`}>
          <AlertTriangle className={s.statIconDanger} />
          <div>
            <div className={s.statValue}>{pendientes}</div>
            <div className={s.statLabel}>Pendientes</div>
          </div>
        </div>
        <div className={s.statCard}>
          <Clock className={s.statIcon} />
          <div>
            <div className={s.statValue}>{enProceso}</div>
            <div className={s.statLabel}>En proceso / Asignadas</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}>
          <Package className={s.statIconSuccess} />
          <div>
            <div className={s.statValue}>{completadas}</div>
            <div className={s.statLabel}>Completadas</div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <SearchInput
            placeholder="Buscar órdenes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => setSearch(value)}
            debounceMs={100}
            minChars={0}
          />
        </div>
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filtered}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}
          enableSorting={true}
          emptyMessage={loading ? 'Cargando órdenes...' : error ? error : 'No se encontraron órdenes'}
          toolbarLeft={null}
          maxVisibleColumns={5}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>

            {createModalOpen && (
        <Modal open={createModalOpen} onClose={() => { setCreateModalOpen(false); resetCreateForm(); }} title="Nueva orden de producción" description="Crea y organiza la producción en una sola vista" size="2xl" icon={<Package size={22} />} className={s.createModal}>
          <form className={f.form} onSubmit={handleCreateOrden}>
            <div className={s.createPanel}>
              <div className={s.createPanelHeader}>
                <div className={s.createPanelTitle}>Información general</div>
              </div>
              <div className={s.createPanelBody}>
                <div className={s.infoRow}>
                  <div className={f.field}>
                    <label className={f.label}>Referencia</label>
                    <input className={f.input} value={matrixReferencia} onChange={e => setMatrixReferencia(e.target.value)} placeholder="Ej: REF-001" required />
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Fecha estimada</label>
                    <input className={f.input} type="date" value={matrixFechaEstimada} onChange={e => setMatrixFechaEstimada(e.target.value)} required />
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Tela / material</label>
                    <input className={f.input} value={matrixTela} onChange={e => setMatrixTela(e.target.value)} placeholder="Ej: Algodón, Poliéster" />
                  </div>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Notas técnicas</label>
                  <textarea className={f.input} value={matrixNotas} onChange={e => setMatrixNotas(e.target.value)} rows={2} placeholder="Opcional" />
                </div>
              </div>
            </div>

            <div className={s.createPanel}>
              <div className={s.createPanelHeader}>
                <div>
                  <div className={s.createPanelTitle}>Distribución de producción</div>
                  <div className={s.createPanelSubtitle}>Define las cantidades por talla y color</div>
                </div>
                <div className={s.quantityCard}>
                  <div className={s.quantityCardLabel}>Cantidad total</div>
                  <div className={s.quantityCardValue}>{matrixTotals.grandTotal}</div>
                  <div className={s.quantityCardHint}>prendas</div>
                </div>
              </div>
              <div className={s.createPanelBody}>
                <div className={s.distributionRow}>
                  <div className={s.distributionField}>
                    <label className={f.label}>Tallas</label>
                    <div className={s.sizeChips}>
                      {DEFAULT_SIZES.map(size => (
                        <span key={size} className={s.sizeChip}>{size}</span>
                      ))}
                    </div>
                  </div>
                  <div className={s.distributionField}>
                    <label className={f.label}>Colores</label>
                    <div className={s.colorChips}>
                      {matrixColors.map(color => {
                        const resolved = resolveColor(color);
                        const dotStyle = resolved ? { background: resolved } : {};
                        const lightBorder = resolved && isLightColor(resolved) ? { boxShadow: '0 0 0 1px rgba(0,0,0,0.25)' } : {};
                        return (
                          <span key={color} className={s.colorChip}>
                            <span className={resolved ? s.colorDot : `${s.colorDot} ${s.colorDotInvalid}`} style={{ ...dotStyle, ...lightBorder }} />
                            {color}
                            <button type="button" onClick={() => removeColor(color)} className={s.colorRemoveBtn}>
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      <input
                        className={s.colorInput}
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        placeholder="Nuevo color"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addColor(newColor);
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => addColor(newColor)}>Agregar color</Button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <label className={f.label}>Matriz Talla × Color</label>
                  {matrixColors.length === 0 ? (
                    <div className={s.matrixEmptyState}>
                      <div>No hay colores agregados</div>
                      <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Agrega al menos un color para definir la distribución</div>
                    </div>
                  ) : (
                    <div className={s.matrixWrapper}>
                      <table className={s.matrixTable}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Talla</th>
                            {matrixColors.map(color => {
                              const resolved = resolveColor(color);
                              const dotStyle = resolved ? { background: resolved } : {};
                              const lightBorder = resolved && isLightColor(resolved) ? { boxShadow: '0 0 0 1px rgba(0,0,0,0.25)' } : {};
                              return (
                                <th key={color}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span className={resolved ? s.colorDot : `${s.colorDot} ${s.colorDotInvalid}`} style={{ ...dotStyle, ...lightBorder }} />
                                    {color}
                                  </span>
                                </th>
                              );
                            })}
                            <th style={{ textAlign: 'right' }}>Total talla</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEFAULT_SIZES.map(size => {
                            const row = matrix[size] || {};
                            const rowTotal = matrixTotals.rowTotals[size] || 0;
                            return (
                              <tr key={size}>
                                <td className={s.matrixSizeLabel}>{size}</td>
                                {matrixColors.map(color => (
                                  <td key={color}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className={s.matrixCellInput}
                                      value={row[color] ?? 0}
                                      onChange={e => updateCell(size, color, Number(e.target.value))}
                                    />
                                  </td>
                                ))}
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{rowTotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className={s.matrixTotalRow}>
                            <td>Total</td>
                            {matrixColors.map(color => (
                              <td key={color}>{matrixTotals.colTotals[color] || 0}</td>
                            ))}
                            <td style={{ textAlign: 'right' }}>{matrixTotals.grandTotal}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={s.createPanel}>
              <div className={s.createPanelHeader}>
                <div className={s.createPanelTitle}>Insumos / Materiales</div>
              </div>
              <div className={s.createPanelBody}>
                <div className={s.itemsForm}>
                  <div className={s.itemsFormRow}>
                    <div className={f.field}>
                      <label className={f.label}>Nombre del insumo</label>
                      <input className={f.input} value={createItemNombre} onChange={e => setCreateItemNombre(e.target.value)} placeholder="Ej: Tela, Hilo, Cremallera" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Cantidad</label>
                      <input className={f.input} type="number" min={1} value={createItemCantidad} onChange={e => setCreateItemCantidad(Number(e.target.value))} />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Unidad</label>
                      <input className={f.input} value={createItemUnidad} onChange={e => setCreateItemUnidad(e.target.value)} placeholder="Ej: metros, conos" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Precio unitario</label>
                      <input className={f.input} type="number" min={0} step="0.01" value={createItemPrecio} onChange={e => setCreateItemPrecio(Number(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={handleAddCreateItem}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Descripción</label>
                    <input className={f.input} value={createItemDescripcion} onChange={e => setCreateItemDescripcion(e.target.value)} placeholder="Descripción opcional del insumo" />
                  </div>
                </div>
                {createItems.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', marginTop: 12 }}>
                    No hay insumos agregados. Utiliza el formulario superior para agregar materiales.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: 12 }}>
                    <table className={s.itemsTable}>
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th>Cantidad</th>
                          <th>Unidad</th>
                          <th>Precio unitario</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {createItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.nombre}</td>
                            <td>{item.cantidad}</td>
                            <td>{item.unidad || '-'}</td>
                            <td>{item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : '-'}</td>
                            <td>{((item.precioUnitario ?? 0) * (item.cantidad ?? 0)).toFixed(2)}</td>
                            <td>
                              <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveCreateItem(idx)}>
                                <X size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className={s.createPanel}>
              <div className={s.createPanelHeader}>
                <div className={s.createPanelTitle}>Resumen de la orden</div>
              </div>
              <div className={s.createPanelBody}>
                <div className={s.summaryGrid}>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Total prendas</div>
                    <div className={s.summaryCardValue}>{matrixTotals.grandTotal}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Tallas</div>
                    <div className={s.summaryCardValue}>{DEFAULT_SIZES.length}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Colores</div>
                    <div className={s.summaryCardValue}>{matrixColors.length}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Insumos</div>
                    <div className={s.summaryCardValue}>{createItems.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={f.formActions}>
              <Button variant="secondary" type="button" onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>Cancelar</Button>
              <Button type="submit">Crear orden</Button>
            </div>
          </form>
        </Modal>
      )}{editModalOpen && selectedOrden && (
        <Modal open={editModalOpen} onClose={closeModals} title="Editar Orden de Producción" size="md">
          <form className={f.form} onSubmit={handleSubmitOrden}>
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Datos de la orden</h3>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Operario asignado</label>
                  <select className={f.select} name="operarioId" defaultValue={selectedOrden.operarioId} disabled={loadingOptions}>
                    <option value="">-- Seleccione un operario --</option>
                    {operarios.map(op => (
                      <option key={op.id} value={op.id}>{op.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Estado</label>
                  <select className={f.select} name="estado" defaultValue={selectedOrden.estado}>
                    <option>Pendiente</option>
                    <option>Asignada</option>
                    <option>En produccion</option>
                    <option>Completada</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={f.formActions}>
              <Button variant="secondary" type="button" onClick={closeModals}>Cancelar</Button>
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </Modal>
      )}

      {itemsModalOpen && selectedOrden && (
        <Modal open={itemsModalOpen} onClose={() => setItemsModalOpen(false)} title={`Items: ${selectedOrden.referencia}`} size="lg">
          <div className={s.itemsContainer}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.unidad || '-'}</td>
                    <td>{item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : '-'}</td>
                    <td>${((item.precioUnitario ?? 0) * item.cantidad).toFixed(2)}</td>
                    <td>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedOrden(prev => prev ? { ...prev, items: selectedItems.filter(i => i.id !== item.id) } : null); setSelectedItems(prev => prev.map(i => i.id === item.id ? { ...i, nombre: '', cantidad: 0 } : i)); }}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteItemConfirm(item)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
                {selectedItems.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>No hay items registrados</td></tr>
                )}
              </tbody>
            </table>
            <form className={f.form} onSubmit={handleCreateItem}>
              <h4 className={f.sectionTitle}>Agregar item</h4>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Nombre</label>
                  <input className={f.input} name="nombre" required />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Cantidad</label>
                  <input className={f.input} name="cantidad" type="number" min={1} required />
                </div>
              </div>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Unidad</label>
                  <input className={f.input} name="unidad" />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Precio unitario</label>
                  <input className={f.input} name="precioUnitario" type="number" min={0} step="0.01" />
                </div>
              </div>
              <div className={f.field}>
                <label className={f.label}>Descripción</label>
                <textarea className={f.input} name="descripcion" rows={2} />
              </div>
              <div className={f.formActions}>
                <Button variant="secondary" type="button" onClick={() => setItemsModalOpen(false)}>Cerrar</Button>
                <Button type="submit">Agregar item</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmationModal
          open
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Eliminar orden"
          description={`¿Seguro que deseas eliminar la orden ${deleteConfirm.id}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
        />
      )}

      {deleteItemConfirm && (
        <ConfirmationModal
          open
          onClose={() => setDeleteItemConfirm(null)}
          onConfirm={handleDeleteItem}
          title="Eliminar item"
          description={`¿Seguro que deseas eliminar el item "${deleteItemConfirm.nombre}"?`}
          confirmLabel="Eliminar"
          variant="danger"
        />
      )}
    </div>
  );
};
