import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import s from './Produccion.module.css';
import f from '@/styles/Form.module.css';
import tableStyles from '@/shared/ui/DataTable.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { TableActionsMenu, type TableAction } from '@/shared/ui/TableActionsMenu';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { productionApi, type ProductionOrder, type ProductionItem } from '@/infrastructure/api/productionApi';
import { usersApi } from '@/infrastructure/api/usersApi';
import { workshopsApi } from '@/infrastructure/api/workshopsApi';
import { useProductionOrders } from '@/shared/hooks/useProductionOrders';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Clock, AlertTriangle, X, MoreHorizontal, MapPin, Package } from 'lucide-react';

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
  capacidad?: number;
  ocupacion?: number;
}

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
      estado: o.estado,
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
  const [saving, _setSaving] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignOrder, setAssignOrder] = useState<OrdenProduccion | null>(null);
  const [assignSelectedTallerId, setAssignSelectedTallerId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [avanceModalOpen, setAvanceModalOpen] = useState(false);
  const [avanceOrder, setAvanceOrder] = useState<OrdenProduccion | null>(null);
  const [avanceValue, setAvanceValue] = useState(0);
  const [avanceLoading, setAvanceLoading] = useState(false);
  const [avanceError, setAvanceError] = useState<string | null>(null);
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
  const [createTallerId, setCreateTallerId] = useState('');
  const [editTallerId, setEditTallerId] = useState('');
  const [editMatrix, setEditMatrix] = useState<Record<string, Record<string, number>>>(() => buildEmptyMatrix(DEFAULT_SIZES, []));
  const [editMatrixColors, setEditMatrixColors] = useState<string[]>([]);
  const [editReferencia, setEditReferencia] = useState('');
  const [editFechaEstimada, setEditFechaEstimada] = useState('');
  const [editTela, setEditTela] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [editNewColor, setEditNewColor] = useState('');
  const [editItems, setEditItems] = useState<Partial<ProductionItem>[]>([]);
  const [editItemNombre, setEditItemNombre] = useState('');
  const [editItemCantidad, setEditItemCantidad] = useState(1);
  const [editItemUnidad, setEditItemUnidad] = useState('');
  const [editItemPrecio, setEditItemPrecio] = useState(0);
  const [editItemDescripcion, setEditItemDescripcion] = useState('');

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

  const updateEditCell = useCallback((size: string, color: string, value: number) => {
    setEditMatrix(prev => ({
      ...prev,
      [size]: {
        ...prev[size],
        [color]: Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0),
      },
    }));
  }, []);

  const addEditColor = useCallback((color: string) => {
    const trimmed = color.trim();
    if (!trimmed) return;
    setEditMatrixColors(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      setEditMatrix(m => buildEmptyMatrix(Object.keys(m) as string[], next));
      return next;
    });
    setEditNewColor('');
  }, []);

  const removeEditColor = useCallback((color: string) => {
    setEditMatrixColors(prev => {
      const next = prev.filter(c => c !== color);
      setEditMatrix(m => {
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

  const handleAddEditItem = () => {
    if (!editItemNombre.trim()) {
      toast.error('El nombre del item es obligatorio');
      return;
    }
    if (editItemCantidad < 1) {
      toast.error('La cantidad debe ser al menos 1');
      return;
    }
    setEditItems(prev => [...prev, {
      nombre: editItemNombre.trim(),
      cantidad: editItemCantidad,
      unidad: editItemUnidad.trim() || undefined,
      precioUnitario: editItemPrecio || undefined,
      descripcion: editItemDescripcion.trim() || undefined,
    }]);
    setEditItemNombre('');
    setEditItemCantidad(1);
    setEditItemUnidad('');
    setEditItemPrecio(0);
    setEditItemDescripcion('');
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const editMatrixTotals = useMemo(() => computeMatrixTotals(editMatrix), [editMatrix]);

  const resetEditForm = useCallback(() => {
    setEditTallerId('');
    setEditMatrix(buildEmptyMatrix(DEFAULT_SIZES, []));
    setEditMatrixColors([]);
    setEditReferencia('');
    setEditFechaEstimada('');
    setEditTela('');
    setEditNotas('');
    setEditNewColor('');
    setEditItems([]);
    setEditItemNombre('');
    setEditItemCantidad(1);
    setEditItemUnidad('');
    setEditItemPrecio(0);
    setEditItemDescripcion('');
  }, []);

  const openEditModal = useCallback(async (orden: OrdenProduccion) => {
    setSelectedOrden(orden);
    setEditTallerId(orden.tallerId ?? '');
    setEditReferencia(orden.referencia);
    setEditFechaEstimada(orden.fechaEstimada);
    setEditTela(orden.tela ?? '');
    setEditNotas(orden.notasTecnicas ?? '');
    setEditMatrixColors(orden.colores ?? []);
    setEditMatrix(buildEmptyMatrix(DEFAULT_SIZES, orden.colores ?? []));
    if (orden.items && orden.items.length > 0) {
      setEditItems(orden.items.map(item => ({ ...item })));
    } else {
      setEditItems([]);
    }
    setEditItemNombre('');
    setEditItemCantidad(1);
    setEditItemUnidad('');
    setEditItemPrecio(0);
    setEditItemDescripcion('');
    setEditModalOpen(true);
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
    setCreateTallerId('');
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
      const [usersData, _ordersData, workshopsData] = await Promise.all([
        usersApi.list(),
        productionApi.list().catch(() => []),
        workshopsApi.list().catch(() => []),
      ]);
      const users = usersData.map(u => ({ id: u.id, nombre: u.nombre, role: u.rol }));
      const mappedOperarios: UsuarioOption[] = users
        .filter(u => u.role === 'ASESOR' || u.role === 'ADMIN' || u.role === 'PRODUCCION')
        .map(u => ({ id: u.id, nombre: u.nombre }));
      setOperarios(mappedOperarios);
      const mappedTalleres: TallerOption[] = workshopsData.map(w => ({ id: w.id, nombre: w.nombre, capacidad: w.capacidad, ocupacion: w.ocupacion }));
      setTalleres(mappedTalleres);
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
    setAvanceModalOpen(false);
    setAvanceOrder(null);
    setAvanceError(null);
  };

  const openAvanceModal = (orden: OrdenProduccion) => {
    setAvanceOrder(orden);
    setAvanceValue(orden.avance);
    setAvanceError(null);
    setAvanceModalOpen(true);
  };

  const handleSaveAvance = async () => {
    if (!avanceOrder) return;
    const value = Number(avanceValue);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setAvanceError('El avance debe estar entre 0 y 100');
      return;
    }
    setAvanceLoading(true);
    setAvanceError(null);
    try {
      await productionApi.updateProgress(avanceOrder.id, value);
      await refetch();
      toast.success('Avance actualizado');
      setAvanceModalOpen(false);
      setAvanceOrder(null);
    } catch {
      setAvanceError('No se pudo actualizar el avance');
    } finally {
      setAvanceLoading(false);
    }
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
        tallerId: createTallerId || undefined,
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
        tallerId: editTallerId || undefined,
        referencia: editReferencia.trim() || undefined,
        fechaEstimada: editFechaEstimada.trim() || undefined,
        tela: editTela.trim() || undefined,
        colores: editMatrixColors,
        curvaTallas: buildCurvaTallas(editMatrix),
        notasTecnicas: editNotas.trim() || undefined,
        estado,
      });
      if (editItems.length > 0) {
        await Promise.all(editItems.map(item =>
          item.id
            ? productionApi.updateItem(selectedOrden.id, item.id, {
                nombre: item.nombre ?? '',
                cantidad: item.cantidad ?? 1,
                descripcion: item.descripcion,
                unidad: item.unidad,
                precioUnitario: item.precioUnitario,
              })
            : productionApi.createItem(selectedOrden.id, {
                nombre: item.nombre ?? '',
                cantidad: item.cantidad ?? 1,
                descripcion: item.descripcion,
                unidad: item.unidad,
                precioUnitario: item.precioUnitario,
              })
        ));
      }
      await refetch();
      toast.success('Orden actualizada');
      resetEditForm();
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

  const handleOpenAssignModal = (orden: OrdenProduccion) => {
    setAssignOrder(orden);
    setAssignSelectedTallerId(orden.tallerId ?? '');
    setAssignError(null);
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignOrder || !assignSelectedTallerId) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await productionApi.assignToWorkshop(assignOrder.id, assignSelectedTallerId);
      toast.success('Taller asignado correctamente');
      setAssignModalOpen(false);
      setAssignOrder(null);
      setAssignSelectedTallerId('');
      void refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible asignar el taller.';
      setAssignError(message);
    } finally {
      setAssignLoading(false);
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
    { key: 'id', header: 'ID Orden', sortable: true, width: '150px', render: (item) => (
      <span title={item.id} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{item.id}</span>
    )},
    { key: 'pedido', header: 'Pedido', sortable: true, width: '100px' },
    { key: 'referencia', header: 'Referencia', sortable: true, render: (item) => (
      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.referencia}</span>
    )},
    { key: 'cantidad', header: 'Cantidad', sortable: true, align: 'right', width: '80px' },
    { key: 'estado', header: 'Estado', sortable: true, width: '170px', render: (item) => {
      const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <StatusBadge status={estado} />;
      case 'Asignada':
        return <StatusBadge status={estado} />;
      case 'En produccion':
        return <StatusBadge status={estado} />;
      case 'Completada':
        return <StatusBadge status={estado} />;
      case 'Cancelada':
        return <StatusBadge status={estado} />;
      default:
        return <StatusBadge status={estado} />;
    }
      };
      return estadoBadge(item.estado);
    }},
    { key: 'tallerNombre', header: 'Taller', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<OrdenProduccion> = {
    title: item => `Detalle: ${item.id}`,
    render: (item) => (
      <div className={s.detailModalContent}>
        <div className={s.detailHero}>
          <div className={s.detailHeroMain}>
            <div className={s.detailHeroTitle}>{item.id}</div>
            <div className={s.detailHeroSubtitle}>{item.referencia}</div>
          </div>
          <div className={s.detailHeroMeta}>
            <StatusBadge status={item.estado} />
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Información general</div>
          <div className={s.detailTable}>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Pedido</span>
              <span className={s.detailValue}>{item.pedido || '—'}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Cantidad</span>
              <span className={s.detailValue}>{item.cantidad}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Operario</span>
              <span className={s.detailValue}>{item.operarioNombre}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Taller</span>
              <span className={s.detailValue}>{item.tallerNombre || '—'}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Fecha inicio</span>
              <span className={s.detailValue}>{item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : '—'}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Fecha estimada</span>
              <span className={s.detailValue}>{item.fechaEstimada ? new Date(item.fechaEstimada).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Distribución</div>
          <div className={s.detailTable}>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Avance</span>
              <span className={s.detailValue}>{item.avance}%</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Tela</span>
              <span className={s.detailValue}>{item.tela || '—'}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Colores</span>
              <span className={s.detailValue}>{item.colores.join(', ') || '—'}</span>
            </div>
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Notas</div>
          <div className={s.detailTable}>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Notas técnicas</span>
              <span className={s.detailValue}>{item.notasTecnicas || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const getActions = (item: OrdenProduccion): DataTableAction<OrdenProduccion>[] => [
    { label: 'Editar', onClick: (i: OrdenProduccion) => { void openEditModal(i); } },
    { label: 'Asignar producción', icon: <MapPin size={16} />, onClick: (i: OrdenProduccion) => { handleOpenAssignModal(i); } },
    ...(item.estado === 'En produccion' || item.estado === 'Asignada' ? [{ label: 'Actualizar avance', icon: <Clock size={16} />, onClick: (i: OrdenProduccion) => { void openAvanceModal(i); } }] : []),
    { label: 'Items', onClick: (i: OrdenProduccion) => { void handleOpenItems(i); } },
    { label: 'Eliminar', onClick: (i: OrdenProduccion) => { setDeleteConfirm(i); }, danger: true },
  ];

  const actionsCellRenderer = (item: OrdenProduccion, rowActions: { primaryAction?: TableAction; actions: TableAction[] }, _openDetail: (item: OrdenProduccion) => void) => {
    return (
      <TableActionsMenu
        align="right"
        trigger={
          <button
            type="button"
            className={tableStyles.actionButton}
            aria-label="Abrir menú de acciones"
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        }
        primaryAction={rowActions.primaryAction}
        actions={rowActions.actions}
      />
    );
  };

  const pendientes = useMemo(() => itemsMapped.filter(i => i.estado === 'Pendiente').length, [itemsMapped]);
  const enProceso = useMemo(() => itemsMapped.filter(i => i.estado === 'En produccion' || i.estado === 'Asignada').length, [itemsMapped]);
  const completadas = useMemo(() => itemsMapped.filter(i => i.estado === 'Completada').length, [itemsMapped]);

  return (
    <div className={s.pageRoot}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Producción</h1>
          <p className={s.pageSubtitle}>Órdenes de producción activas</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>Nueva Orden</Button>
        </div>
      </div>

      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={s.statCard}>
              <Package size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{itemsMapped.length}</div>
                <div className={s.statLabel}>Total órdenes</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <AlertTriangle size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{pendientes}</div>
                <div className={s.statLabel}>Pendientes</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <Clock size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{enProceso}</div>
                <div className={s.statLabel}>En proceso / Asignadas</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Seguimiento</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <Package size={20} className={s.statIconSuccess} />
              <div>
                <div className={s.statValue}>{completadas}</div>
                <div className={s.statLabel}>Completadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar órdenes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
      </div>

      <div className={s.tableCard}>
        {loading && (
          <div className={s.loadingRow}>Cargando órdenes...</div>
        )}
        {!loading && (
          <div className={s.tableScroll}>
            <DataTable
              data={filtered}
              columns={columns}
              detailPanel={detailPanel}
              actions={getActions}
              actionsCellRenderer={(item, rowActions, openDetail) => actionsCellRenderer(item, rowActions, openDetail)}
              enableColumnFilters={false}
              enableSorting={true}
              emptyMessage={loading ? 'Cargando órdenes...' : error ? error : 'No se encontraron órdenes'}
              toolbarLeft={null}
              maxVisibleColumns={6}
              enableExport={false}
              enableRowSelection={false}
              compact
            />
          </div>
        )}
      </div>

            {createModalOpen && (
        <div className={s.modalOverlay} onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Package size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Nueva orden de producción</div>
                  <div className={s.detailHeaderSubtitle}>Crea y organiza la producción en una sola vista</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!saving && (
                  <button type="button" className={s.detailClose} onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.detailContent}>
              <form id="createOrdenForm" className={f.form} onSubmit={handleCreateOrden}>
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
                    <label className={f.label}>Taller</label>
                    <select className={f.select} value={createTallerId} onChange={e => setCreateTallerId(e.target.value)} disabled={loadingOptions}>
                      <option value="">-- Seleccione un taller --</option>
                      {talleres.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={s.infoRow}>
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
             </form>
            </div>
          </div>
        </div>
      )}
      {editModalOpen && selectedOrden && (
        <div className={s.modalOverlay} onClick={() => { setEditModalOpen(false); resetEditForm(); }}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Package size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Editar orden de producción</div>
                  <div className={s.detailHeaderSubtitle}>Actualiza la información, taller, distribución e insumos</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!saving && (
                  <button type="button" className={s.detailClose} onClick={() => { setEditModalOpen(false); resetEditForm(); }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.detailContent}>
              <form id="editOrdenForm" className={f.form} onSubmit={handleSubmitOrden}>
                <div className={s.createPanel}>
              <div className={s.createPanelHeader}>
                <div className={s.createPanelTitle}>Información general</div>
              </div>
              <div className={s.createPanelBody}>
                <div className={s.infoRow}>
                  <div className={f.field}>
                    <label className={f.label}>Referencia</label>
                    <input className={f.input} value={editReferencia} onChange={e => setEditReferencia(e.target.value)} placeholder="Ej: REF-001" required />
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Fecha estimada</label>
                    <input className={f.input} type="date" value={editFechaEstimada} onChange={e => setEditFechaEstimada(e.target.value)} required />
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Taller</label>
                    <select className={f.select} value={editTallerId} onChange={e => setEditTallerId(e.target.value)} disabled={loadingOptions}>
                      <option value="">-- Seleccione un taller --</option>
                      {talleres.map(t => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Tela / material</label>
                  <input className={f.input} value={editTela} onChange={e => setEditTela(e.target.value)} placeholder="Ej: Algodón, Poliéster" />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Notas técnicas</label>
                  <textarea className={f.input} value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={2} placeholder="Opcional" />
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
                  <div className={s.quantityCardValue}>{editMatrixTotals.grandTotal}</div>
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
                      {editMatrixColors.map(color => {
                        const resolved = resolveColor(color);
                        const dotStyle = resolved ? { background: resolved } : {};
                        const lightBorder = resolved && isLightColor(resolved) ? { boxShadow: '0 0 0 1px rgba(0,0,0,0.25)' } : {};
                        return (
                          <span key={color} className={s.colorChip}>
                            <span className={resolved ? s.colorDot : `${s.colorDot} ${s.colorDotInvalid}`} style={{ ...dotStyle, ...lightBorder }} />
                            {color}
                            <button type="button" onClick={() => removeEditColor(color)} className={s.colorRemoveBtn}>
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      <input
                        className={s.colorInput}
                        value={editNewColor}
                        onChange={e => setEditNewColor(e.target.value)}
                        placeholder="Nuevo color"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addEditColor(editNewColor);
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => addEditColor(editNewColor)}>Agregar color</Button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <label className={f.label}>Matriz Talla × Color</label>
                  {editMatrixColors.length === 0 ? (
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
                            {editMatrixColors.map(color => {
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
                            const row = editMatrix[size] || {};
                            const rowTotal = editMatrixTotals.rowTotals[size] || 0;
                            return (
                              <tr key={size}>
                                <td className={s.matrixSizeLabel}>{size}</td>
                                {editMatrixColors.map(color => (
                                  <td key={color}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className={s.matrixCellInput}
                                      value={row[color] ?? 0}
                                      onChange={e => updateEditCell(size, color, Number(e.target.value))}
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
                            {editMatrixColors.map(color => (
                              <td key={color}>{editMatrixTotals.colTotals[color] || 0}</td>
                            ))}
                            <td style={{ textAlign: 'right' }}>{editMatrixTotals.grandTotal}</td>
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
                      <input className={f.input} value={editItemNombre} onChange={e => setEditItemNombre(e.target.value)} placeholder="Ej: Tela, Hilo, Cremallera" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Cantidad</label>
                      <input className={f.input} type="number" min={1} value={editItemCantidad} onChange={e => setEditItemCantidad(Number(e.target.value))} />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Unidad</label>
                      <input className={f.input} value={editItemUnidad} onChange={e => setEditItemUnidad(e.target.value)} placeholder="Ej: metros, conos" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Precio unitario</label>
                      <input className={f.input} type="number" min={0} step="0.01" value={editItemPrecio} onChange={e => setEditItemPrecio(Number(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={handleAddEditItem}>
                        Agregar
                      </Button>
                    </div>
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Descripción</label>
                    <input className={f.input} value={editItemDescripcion} onChange={e => setEditItemDescripcion(e.target.value)} placeholder="Descripción opcional del insumo" />
                  </div>
                </div>
                {editItems.length === 0 ? (
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
                        {editItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.nombre}</td>
                            <td>{item.cantidad}</td>
                            <td>{item.unidad || '-'}</td>
                            <td>{item.precioUnitario ? `$${item.precioUnitario.toFixed(2)}` : '-'}</td>
                            <td>{((item.precioUnitario ?? 0) * (item.cantidad ?? 0)).toFixed(2)}</td>
                            <td>
                              <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveEditItem(idx)}>
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
                    <div className={s.summaryCardValue}>{editMatrixTotals.grandTotal}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Tallas</div>
                    <div className={s.summaryCardValue}>{DEFAULT_SIZES.length}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Colores</div>
                    <div className={s.summaryCardValue}>{editMatrixColors.length}</div>
                  </div>
                  <div className={s.summaryCard}>
                    <div className={s.summaryCardLabel}>Insumos</div>
                    <div className={s.summaryCardValue}>{editItems.length}</div>
                  </div>
                </div>
              </div>
            </div>

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
             </form>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => { setEditModalOpen(false); resetEditForm(); }}>Cancelar</Button>
              <Button type="submit" form="editOrdenForm">Guardar cambios</Button>
              </div>
             </div>

             <div className={s.detailFooter}>
               <Button variant="secondary" type="button" onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>Cancelar</Button>
               <Button type="submit" form="createOrdenForm" loading={saving}>Crear orden</Button>
             </div>
           </div>
         </div>
       )}

      {itemsModalOpen && selectedOrden && (
        <div className={s.modalOverlay} onClick={() => setItemsModalOpen(false)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Package size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Items: {selectedOrden.referencia}</div>
                  <div className={s.detailHeaderSubtitle}>Gestiona los insumos y materiales de la orden</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                <button type="button" className={s.detailClose} onClick={() => setItemsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={s.detailContent}>
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
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => setItemsModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && assignOrder && (
        <div className={s.modalOverlay} onClick={() => setAssignModalOpen(false)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <MapPin size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Asignar producción</div>
                  <div className={s.detailHeaderSubtitle}>Selecciona el taller responsable de esta orden</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                <button type="button" className={s.detailClose} onClick={() => setAssignModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={s.detailContent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Referencia</div>
                    <div style={{ fontWeight: 600 }}>{assignOrder.referencia}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Cantidad</div>
                    <div style={{ fontWeight: 600 }}>{assignOrder.cantidad} prendas</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>Talleres disponibles</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {talleres
                      .filter(t => (typeof t.capacidad === 'number' ? t.capacidad : Number.MAX_SAFE_INTEGER) >= assignOrder.cantidad)
                      .map(taller => {
                        const selected = assignSelectedTallerId === taller.id;
                        return (
                          <button
                            key={taller.id}
                            type="button"
                            onClick={() => setAssignSelectedTallerId(taller.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                              background: selected ? 'var(--color-primary-muted)' : 'var(--color-bg-surface)',
                              color: 'var(--color-text-primary)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 140ms ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                                background: selected ? 'var(--color-primary)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                              </div>
                              <span style={{ fontWeight: selected ? 600 : 500 }}>{taller.nombre}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {typeof taller.capacidad === 'number' ? `Cap: ${taller.capacidad}` : 'Sin límite'}
                            </span>
                          </button>
                        );
                      })}
                    {talleres.filter(t => (typeof t.capacidad === 'number' ? t.capacidad : Number.MAX_SAFE_INTEGER) >= assignOrder.cantidad).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
                        No hay talleres con capacidad suficiente
                      </div>
                    )}
                  </div>
                  {assignError && (
                    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)', background: 'var(--color-danger-muted)', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                      {assignError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => setAssignModalOpen(false)} disabled={assignLoading}>Cancelar</Button>
              <Button onClick={handleAssignSubmit} disabled={!assignSelectedTallerId || assignLoading}>
                {assignLoading ? 'Asignando...' : 'Asignar producción'}
              </Button>
            </div>
          </div>
        </div>
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

      {avanceModalOpen && avanceOrder && (
        <div className={s.modalOverlay} onClick={() => setAvanceModalOpen(false)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Clock size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Actualizar avance</div>
                  <div className={s.detailHeaderSubtitle}>
                    Orden #{avanceOrder.referencia || avanceOrder.id}
                  </div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!avanceLoading && (
                  <button type="button" className={s.detailClose} onClick={() => { setAvanceModalOpen(false); setAvanceOrder(null); setAvanceError(null); }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className={s.detailContent}>
              <div className={s.form}>
                <div className={f.field}>
                  <label className={f.label}>Avance (%)</label>
                  <input
                    className={f.input}
                    type="number"
                    min={0}
                    max={100}
                    value={avanceValue}
                    onChange={(e) => setAvanceValue(Number(e.target.value))}
                  />
                </div>
                {avanceError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{avanceError}</div>
                )}
              </div>
            </div>
            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => { setAvanceModalOpen(false); setAvanceOrder(null); setAvanceError(null); }} disabled={avanceLoading}>Cancelar</Button>
              <Button onClick={handleSaveAvance} disabled={avanceLoading}>
                {avanceLoading ? 'Guardando...' : 'Actualizar avance'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
