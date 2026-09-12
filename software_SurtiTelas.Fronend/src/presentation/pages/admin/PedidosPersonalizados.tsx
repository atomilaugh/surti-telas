import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Eye, Edit3, FileText, CheckCircle, RefreshCcw, Trash2, User, Package, Paintbrush, Image, X, PlusCircle, Loader2, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/infrastructure/api/httpClient';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { CustomOrderStatusSelector } from '@/shared/ui/CustomOrderStatusSelector';
import { customOrdersApi, type CustomOrder, type CustomOrderEstado, type CreateCustomOrderInput, type NegotiationMessage, type ProposalData } from '@/infrastructure/api/customOrdersApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { useAuthStore } from '@/core/stores/authStore';
import { CustomOrderFormModal } from '@/presentation/components/CustomOrderFormModal';
import { CustomOrderSummary, type CustomOrderSummaryData } from '../cliente/quotation-steps/CustomOrderSummary';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clienteS from '../cliente/MisPedidosPersonalizados.module.css';
import s from './PedidosPersonalizados.module.css';

const PaymentProofImage: React.FC<{ src: string; onError?: () => void }> = ({ src, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (error) {
    return (
      <div className={s.paymentProofError}>
        <AlertCircle size={32} />
        <span>No se pudo cargar el comprobante.</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '300px' }}>
      {loading && (
        <div className={s.paymentProofLoading}>
          <Loader2 size={24} className="animate-spin" />
          <span style={{ marginLeft: '8px' }}>Cargando comprobante...</span>
        </div>
      )}
      <img
        src={src}
        alt="Comprobante de pago"
        className={s.paymentProofImage}
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
};

const CUSTOM_ORDER_STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  SOLICITUD_RECIBIDA: 'info',
  EN_REVISION: 'warning',
  COTIZADO: 'success',
  COTIZACION_ACEPTADA: 'success',
  COTIZACION_RECHAZADA: 'danger',
  PAGO_PENDIENTE: 'warning',
  PAGO_EN_VERIFICACION: 'info',
  PAGO_APROBADO: 'success',
  CONVERTIDO_A_PEDIDO: 'default',
  EN_PRODUCCION: 'info',
  COMPLETADO: 'success',
   CANCELADO: 'danger',
   VENCIDO: 'danger',
};

const toUbicacionArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.split(',').map((u) => u.trim()).filter(Boolean);
  return [];
};

// Esquema de validación (igual que en MisPedidosPersonalizados)
const customOrderItemSchema = z.object({
  id: z.string().optional(),
  productoId: z.string().optional(),
  productoNombre: z.string().optional(),
  descripcion: z.string().optional(),
  tipoPersonalizacion: z.string().optional(),
  especificaciones: z.string().optional(),
  cantidad: z.union([z.number(), z.string()]).optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  ubicacion: z.array(z.string()).optional(),
  distribucionTallas: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
  imagenesReferencia: z.array(z.string()).optional(),
  personalizaciones: z.array(
    z.object({
      tipo: z.string().optional(),
      tecnica: z.string().optional(),
      ubicacion: z.array(z.string()).optional(),
      descripcion: z.string().optional(),
      archivos: z.array(z.string()).optional(),
      variantes: z.array(
        z.object({
          talla: z.string().optional(),
          color: z.string().optional(),
          cantidad: z.union([z.number(), z.string()]).optional(),
        })
      ).optional(),
    })
  ).optional(),
});

const formSchema = z.object({
  clienteNombre: z.string().min(1, 'El nombre es obligatorio'),
  clienteEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  clienteTelefono: z.string().optional(),
  usoFinal: z.string().optional(),
  fechaEntregaDeseada: z.string().optional(),
  notasCliente: z.string().optional(),
  notasReferencia: z.string().optional(),
  direccionEntrega: z.string().optional(),
  items: z.array(customOrderItemSchema).min(1, 'Agrega al menos un item'),
}).superRefine((data, ctx) => {
  if (data.fechaEntregaDeseada && new Date(data.fechaEntregaDeseada) <= new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha de entrega debe ser futura',
      path: ['fechaEntregaDeseada'],
    });
  }
  for (const [idx, item] of data.items.entries()) {
    const distribucionTotal = Object.values(item.distribucionTallas || {}).reduce((acc: number, val: number | string | null | undefined) => acc + (Number(val) || 0), 0);
    if (distribucionTotal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La distribución de prendas del producto "${item.productoNombre || `#${idx + 1}`}" debe sumar más de 0.`,
        path: ['items', idx, 'distribucionTallas'],
      });
    }
  }
});

export type FormValues = z.infer<typeof formSchema> & {
  cantidadTotal?: number;
  tipoPrenda?: string;
  tecnicaPersonalizacion?: string;
  tallas?: string;
  coloresSolicitados?: string;
  archivos?: string[];
};

export interface Personalizacion {
  id?: string;
  tipo?: string;
  tecnica?: string;
  ubicacion?: string[];
  descripcion?: string;
  archivos?: string[];
  variantes?: Variante[];
}

export interface Variante {
  id?: string;
  talla?: string;
  color?: string;
  cantidad?: number | string;
}

const emptyForm: FormValues = {
  clienteNombre: '',
  clienteEmail: '',
  clienteTelefono: '',
  usoFinal: '',
  fechaEntregaDeseada: '',
  notasCliente: '',
  notasReferencia: '',
  direccionEntrega: '',
  items: [
    {
      id: 'empty-item-1',
      productoId: '',
      productoNombre: '',
      descripcion: '',
      tipoPersonalizacion: 'BORDADO_ESTAMPADO',
      especificaciones: '',
      cantidad: 0,
      talla: '',
      color: '',
      material: '',
      ubicacion: [],
      distribucionTallas: {},
      imagenesReferencia: [],
       personalizaciones: [],
     },
   ],
  cantidadTotal: 0,
  tipoPrenda: '',
  tecnicaPersonalizacion: '',
  tallas: '',
  coloresSolicitados: '',
  archivos: [],
};

type QuotationLine = {
  id: string;
  customOrderItemId?: string | null;
  tipo: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  observaciones?: string;
};

type QuotationProduct = {
  id: string;
  customOrderItemId: string;
  nombre: string;
  cantidad: number;
  talla?: string;
  color?: string;
  material?: string;
  conceptos: QuotationLine[];
  expanded: boolean;
};

export const AdminPedidosPersonalizados: React.FC = () => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailView, setDetailView] = useState<'detail' | 'quotation' | 'negotiation'>('detail');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [_, setCurrentProduct] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [wizardStep, setWizardStep] = useState(1);

  const { register: _register, handleSubmit: _handleSubmit, reset, setValue, watch: _watch, control, formState: { errors: _formErrors }, getValues: _getValues } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyForm,
    shouldUnregister: false,
  });

  const { fields: _itemFields, append: _appendItem, remove: _removeItem, replace: replaceItems } = useFieldArray({
    control,
    name: 'items',
    shouldUnregister: false,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);

  const [clientes, setClientes] = useState<{ id: string; nombre: string; email?: string; telefono?: string }[]>([]);
  const [productos, setProductos] = useState<{ id: string; nombre: string; tela?: string; colores?: string[]; tallas?: string[] }[]>([]);
  const [, setLoadingCatalog] = useState(false);

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [quotationProducts, setQuotationProducts] = useState<QuotationProduct[]>([]);
  const [quotationDiscount, setQuotationDiscount] = useState<number>(0);
  const [quotationTaxRate, setQuotationTaxRate] = useState<number>(0);
  const [quotationAdvanceRate, setQuotationAdvanceRate] = useState<number>(0);
  const [quotationNotes, setQuotationNotes] = useState<string>('');
  const [quotationDeliveryDays, setQuotationDeliveryDays] = useState<number>(0);
  const [quotationPaymentTerms, setQuotationPaymentTerms] = useState<string>('');
  const [quotationSaving, setQuotationSaving] = useState<boolean>(false);
  const [hasQuotationChanges, setHasQuotationChanges] = useState<boolean>(false);

  const [paymentConfirm, setPaymentConfirm] = useState<CustomOrder | null>(null);
  const [paymentProofLoading, setPaymentProofLoading] = useState<boolean>(false);
  const [paymentProofError, setPaymentProofError] = useState<string | null>(null);
  const [paymentProofBlobUrl, setPaymentProofBlobUrl] = useState<string | null>(null);
  const paymentProofBlobUrlRef = useRef<string>('');
  const [paymentProofViewer, setPaymentProofViewer] = useState<{ orderId: string; url: string } | null>(null);

  const [statusConfirm, setStatusConfirm] = useState<CustomOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CustomOrderEstado | null>(null);

  const [wizardData, _setWizardData] = useState<{
    tipoPrenda: string;
    tecnicaPersonalizacion: string;
    tallas: string;
    coloresSolicitados: string;
    usoFinal: string;
    distribucionTallas: Record<string, number>;
    distribucionColores: Record<string, number>;
    distribucionColoresList: string[];
  } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<CustomOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [negotiationProposalData, setNegotiationProposalData] = useState({
    subtotal: 0,
    total: 0,
    descuento: 0,
    impuestos: 0,
    condicionesPago: '',
    valorAnticipo: 0,
    saldo: 0,
    porcentajeAnticipo: 50,
    tiempoEstimadoDias: 7,
  });
  const [negotiationHistory, setNegotiationHistory] = useState<NegotiationMessage[]>([]);
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationSending, setNegotiationSending] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<string>('');
  const [filtroClienteId, setFiltroClienteId] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.estado === 'SOLICITUD_RECIBIDA' || o.estado === 'PENDIENTE').length;
  const quotedOrders = orders.filter(o => o.estado === 'COTIZADO' || o.estado === 'COTIZACION_ACEPTADA').length;
  const productionOrders = orders.filter(o => o.estado === 'EN_PRODUCCION').length;
  const pagoPendienteOrders = orders.filter(o => o.estado === 'PAGO_PENDIENTE').length;
  const valorTotal = orders.reduce((sum, o) => sum + (Number(o.cotizacion?.total) || 0), 0);
  const totalRecibido = orders.reduce((sum, o) => sum + (Number(o.anticipoPagado) || 0), 0);
  const saldoPendiente = valorTotal - totalRecibido;

  const currentUser = useAuthStore((state) => state.user);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customOrdersApi.list({ page, limit: pageSize, search: search || undefined });
      setOrders(result.items ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotalItems(result.totalRecords ?? 0);
    } catch {
      toast.error('Error al cargar pedidos personalizados');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingCatalog(true);
      try {
        const [clientesRes, productosRes] = await Promise.all([
          customersApi.list({ limit: 100 }),
          catalogApi.list({ limit: 100 }),
        ]);
        if (!cancelled) {
          setClientes((clientesRes.data ?? []).map(c => ({ id: c.id ?? '', nombre: c.nombre, email: c.email, telefono: c.tel ?? '' })));
          setProductos((productosRes.data ?? []).map(p => ({ id: p.id ?? '', nombre: p.nombre, tela: p.tela, colores: p.colores, tallas: p.tallas })));
        }
      } catch {
        if (!cancelled) {
          setClientes([]);
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => { cancelled = true };
  }, [formOpen]);

  useEffect(() => {
    if (paymentConfirm?.paymentProofUrl && paymentConfirm.id) {
      setPaymentProofLoading(true);
      setPaymentProofError(null);
      customOrdersApi.getPaymentProofBlobUrl(paymentConfirm.id)
        .then((url) => {
          setPaymentProofBlobUrl(url);
        })
        .catch((err) => {
          setPaymentProofError(err instanceof Error ? err.message : 'Error al cargar comprobante');
        })
        .finally(() => {
          setPaymentProofLoading(false);
        });
    } else {
      setPaymentProofBlobUrl(null);
      setPaymentProofError(null);
     }
     const blobUrl = paymentProofBlobUrlRef.current;
     return () => {
       if (blobUrl) {
         URL.revokeObjectURL(blobUrl);
       }
     };
   }, [paymentConfirm]);

  const openCreate = () => {
    setEditingId(null);
    reset({
      ...emptyForm,
      clienteNombre: '',
      clienteEmail: '',
      clienteTelefono: '',
    });
    setSelectedFiles([]);
    setFileUrls(prev => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
    setWizardStep(1);
    setActiveItemIndex(0);
    setFormOpen(true);
  };

  const openEdit = (order: CustomOrder) => {
    setEditingId(order.id);
    const nextItems = order.items.map((item, index) => ({
      id: item.id || `edit-item-${order.id}-${index}`,
      productoId: item.productoId ?? '',
      productoNombre: item.productoNombre || item.descripcion || '',
      descripcion: item.descripcion || '',
      tipoPersonalizacion: item.tipoPersonalizacion,
      especificaciones: item.especificaciones ?? '',
      cantidad: item.distribucionTallas
        ? Object.values(item.distribucionTallas).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0)
        : item.cantidad ?? 0,
      talla: item.talla ?? '',
      color: item.color ?? '',
      material: item.material ?? '',
      ubicacion: toUbicacionArray(item.ubicacion),
      distribucionTallas: item.distribucionTallas ?? {},
      imagenesReferencia: item.imagenesReferencia || [],
      personalizaciones: (item.personalizaciones || []).map((pers) => ({
        tipo: pers.tipo || '',
        tecnica: pers.tecnica ?? '',
        ubicacion: toUbicacionArray(pers.ubicacion),
        descripcion: pers.descripcion || '',
        archivos: pers.archivos || [],
        variantes: (pers.variantes || []).map((v) => ({
          talla: v.talla || '',
          color: v.color || '',
          cantidad: typeof v.cantidad === 'number' ? v.cantidad : Number(v.cantidad ?? 0),
        })),
      })),
    }));

    const payload = {
      clienteNombre: order.clienteNombre,
      clienteEmail: order.clienteEmail ?? '',
      clienteTelefono: order.clienteTelefono ?? '',
      usoFinal: order.usoFinal ?? '',
      fechaEntregaDeseada: order.fechaEntregaDeseada ? new Date(order.fechaEntregaDeseada).toISOString().slice(0, 10) : '',
      notasCliente: order.notasCliente ?? '',
      notasReferencia: order.notasReferencia ?? '',
      direccionEntrega: order.direccionEntrega ?? '',
      items: nextItems,
    };

    reset(payload, { keepDefaultValues: false });
    replaceItems(nextItems);

    nextItems.forEach((item, idx) => {
      setValue(`items.${idx}.distribucionTallas`, item.distribucionTallas || {});
      setValue(`items.${idx}.imagenesReferencia`, item.imagenesReferencia || []);
      setValue(`items.${idx}.ubicacion`, item.ubicacion || []);
      Object.entries(item.distribucionTallas || {}).forEach(([talla, cantidad]) => {
        setForm(prev => ({
          ...prev,
          items: prev.items.map((item, i) =>
            i === idx && item.distribucionTallas
              ? { ...item, distribucionTallas: { ...item.distribucionTallas, [talla]: cantidad } }
              : item
          ),
        }));
      });
      (item.personalizaciones || []).forEach((pers: { tipo: string; tecnica: string; ubicacion: string[]; descripcion: string; archivos?: string[]; variantes: { talla: string; color: string; cantidad: number }[] }, pIdx: number) => {
        setValue(`items.${idx}.personalizaciones.${pIdx}.tipo`, pers.tipo || 'ESTAMPADO');
        setValue(`items.${idx}.personalizaciones.${pIdx}.tecnica`, pers.tecnica || '');
        setValue(`items.${idx}.personalizaciones.${pIdx}.ubicacion`, pers.ubicacion || []);
        setValue(`items.${idx}.personalizaciones.${pIdx}.descripcion`, pers.descripcion || '');
        setValue(`items.${idx}.personalizaciones.${pIdx}.archivos`, pers.archivos || []);
        (pers.variantes || []).forEach((v: { talla: string; color: string; cantidad: number }, vIdx: number) => {
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.talla`, v.talla || '');
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.color`, v.color || '');
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.cantidad`, Number(v.cantidad) || 0);
        });
      });
    });

    setValue('direccionEntrega', order.direccionEntrega ?? '');
    setValue('usoFinal', order.usoFinal ?? '');

    setSelectedFiles([]);
    setFileUrls(prev => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
    setWizardStep(1);
    setActiveItemIndex(0);
    setFormOpen(true);
  };

  const agregarPersonalizacion = () => {
    const items = [...form.items];
    const current = items[activeItemIndex]?.personalizaciones || [];
    items[activeItemIndex] = {
      ...items[activeItemIndex],
      personalizaciones: [
        ...current,
        { tipo: 'ESTAMPADO', tecnica: '', ubicacion: [], descripcion: '', variantes: [] },
      ],
    };
    setForm({ ...form, items });
  };

  const eliminarPersonalizacion = (persIndex: number) => {
    const items = [...form.items];
    items[activeItemIndex] = {
      ...items[activeItemIndex],
      personalizaciones: (items[activeItemIndex]?.personalizaciones || []).filter((_, i) => i !== persIndex),
    };
    setForm({ ...form, items });
  };

  const actualizarPersonalizacion = (persIndex: number, field: string, value: unknown) => {
    const items = [...form.items];
    const pers = [...(items[activeItemIndex]?.personalizaciones || [])];
    pers[persIndex] = { ...pers[persIndex], [field]: value };
    items[activeItemIndex] = { ...items[activeItemIndex], personalizaciones: pers };
    setForm({ ...form, items });
  };

  const agregarVariante = (persIndex: number) => {
    const items = [...form.items];
    const pers = [...(items[activeItemIndex]?.personalizaciones || [])];
    pers[persIndex] = {
      ...pers[persIndex],
      variantes: [...(pers[persIndex]?.variantes || []), { talla: '', color: '', cantidad: 1 }],
    };
    items[activeItemIndex] = { ...items[activeItemIndex], personalizaciones: pers };
    setForm({ ...form, items });
  };

  const eliminarVariante = (persIndex: number, varIndex: number) => {
    const items = [...form.items];
    const pers = [...(items[activeItemIndex]?.personalizaciones || [])];
    pers[persIndex] = {
      ...pers[persIndex],
      variantes: (pers[persIndex]?.variantes || []).filter((_, i) => i !== varIndex),
    };
    items[activeItemIndex] = { ...items[activeItemIndex], personalizaciones: pers };
    setForm({ ...form, items });
  };

  const actualizarVariante = (persIndex: number, varIndex: number, field: string, value: unknown) => {
    const items = [...form.items];
    const pers = [...(items[activeItemIndex]?.personalizaciones || [])];
    const variantes = [...(pers[persIndex]?.variantes || [])];
    variantes[varIndex] = { ...variantes[varIndex], [field]: value };
    pers[persIndex] = { ...pers[persIndex], variantes };
    items[activeItemIndex] = { ...items[activeItemIndex], personalizaciones: pers };
    setForm({ ...form, items });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!(form.clienteNombre || '').trim()) next.clienteNombre = 'Selecciona un cliente';
    const _hasInvalidItem = form.items.some((item, idx) => {
      if (!(item.descripcion || '').trim()) next[`items.${idx}.descripcion`] = 'La descripción es obligatoria';
      if (!item.tipoPersonalizacion) next[`items.${idx}.tipoPersonalizacion`] = 'Selecciona el tipo de personalización';
      if (!item.cantidad || Number(item.cantidad) <= 0) next[`items.${idx}.cantidad`] = 'Ingresa una cantidad válida';
      (item.personalizaciones || []).forEach((pers, pIdx) => {
        if (!pers.tipo) next[`items.${idx}.personalizaciones.${pIdx}.tipo`] = 'Selecciona el tipo';
        if (!pers.descripcion?.trim()) next[`items.${idx}.personalizaciones.${pIdx}.descripcion`] = 'La descripción es obligatoria';
      });
      return false;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateQuotation = (): boolean => {
    const next: Record<string, string> = {};
    const allLines = quotationProducts.flatMap(product => product.conceptos);
    if (allLines.length === 0) {
      next.detalles = 'Agrega al menos un concepto';
    }
    allLines.forEach((line, idx) => {
      if (!line.descripcion?.trim()) next[`detalle-${idx}-descripcion`] = 'La descripción es obligatoria';
      if (!line.cantidad || Number(line.cantidad) <= 0) next[`detalle-${idx}-cantidad`] = 'Cantidad inválida';
      if (line.precioUnitario === undefined || line.precioUnitario === null || Number(line.precioUnitario) < 0) next[`detalle-${idx}-precio`] = 'Precio inválido';
    });
    if (!quotationDeliveryDays || Number(quotationDeliveryDays) <= 0) next.tiempoEstimadoDias = 'Tiempo estimado inválido';
    if (!quotationPaymentTerms?.trim()) next.condicionesPago = 'Condiciones de pago obligatorias';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    const touchedFields: Record<string, boolean> = { clienteNombre: true };
    form.items.forEach((_, idx) => {
      touchedFields[`items.${idx}.descripcion`] = true;
      touchedFields[`items.${idx}.tipoPersonalizacion`] = true;
      touchedFields[`items.${idx}.cantidad`] = true;
    });
    setTouched(touchedFields);
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        clienteNombre: form.clienteNombre,
        clienteEmail: form.clienteEmail || undefined,
        clienteTelefono: form.clienteTelefono || undefined,
        notasReferencia: form.notasReferencia || undefined,
        descripcionGeneral: form.items[0]?.descripcion || undefined,
         usoFinal: wizardData?.usoFinal || form.usoFinal || undefined,
        tipoPrenda: form.tipoPrenda || undefined,
        tecnicaPersonalizacion: form.tecnicaPersonalizacion || undefined,
        tallas: form.tallas ? form.tallas.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        coloresSolicitados: form.coloresSolicitados ? form.coloresSolicitados.split(',').map(c => c.trim()).filter(Boolean) : undefined,
        cantidadTotal: form.cantidadTotal || form.items[0]?.cantidad || 1,
        fechaEntregaDeseada: form.fechaEntregaDeseada || undefined,
        notasCliente: form.notasCliente || undefined,
        items: form.items.map((item, index) => ({
            descripcion: item.descripcion,
            tipoPersonalizacion: item.tipoPersonalizacion,
            especificaciones: item.especificaciones || undefined,
            cantidad: Number(item.cantidad),
            talla: item.talla || undefined,
            color: item.color || undefined,
            material: item.material || undefined,
            ubicacion: item.ubicacion || undefined,
            distribucionTallas: wizardData?.distribucionTallas || undefined,
            distribucionColores: wizardData?.distribucionColoresList ? wizardData.distribucionColoresList.reduce((acc, color, idx) => { if (color) acc[color] = wizardData?.distribucionColores?.[idx] || 0; return acc; }, {} as Record<string, number>) : undefined,
            orden: index,
            personalizaciones: (item.personalizaciones || [])
              .filter((pers) => !!pers.tipo && !!pers.descripcion?.trim())
              .map((pers, pIndex) => ({
                tipo: pers.tipo,
                tecnica: pers.tecnica || undefined,
                ubicacion: pers.ubicacion || undefined,
                descripcion: pers.descripcion,
                archivos: [],
                orden: pIndex,
                variantes: (pers.variantes || [])
                  .filter((v) => Number(v.cantidad) > 0)
                  .map((v) => ({
                    talla: v.talla,
                    color: v.color,
                    cantidad: Number(v.cantidad),
                  })),
              })),
          })),
      };

      if (editingId) {
        await customOrdersApi.update(editingId, payload as Partial<CreateCustomOrderInput>);
        toast.success('Pedido actualizado');
      } else {
        await customOrdersApi.create(payload as CreateCustomOrderInput);
        toast.success('Pedido creado');
      }
      setFormOpen(false);
      void loadOrders();
    } catch {
      toast.error('Error al guardar pedido');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setFileUrls(prev => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return files.map(f => URL.createObjectURL(f));
    });
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setFileUrls(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validateStep = (step: number): boolean => {
    const next: Record<string, string> = {};
    if (step === 1) {
      if (!(form.clienteNombre || '').trim()) next.clienteNombre = 'Selecciona un cliente';
    }
    if (step === 2) {
      const item = form.items[activeItemIndex];
      if (!(item?.descripcion || '').trim()) next[`items.${activeItemIndex}.descripcion`] = 'Selecciona un producto';
      if (!item?.cantidad || Number(item.cantidad) <= 0) next[`items.${activeItemIndex}.cantidad`] = 'Ingresa una cantidad válida';
      if (!item?.tipoPersonalizacion) next[`items.${activeItemIndex}.tipoPersonalizacion`] = 'Selecciona el tipo de personalización';
      if (wizardData?.distribucionTallas && Object.keys(wizardData.distribucionTallas).length > 0) {
        const suma = Object.values(wizardData.distribucionTallas).reduce((acc: number, val) => acc + Number(val || 0), 0);
        if (suma !== Number(item?.cantidad || 0)) {
          next['distribucionTallas'] = `La distribución de tallas (${suma}) no coincide con la cantidad total (${item?.cantidad || 0})`;
        }
      }
      if (wizardData?.distribucionColores && Object.keys(wizardData.distribucionColores).length > 0) {
        const suma = Object.values(wizardData.distribucionColores).reduce((acc: number, val) => acc + Number(val || 0), 0);
        if (suma !== Number(item?.cantidad || 0)) {
          next['distribucionColores'] = `La distribución de colores (${suma}) no coincide con la cantidad total (${item?.cantidad || 0})`;
        }
      }
    }
    setErrors(next);
    const touchedFields: Record<string, boolean> = { clienteNombre: true };
    form.items.forEach((_, idx) => {
      touchedFields[`items.${idx}.descripcion`] = true;
      touchedFields[`items.${idx}.tipoPersonalizacion`] = true;
      touchedFields[`items.${idx}.cantidad`] = true;
    });
    setTouched(touchedFields);
    return Object.keys(next).length === 0;
  };

   const handleChangeStatus = async () => {
     if (!statusConfirm || !selectedStatus) return;
     try {
       await customOrdersApi.updateStatus(statusConfirm.id, selectedStatus);
       await loadOrders();
       toast.success(`Solicitud ${statusConfirm.numeroSolicitud} actualizada a ${getStatusLabel(selectedStatus)}`);
       setStatusConfirm(null);
       setSelectedStatus(null);
     } catch {
       toast.error('No se pudo actualizar el estado');
     }
   };

    const handleDelete = async () => {
      if (!deleteConfirm) return;
      setDeleting(true);
      try {
        await customOrdersApi.remove(deleteConfirm.id);
        toast.success(`Solicitud ${deleteConfirm.numeroSolicitud} eliminada`);
        setDeleteConfirm(null);
        if (selectedOrder?.id === deleteConfirm.id) {
          setDetailOpen(false);
          setSelectedOrder(null);
          setDetailView('detail');
        }
        void loadOrders();
      } catch {
        toast.error('Error al eliminar');
      } finally {
        setDeleting(false);
      }
    };

    const openNegotiation = () => {
      if (!selectedOrder?.cotizacion) return;
      const cot = selectedOrder.cotizacion;
      setNegotiationProposalData({
        subtotal: Number(cot.subtotal) || 0,
        total: Number(cot.total) || 0,
        descuento: Number(cot.descuento) || 0,
        impuestos: Number(cot.impuestos) || 0,
        condicionesPago: cot.condicionesPago || '',
        valorAnticipo: Number(cot.valorAnticipo) || 0,
        saldo: Number(cot.saldo) || 0,
        porcentajeAnticipo: cot.porcentajeAnticipo ?? 50,
        tiempoEstimadoDias: cot.tiempoEstimadoDias ?? 7,
      });
      setNegotiationMessage('');
      setDetailView('negotiation');
      loadNegotiationHistory();
    };

    const closeNegotiation = () => {
      setDetailView('detail');
      setNegotiationMessage('');
    };

   const loadNegotiationHistory = async () => {
     if (!selectedOrder) return;
     setNegotiationLoading(true);
     try {
       const history = await customOrdersApi.getNegotiationHistory(selectedOrder.id);
       setNegotiationHistory(history);
     } catch {
       // silent
     } finally {
       setNegotiationLoading(false);
     }
   };

    const handleStartNegotiation = async () => {
      if (!selectedOrder || !negotiationMessage.trim()) {
        toast.error('Ingresa un mensaje para la negociación');
        return;
      }
      const counts = getAdminNegotiationCounts();
      if (counts.adminRemaining <= 0) {
        toast.error('Has alcanzado el límite de negociaciones (3)');
        return;
      }
      setNegotiationSending(true);
      try {
        const proposal = {
          subtotal: Number(negotiationProposalData.subtotal),
          total: Number(negotiationProposalData.total),
          descuento: Number(negotiationProposalData.descuento),
          impuestos: Number(negotiationProposalData.impuestos),
          condicionesPago: negotiationProposalData.condicionesPago,
          valorAnticipo: Number(negotiationProposalData.valorAnticipo),
          saldo: Number(negotiationProposalData.saldo),
          porcentajeAnticipo: Number(negotiationProposalData.porcentajeAnticipo),
          tiempoEstimadoDias: Number(negotiationProposalData.tiempoEstimadoDias),
        };
        const updatedOrder = await customOrdersApi.startNegotiation(selectedOrder.id, negotiationMessage.trim(), proposal);
        toast.success('Propuesta enviada');
        setSelectedOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        setDetailView('detail');
        setNegotiationMessage('');
        await loadNegotiationHistory();
      } catch {
        toast.error('Error al enviar propuesta de negociación');
      } finally {
        setNegotiationSending(false);
      }
    };

    const _handleRespondToNegotiation = async (negotiationId: string, message: string, proposalData?: ProposalData) => {
      if (!selectedOrder) return;
      setNegotiationSending(true);
      try {
        await customOrdersApi.respondToNegotiation(selectedOrder.id, message, proposalData, negotiationId);
        toast.success('Respuesta enviada');
        setNegotiationMessage('');
        await loadNegotiationHistory();
        await loadOrders();
      } catch {
        toast.error('Error al responder negociación');
      } finally {
        setNegotiationSending(false);
      }
    };

    const _handleAcceptProposal = async (negotiationId: string) => {
      if (!selectedOrder) return;
      try {
        await customOrdersApi.acceptNegotiationProposal(selectedOrder.id, negotiationId);
        toast.success('Propuesta aceptada');
        await loadNegotiationHistory();
        await loadOrders();
      } catch {
        toast.error('Error al aceptar propuesta');
      }
    };

    const _handleRejectProposal = async (negotiationId: string, reason?: string) => {
      if (!selectedOrder) return;
      try {
        await customOrdersApi.rejectNegotiationProposal(selectedOrder.id, negotiationId, reason);
        toast.success('Propuesta rechazada');
        await loadNegotiationHistory();
        await loadOrders();
      } catch {
       toast.error('Error al rechazar propuesta');
     }
   };

   const getAdminNegotiationCounts = () => {
     const adminRounds = negotiationHistory.filter(m => m.authorRole === 'admin' || m.authorRole === 'asesor').length;
     const clientRounds = negotiationHistory.filter(m => m.authorRole === 'cliente').length;
     return { adminRounds, clientRounds, adminRemaining: 3 - adminRounds, clientRemaining: 3 - clientRounds };
   };

  const openQuotationEditor = (order: CustomOrder) => {
    const detallesConProducto = (order.cotizacion?.detalles ?? []).filter(d => d.customOrderItemId);

    const products: QuotationProduct[] = [];

    if (order.items.length > 0) {
      order.items.forEach((item) => {
        const productLines: QuotationLine[] = [];

        if (detallesConProducto.length > 0) {
          const itemDetalles = detallesConProducto.filter(d => d.customOrderItemId === item.id);
          if (itemDetalles.length > 0) {
            itemDetalles.forEach((d) => {
              productLines.push({
                id: d.id,
                customOrderItemId: d.customOrderItemId,
                tipo: d.tipo,
                descripcion: d.descripcion,
                cantidad: d.cantidad,
                unidadMedida: d.unidadMedida ?? 'unidad',
                precioUnitario: Number(d.precioUnitario),
                observaciones: d.observaciones ?? '',
              });
            });
          }
        }

        if (productLines.length === 0) {
          productLines.push({
            id: `line-${Date.now()}-${item.id}-producto`,
            customOrderItemId: item.id,
            tipo: 'PRODUCTO_BASE',
            descripcion: item.productoNombre || item.descripcion || 'Producto',
            cantidad: Number(item.cantidad) || 1,
            unidadMedida: 'unidad',
            precioUnitario: 0,
            observaciones: '',
          });
          productLines.push({
            id: `line-${Date.now()}-${item.id}-personalizacion`,
            customOrderItemId: item.id,
            tipo: 'MANO_OBRA',
            descripcion: (item.tipoPersonalizacion || 'Personalización').replace(/_/g, ' '),
            cantidad: Number(item.cantidad) || 1,
            unidadMedida: 'unidad',
            precioUnitario: 0,
            observaciones: Array.isArray(item.ubicacion) ? item.ubicacion.join(', ') : (item.ubicacion ?? ''),
          });
        }

        products.push({
          id: `product-${item.id}`,
          customOrderItemId: item.id,
          nombre: item.productoNombre || item.descripcion || 'Producto',
          cantidad: Number(item.cantidad) || 1,
          talla: item.talla ?? undefined,
          color: item.color ?? undefined,
          material: item.material ?? undefined,
          conceptos: productLines,
          expanded: true,
        });
      });

      const detallesSinProducto = (order.cotizacion?.detalles ?? []).filter(d => !d.customOrderItemId);
      if (detallesSinProducto.length > 0 && products.length > 0) {
        detallesSinProducto.forEach((d) => {
          products[0].conceptos.push({
            id: d.id,
            customOrderItemId: products[0].customOrderItemId,
            tipo: d.tipo,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            unidadMedida: d.unidadMedida ?? 'unidad',
            precioUnitario: Number(d.precioUnitario),
            observaciones: d.observaciones ?? '',
          });
        });
      }
    } else {
      const existingLines: QuotationLine[] = (order.cotizacion?.detalles ?? []).map((d) => ({
        id: d.id,
        customOrderItemId: d.customOrderItemId,
        tipo: d.tipo,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        unidadMedida: d.unidadMedida ?? 'unidad',
        precioUnitario: Number(d.precioUnitario),
        observaciones: d.observaciones ?? '',
      }));

      products.push({
        id: 'product-0',
        customOrderItemId: '',
        nombre: 'Producto personalizado',
        cantidad: 1,
        conceptos: existingLines.length > 0 ? existingLines : [{
          id: `line-${Date.now()}`,
          customOrderItemId: null,
          tipo: 'PRODUCTO_BASE',
          descripcion: 'Producto personalizado',
          cantidad: 1,
          unidadMedida: 'unidad',
          precioUnitario: 0,
          observaciones: '',
        }],
        expanded: true,
      });
    }

    setQuotationProducts(products);
    setQuotationDiscount(order.cotizacion?.descuento ? Number(order.cotizacion.descuento) : 0);
    setQuotationTaxRate(19);
    setQuotationAdvanceRate(50);
    setQuotationNotes(order.cotizacion?.observaciones ?? '');
    setQuotationDeliveryDays(order.cotizacion?.tiempoEstimadoDias ?? 7);
    setQuotationPaymentTerms(order.cotizacion?.condicionesPago ?? '50% anticipo, 50% contra entrega');
    setQuotationSaving(false);
    setHasQuotationChanges(false);
    setNegotiationHistory([]);
    setNegotiationMessage('');
    setSelectedOrder(order);
    setDetailOpen(true);
    setDetailView('quotation');
    if (order.cotizacion?.estado === 'RECHAZADA') {
      loadNegotiationHistory();
    } else if (order.estado === 'SOLICITUD_RECIBIDA') {
      void customOrdersApi.submit(order.id).catch(() => {});
    }
  };

  const handleCloseDetail = () => {
    if (detailView === 'quotation' && hasQuotationChanges) {
      if (!window.confirm('Hay cambios sin guardar. áDeseas salir sin guardar?')) {
        return;
      }
    }
    setDetailOpen(false);
    setDetailView('detail');
    setHasQuotationChanges(false);
  };

  const handleBackFromQuotation = () => {
    if (hasQuotationChanges) {
      if (!window.confirm('Hay cambios sin guardar. áDeseas volver sin guardar?')) {
        return;
      }
    }
    setDetailView('detail');
    setHasQuotationChanges(false);
  };

   const addQuotationLine = (productId?: string) => {
     const newLine: QuotationLine = {
       id: `line-${Date.now()}`,
       customOrderItemId: null,
       tipo: 'OTRO',
       descripcion: '',
       cantidad: 1,
       unidadMedida: 'unidad',
       precioUnitario: 0,
       observaciones: '',
     };

     if (productId) {
       setQuotationProducts(prev => prev.map(product => {
         if (product.id !== productId) return product;
         return {
           ...product,
           conceptos: [...product.conceptos, { ...newLine, customOrderItemId: product.customOrderItemId }],
           expanded: true,
         };
       }));
     } else {
       const newProduct: QuotationProduct = {
         id: `product-${Date.now()}`,
         customOrderItemId: '',
         nombre: 'Producto personalizado',
         cantidad: 1,
         conceptos: [{ ...newLine, customOrderItemId: null }],
         expanded: true,
       };
      setQuotationProducts(prev => [...prev, newProduct]);
    }
    setHasQuotationChanges(true);
  };

  const removeQuotationLine = (productId: string, lineId: string) => {
    setQuotationProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;
      return {
        ...product,
        conceptos: product.conceptos.filter(line => line.id !== lineId),
      };
    }));
    setHasQuotationChanges(true);
  };

  const updateQuotationLine = (productId: string, lineId: string, field: keyof QuotationLine, value: string | number) => {
    setQuotationProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;
      return {
        ...product,
        conceptos: product.conceptos.map(line => {
          if (line.id !== lineId) return line;
          const updated = { ...line, [field]: value };
          if (field === 'cantidad' || field === 'precioUnitario') {
            updated.precioUnitario = Number(updated.precioUnitario);
            updated.cantidad = Number(updated.cantidad);
          }
          return updated;
        }),
      };
    }));
    setHasQuotationChanges(true);
  };

  const toggleProductExpanded = (productId: string) => {
    setQuotationProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;
      return { ...product, expanded: !product.expanded };
    }));
    setHasQuotationChanges(true);
  };

  const handleSaveDraftQuotation = async () => {
    if (!selectedOrder) return;
    if (!validateQuotation()) return;
    setQuotationSaving(true);
    try {
      const payload = {
        detalles: quotationProducts.flatMap((product, productIndex) =>
          product.conceptos.map((line, lineIndex) => ({
            customOrderItemId: line.customOrderItemId ?? product.customOrderItemId,
            tipo: line.tipo,
            descripcion: line.descripcion,
            cantidad: Number(line.cantidad),
            unidadMedida: line.unidadMedida,
            precioUnitario: Number(line.precioUnitario),
            subtotal: calcLineSubtotal(line),
            observaciones: line.observaciones,
            orden: productIndex * 100 + lineIndex,
          }))
        ),
        subtotal: Number(calcQuotation.subtotal),
        impuestos: Number(calcQuotation.taxes),
        descuento: Number(calcQuotation.discount),
        tiempoEstimadoDias: Number(quotationDeliveryDays),
        validaHasta: new Date(Date.now() + quotationDeliveryDays * 24 * 60 * 60 * 1000).toISOString(),
        condicionesPago: quotationPaymentTerms,
        observaciones: quotationNotes,
        generadoPorId: currentUser?.uid ?? 'admin',
        generadoPorNombre: currentUser?.name ?? currentUser?.email ?? 'Administrador',
        draft: true,
      };

      const result = await customOrdersApi.generateQuotation(selectedOrder.id, payload);
      toast.success('Cotización guardada como borrador (PENDIENTE)');
      setHasQuotationChanges(false);
      if (result?.pedido && result?.cotizacion) {
        setSelectedOrder(result.pedido);
        setOrders(prev => prev.map(o => o.id === result.pedido.id ? result.pedido : o));
      } else {
        void loadOrders();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cotización';
      if (message.includes('Ya existe una cotización') || message.includes('409')) {
        toast.error('Este pedido ya tiene una cotización. Consulta o edita la cotización existente.');
      } else {
        toast.error(message || 'Error al guardar cotización');
      }
    } finally {
      setQuotationSaving(false);
    }
  };

  const handleSendQuotation = async () => {
    if (!selectedOrder) return;
    if (!validateQuotation()) return;
    setQuotationSaving(true);
    try {
      const payload = {
        detalles: quotationProducts.flatMap((product, productIndex) =>
          product.conceptos.map((line, lineIndex) => ({
            customOrderItemId: line.customOrderItemId ?? product.customOrderItemId,
            tipo: line.tipo,
            descripcion: line.descripcion,
            cantidad: Number(line.cantidad),
            unidadMedida: line.unidadMedida,
            precioUnitario: Number(line.precioUnitario),
            subtotal: calcLineSubtotal(line),
            observaciones: line.observaciones,
            orden: productIndex * 100 + lineIndex,
          }))
        ),
        subtotal: Number(calcQuotation.subtotal),
        impuestos: Number(calcQuotation.taxes),
        descuento: Number(calcQuotation.discount),
        tiempoEstimadoDias: Number(quotationDeliveryDays),
        validaHasta: new Date(Date.now() + quotationDeliveryDays * 24 * 60 * 60 * 1000).toISOString(),
        condicionesPago: quotationPaymentTerms,
        observaciones: quotationNotes,
        generadoPorId: currentUser?.uid ?? 'admin',
        generadoPorNombre: currentUser?.name ?? currentUser?.email ?? 'Administrador',
        draft: false,
      };

      const result = await customOrdersApi.generateQuotation(selectedOrder.id, payload);
      toast.success('Cotización enviada al cliente');
      setHasQuotationChanges(false);
      if (result?.pedido && result?.cotizacion) {
        setSelectedOrder(result.pedido);
        setOrders(prev => prev.map(o => o.id === result.pedido.id ? result.pedido : o));
      } else {
        void loadOrders();
      }
      setDetailView('detail');
      setDetailOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar cotización';
      if (message.includes('Ya existe una cotización') || message.includes('409')) {
        toast.error('Este pedido ya tiene una cotización. Consulta o edita la cotización existente.');
      } else {
        toast.error(message || 'Error al enviar cotización');
      }
    } finally {
      setQuotationSaving(false);
    }
  };

  const handleResendQuotation = async () => {
    if (!selectedOrder) return;
    if (hasQuotationChanges) {
      toast.error('Guarda los cambios antes de reenviar');
      return;
    }
    setQuotationSaving(true);
    try {
      const result = await customOrdersApi.sendQuotation(selectedOrder.id);
      toast.success('Cotización reenviada al cliente');
      setHasQuotationChanges(false);
      if (result) {
        setSelectedOrder(result);
        setOrders(prev => prev.map(o => o.id === result.id ? result : o));
      } else {
        void loadOrders();
      }
      setDetailView('detail');
      setDetailOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reenviar cotización';
      toast.error(message || 'Error al reenviar cotización');
    } finally {
      setQuotationSaving(false);
    }
  };

  const columns = [
    {
      key: 'numeroSolicitud',
      header: 'Solicitud',
      render: (row: CustomOrder) => (
        <span className={s.requestNumberCell}>{row.numeroSolicitud}</span>
      )
    },
    {
      key: 'items',
      header: 'Productos',
      render: (row: CustomOrder) => (
        <span className={s.tdMono + ' ' + s.productosCell} title={row.items.map(i => i.descripcion).join(', ')}>
          {row.items.length} producto{row.items.length !== 1 ? 's' : ''}
        </span>
      )
    },
    {
      key: 'cantidadTotal',
      header: 'Cantidad',
      render: (row: CustomOrder) => (
        <span className={s.tdMono + ' ' + s.tdCenter}>
          {row.items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0)}
        </span>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      width: '170px',
      sortable: true,
      render: (row: CustomOrder) => (
        <Badge variant={CUSTOM_ORDER_STATUS_COLORS[row.estado] ?? 'default'}>{getStatusLabel(row.estado)}</Badge>
      )
    },
    {
      key: 'cotizacionEstado',
      header: 'Cotización',
      render: (row: CustomOrder) => {
        if (!row.cotizacion) {
          return <span className={s.statusBadge + ' ' + s.statusBadgeDefault}>Sin cotizar</span>;
        }
        const qs = getQuotationAdminStatus(row.cotizacion.estado);
        return (
          <span className={s.cotizacionEstadoCell}>
            <Badge variant={qs.variant}>{qs.label}</Badge>
            {row.cotizacion && (row.cotizacion.negotiationCount ?? 0) > 0 && (
              <span className={s.metricValueSmall}>Negoc. {row.cotizacion.negotiationCount}/3</span>
            )}
          </span>
        );
      }
    },
    {
      key: 'total',
      header: 'Total',
      render: (row: CustomOrder) => (
        <span className={s.totalCell}>
          {row.cotizacion ? formatCurrency(Number(row.cotizacion.total) || 0) : '-'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (row: CustomOrder) => (
        <span className={s.fechaCell}>{formatDate(row.createdAt)}</span>
      )
    },
    {
      key: 'verDetalle',
      header: 'Ver detalle',
      render: (row: CustomOrder) => (
        <button
          className={s.rowActionPrimary}
          onClick={(e) => { e.stopPropagation(); setSelectedOrder(row); setDetailOpen(true); setDetailView('detail'); }}
          data-testid="btn-ver-detalle"
        >
          <Eye size={14} />
          <span>Ver detalle</span>
        </button>
      )
    },
  ];

  const getStatusLabel = (estado: string) => {
    const labels: Record<string, string> = {
      SOLICITUD_RECIBIDA: 'Solicitud recibida',
      EN_REVISION: 'En revisión',
      COTIZADO: 'Cotizado',
      COTIZACION_ACEPTADA: 'Cotización aceptada',
      COTIZACION_RECHAZADA: 'Cotización rechazada',
      PAGO_PENDIENTE: 'Pago pendiente',
      PAGO_EN_VERIFICACION: 'Pago en verificación',
      PAGO_APROBADO: 'Pago aprobado',
      CONVERTIDO_A_PEDIDO: 'Convertido a pedido',
      EN_PRODUCCION: 'En producción',
      COMPLETADO: 'Completado',
      CANCELADO: 'Cancelado',
      VENCIDO: 'Vencido',
    };
    return labels[estado] ?? estado;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  const getQuotationAdminStatus = (estado: string) => {
    if (estado === 'PENDIENTE' || estado === 'BORRADOR' || estado === 'VENCIDA') return { label: 'Borrador', variant: 'warning' as const };
    if (estado === 'ENVIADA' || estado === 'ACEPTADA') return { label: 'Enviada', variant: 'success' as const };
    if (estado === 'RECHAZADA') return { label: 'Rechazada', variant: 'danger' as const };
    if (estado === 'CANCELADA') return { label: 'Cancelada', variant: 'default' as const };
    return { label: estado, variant: 'default' as const };
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return value;
    }
  };

  const calcLineSubtotal = (line: QuotationLine) => Number((line.cantidad * line.precioUnitario).toFixed(2));

  const calcQuotation = useMemo(() => {
    const allLines = quotationProducts.flatMap(product => product.conceptos);
    const subtotal = Number(allLines.reduce((sum, line) => sum + calcLineSubtotal(line), 0).toFixed(2));
    const discountPercent = Math.min(Math.max(quotationDiscount, 0), 100);
    const discount = Number((subtotal * (discountPercent / 100)).toFixed(2));
    const base = subtotal - discount;
    const taxes = Number((base * (quotationTaxRate / 100)).toFixed(2));
    const total = Number((base + taxes).toFixed(2));
    const advance = Number((total * (quotationAdvanceRate / 100)).toFixed(2));
    const balance = Number((total - advance).toFixed(2));
    return { subtotal, discount, base, taxes, total, advance, balance };
  }, [quotationProducts, quotationDiscount, quotationTaxRate, quotationAdvanceRate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => o.numeroSolicitud.toLowerCase().includes(q) || o.clienteNombre.toLowerCase().includes(q));
  }, [orders, search]);

  const summaryStyles = { ...clienteS, ...s };
  const summaryData: CustomOrderSummaryData | null = selectedOrder
    ? {
        clienteNombre: selectedOrder.clienteNombre,
        clienteEmail: selectedOrder.clienteEmail ?? undefined,
        clienteTelefono: selectedOrder.clienteTelefono ?? undefined,
        descripcionGeneral: selectedOrder.descripcionGeneral ?? undefined,
        notasReferencia: selectedOrder.notasReferencia ?? undefined,
        estado: getStatusLabel(selectedOrder.estado),
        items: (selectedOrder.items || []).map((item) => ({
          id: item.id,
          productoNombre: item.productoNombre,
          descripcion: item.descripcion,
          tipoPersonalizacion: item.tipoPersonalizacion,
          cantidad: item.cantidad,
          material: item.material,
          talla: item.talla,
          color: item.color,
          especificaciones: item.especificaciones,
          distribucionTallas: item.distribucionTallas ?? undefined,
          imagenesReferencia: item.imagenesReferencia ?? undefined,
          personalizaciones: (item.personalizaciones || []).map((pers) => ({
            tipo: pers.tipo,
            tecnica: pers.tecnica,
            descripcion: pers.descripcion,
            ubicacion: pers.ubicacion,
            archivos: pers.archivos,
            variantes: pers.variantes,
          })),
        })),
        fechaEntregaDeseada: selectedOrder.fechaEntregaDeseada ?? undefined,
        usoFinal: selectedOrder.usoFinal ?? undefined,
        direccionEntrega: selectedOrder.direccionEntrega ?? undefined,
        notasCliente: selectedOrder.notasCliente ?? undefined,
        paymentStatus: selectedOrder.paymentStatus ?? undefined,
        paymentProofUrl: selectedOrder.paymentProofUrl ?? undefined,
        paymentProofOrderId: selectedOrder.id,
        paymentKey: selectedOrder.paymentKey ?? undefined,
        anticipoPagado: selectedOrder.anticipoPagado ?? undefined,
      }
    : null;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Pedidos personalizados</h1>
          <p className={s.pageSubtitle}>{totalItems} solicitudes en total</p>
        </div>
        <div className={s.headerActions}>
          <Button onClick={loadOrders} disabled={loading} variant="secondary">
            <RefreshCcw size={16} className="mr-2" />
            Actualizar
          </Button>
          <Button onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus size={18} />
            <span>Nuevo pedido</span>
          </Button>
        </div>
      </div>

      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <span className={`${s.statIcon} ${s.statIconInfo}`}>
                <FileText size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{totalOrders}</span>
                <span className={s.statLabel}>Total</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <span className={`${s.statIcon} ${s.statIconWarning}`}>
                <Eye size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{pendingOrders}</span>
                <span className={s.statLabel}>Pendientes</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <span className={`${s.statIcon} ${s.statIconDone}`}>
                <CheckCircle size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{quotedOrders}</span>
                <span className={s.statLabel}>Cotizados</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardPrimary}`}>
              <span className={`${s.statIcon} ${s.statIconReceived}`}>
                <RefreshCcw size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{productionOrders}</span>
                <span className={s.statLabel}>En producción</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <span className={`${s.statIcon} ${s.statIconDanger}`}>
                <AlertCircle size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{pagoPendienteOrders}</span>
                <span className={s.statLabel}>Pago pendiente</span>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Finanzas</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardPrimary}`}>
              <span className={`${s.statIcon} ${s.statIconPrimary}`}>
                <FileText size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{formatCurrency(valorTotal)}</span>
                <span className={s.statLabel}>Valor total</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <span className={`${s.statIcon} ${s.statIconSuccess}`}>
                <CheckCircle size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{formatCurrency(totalRecibido)}</span>
                <span className={s.statLabel}>Total recibido</span>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <span className={`${s.statIcon} ${s.statIconWarning}`}>
                <Eye size={24} />
              </span>
              <div className={s.statBody}>
                <span className={s.statValue}>{formatCurrency(saldoPendiente)}</span>
                <span className={s.statLabel}>Saldo pendiente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.toolbar}>
          <div className={s.searchBox}>
            <span className={s.searchIcon}><Search size={16} /></span>
            <input
              className={s.searchInput}
              placeholder="Buscar por solicitud o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={s.filterSelect}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="SOLICITUD_RECIBIDA">Solicitud recibida</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="COTIZADO">Cotizado</option>
            <option value="COTIZACION_ACEPTADA">Cotización aceptada</option>
            <option value="COTIZACION_RECHAZADA">Cotización rechazada</option>
            <option value="PAGO_PENDIENTE">Pago pendiente</option>
            <option value="PAGO_EN_VERIFICACION">Pago en verificación</option>
            <option value="PAGO_APROBADO">Pago aprobado</option>
            <option value="CONVERTIDO_A_PEDIDO">Convertido a pedido</option>
            <option value="EN_PRODUCCION">En producción</option>
            <option value="COMPLETADO">Completado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="VENCIDO">Vencido</option>
          </select>
          <select
            className={s.filterSelect}
            value={filtroEstadoPago}
            onChange={(e) => setFiltroEstadoPago(e.target.value)}
          >
            <option value="">Todos los pagos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGADO">Pagado</option>
          </select>
          <select
            className={s.filterSelect}
            value={filtroClienteId}
            onChange={(e) => setFiltroClienteId(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <div className={s.dateRange}>
            <input
              type="date"
              className={s.dateRangeInput}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              placeholder="Desde"
            />
            <span className={s.dateRangeSeparator}>—</span>
            <input
              type="date"
              className={s.dateRangeInput}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              placeholder="Hasta"
            />
          </div>
          <button className={s.filterClear} onClick={() => { setFiltroEstado(''); setFiltroEstadoPago(''); setFiltroClienteId(''); setFechaInicio(''); setFechaFin(''); setSearch(''); }}>
            <X size={14} />
            <span>Limpiar filtros</span>
          </button>
        </div>

        <div className={s.tableScroll}>
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage={loading ? 'Cargando...' : 'No hay pedidos personalizados'}
            enableRowSelection={false}
            maxVisibleColumns={10}
            serverMode
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            actions={(row) => [
              { label: 'Editar', icon: <Edit3 size={14} />, onClick: () => openEdit(row) },
              { label: 'Cambiar estado', onClick: () => { setStatusConfirm(row); setSelectedStatus(null); } },
              ...(!row.anticipoPagado && (row.paymentKey || row.paymentProofUrl) ? [{ label: 'Confirmar pago', onClick: () => setPaymentConfirm(row) }] : []),
              { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(row), danger: true },
            ]}
          />
        </div>
      </div>

      <Modal
        open={detailOpen}
        onClose={handleCloseDetail}
        title={
          detailView === 'quotation'
            ? 'Gestionar cotización'
            : detailView === 'negotiation'
            ? 'Negociar cotización'
            : `Solicitud ${selectedOrder?.numeroSolicitud ?? ''}`
        }
        description={
          detailView === 'quotation'
            ? 'Construye la cotización con conceptos, precios y condiciones.'
            : detailView === 'negotiation'
            ? 'Envía una propuesta de negociación al cliente.'
            : undefined
        }
        size={detailView === 'quotation' ? '2xl' : 'xl'}
        footer={null}
      >
        {detailView === 'negotiation' && selectedOrder?.cotizacion ? (
          <div className={s.form} data-testid="negotiation-form">
            <div className={s.sectionBlock}>
              <div className={s.sectionHeader}>
                <FileText size={16} />
                <div className={s.sectionTitle}>Cotización actual (referencia)</div>
              </div>
              <div className={s.summaryPanel}>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Subtotal</span>
                  <span className={s.summaryRowValue}>{formatCurrency(Number(selectedOrder.cotizacion.subtotal))}</span>
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Descuento</span>
                  <span className={s.summaryRowValue}>{formatCurrency(Number(selectedOrder.cotizacion.descuento))}</span>
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Impuestos</span>
                  <span className={s.summaryRowValue}>{formatCurrency(Number(selectedOrder.cotizacion.impuestos))}</span>
                </div>
                <div className={`${s.summaryRow} ${s.summaryTotal}`}>
                  <span className={s.summaryRowLabel}>Total</span>
                  <span className={s.summaryRowValue}>{formatCurrency(Number(selectedOrder.cotizacion.total))}</span>
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Condiciones de pago</span>
                  <span className={s.summaryRowValue}>{selectedOrder.cotizacion.condicionesPago || '-'}</span>
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Tiempo estimado</span>
                  <span className={s.summaryRowValue}>{selectedOrder.cotizacion.tiempoEstimadoDias ?? '-'} días</span>
                </div>
              </div>
            </div>

            {selectedOrder.cotizacion.motivoRechazo && (
              <div className={s.sectionBlock} style={{ borderLeftColor: 'var(--color-danger)' }}>
                <div className={s.sectionHeader}>
                  <FileText size={16} />
                  <div className={s.sectionTitle}>Motivo del rechazo</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'rgba(220, 38, 38, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(220, 38, 38, 0.15)', fontSize: '0.82rem', color: 'var(--color-danger)' }}>
                  {selectedOrder.cotizacion.motivoRechazo}
                </div>
              </div>
            )}

            {negotiationHistory.length > 0 && (
              <div className={s.sectionBlock}>
                <div className={s.sectionHeader}>
                  <FileText size={16} />
                  <div className={s.sectionTitle}>Historial de negociaciones</div>
                </div>
                <div className={s.negotiationHistory} data-testid="negotiation-history">
                  {negotiationHistory.map((entry) => (
                    <div key={entry.id} className={s.negotiationEntry} data-testid={`negotiation-entry-${entry.round}`}>
                      <div className={s.negotiationEntryHeader}>
                        <span className={s.negotiationEntryTitle}>Negociacián {entry.round}</span>
                        <span className={s.negotiationEntryDate}>{new Date(entry.created_at).toLocaleString('es-CO')}</span>
                      </div>
                      <div className={s.negotiationEntryMessage}>{entry.message}</div>
                      {entry.proposalData && (
                        <div className={s.negotiationEntryProposal}>
                          Propuesta: Total {formatCurrency(Number(entry.proposalData.total))} | Anticipo {entry.proposalData.porcentajeAnticipo ?? 50}% | Tiempo {entry.proposalData.tiempoEstimadoDias ?? '-'} días
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={s.sectionBlock}>
              <div className={s.sectionHeader}>
                <FileText size={16} />
                <div className={s.sectionTitle}>Tu propuesta</div>
              </div>
              <div className={s.summaryPanel}>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Subtotal</span>
                  <input className={s.summaryInput} type="number" min="0" value={negotiationProposalData.subtotal} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, subtotal: Number(e.target.value) })} />
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Descuento (%)</span>
                  <input className={s.summaryInput} type="number" min="0" max="100" value={negotiationProposalData.descuento} onChange={(e) => { const val = Math.min(Math.max(Number(e.target.value) || 0, 0), 100); setNegotiationProposalData({ ...negotiationProposalData, descuento: val }); }} />
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Impuestos</span>
                  <input className={s.summaryInput} type="number" min="0" value={negotiationProposalData.impuestos} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, impuestos: Number(e.target.value) })} />
                </div>
                <div className={`${s.summaryRow} ${s.summaryTotal}`}>
                  <span className={s.summaryRowLabel}>Total</span>
                  <input className={s.summaryInput} type="number" min="0" value={negotiationProposalData.total} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, total: Number(e.target.value) })} />
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Condiciones de pago</span>
                  <input className={s.summaryInput} type="text" value={negotiationProposalData.condicionesPago} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, condicionesPago: e.target.value })} style={{ width: '140px', textAlign: 'left' }} />
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>% Anticipo</span>
                  <input className={s.summaryInput} type="number" min="0" max="100" value={negotiationProposalData.porcentajeAnticipo} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, porcentajeAnticipo: Number(e.target.value) })} />
                </div>
                <div className={s.summaryRow}>
                  <span className={s.summaryRowLabel}>Tiempo estimado (días)</span>
                  <input className={s.summaryInput} type="number" min="1" value={negotiationProposalData.tiempoEstimadoDias} onChange={(e) => setNegotiationProposalData({ ...negotiationProposalData, tiempoEstimadoDias: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            <div className={s.sectionBlock}>
              <div className={s.sectionHeader}>
                <FileText size={16} />
                <div className={s.sectionTitle}>Mensaje</div>
              </div>
              <textarea
                className={s.textarea}
                rows={3}
                placeholder="Explica los cambios en tu propuesta..."
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                data-testid="negotiation-message"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div className={s.negotiationCounter} data-testid="negotiation-counter-admin">
                <span className={s.negotiationDots}>
                  {[1, 2, 3].map(i => (
                    <span key={i} className={`${s.negotiationDot} ${i <= getAdminNegotiationCounts().adminRounds + 1 ? s.negotiationDotActive : ''}`} />
                  ))}
                </span>
                Ronda {getAdminNegotiationCounts().adminRounds + 1}/3
              </div>
              <div className={s.negotiationCounter}>
                Cliente: ronda {getAdminNegotiationCounts().clientRounds + 1}/3
              </div>
            </div>

            <div className={s.actionsBar}>
              <div className={s.actionsBarLeft}>
                <Button variant="secondary" size="sm" onClick={closeNegotiation}>
                  ? Volver
                </Button>
              </div>
              <div className={s.actionsBarRight}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartNegotiation}
                  disabled={negotiationSending || !negotiationMessage.trim() || getAdminNegotiationCounts().adminRemaining <= 0}
                  data-testid="negotiation-send-btn"
                >
                  {negotiationSending ? 'Enviando...' : 'Enviar propuesta'}
                </Button>
              </div>
            </div>
          </div>
        ) : detailView === 'quotation' && selectedOrder ? (
           <div className={s.quotationEditor} data-testid="quotation-editor">
             <div className={s.quotationEditorMain}>
               {selectedOrder.cotizacion && (
                 <div className={s.sectionBlock}>
                   <div className={s.sectionHeader}>
                     <FileText size={16} />
                     <div className={s.sectionTitle}>Estado de la cotización</div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                     {selectedOrder.cotizacion && (() => {
                       const status = getQuotationAdminStatus(selectedOrder.cotizacion.estado);
                       return (
                         <>
                           <Badge variant={status.variant} data-testid="quotation-status-badge">{status.label}</Badge>
                           <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)' }} data-testid="quotation-negotiation-count">
                             Negociaciones: {selectedOrder.cotizacion.negotiationCount ?? 0}/3
                           </span>
                         </>
                       );
                     })()}
                   </div>
                   {selectedOrder?.cotizacion?.estado === 'RECHAZADA' && selectedOrder.cotizacion.motivoRechazo && (
                     <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(220, 38, 38, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(220, 38, 38, 0.15)', fontSize: '0.82rem', color: 'var(--color-danger)' }} data-testid="rejection-reason">
                       <strong>Motivo del rechazo:</strong> {selectedOrder.cotizacion.motivoRechazo}
                     </div>
                   )}
                   {selectedOrder?.cotizacion?.estado === 'CANCELADA' && (
                     <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(100, 116, 122, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(100, 116, 122, 0.15)', fontSize: '0.82rem', color: 'var(--color-text-muted)' }} data-testid="cancelled-notice">
                       <strong>Cotización cancelada por agotamiento de negociaciones.</strong>
                     </div>
                   )}
                   {negotiationLoading ? (
                     <div className={s.negotiationHistory}>
                       <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Cargando negociaciones...</span>
                     </div>
                   ) : negotiationHistory.length > 0 && (
                     <div className={s.negotiationHistory} data-testid="negotiation-history" style={{ marginTop: '12px' }}>
                       {negotiationHistory.map((entry) => (
                         <div key={entry.id} className={s.negotiationEntry} data-testid={`negotiation-entry-${entry.round}`}>
                           <div className={s.negotiationEntryHeader}>
                             <span className={s.negotiationEntryTitle}>Negociacián {entry.round}</span>
                             <span className={s.negotiationEntryDate}>{new Date(entry.created_at).toLocaleString('es-CO')}</span>
                           </div>
                           <div className={s.negotiationEntryMessage}>{entry.message}</div>
                           {entry.proposalData && (
                             <div className={s.negotiationEntryProposal}>
                               Propuesta: Total {formatCurrency(Number(entry.proposalData.total))} | Anticipo {entry.proposalData.porcentajeAnticipo ?? 50}% | Tiempo {entry.proposalData.tiempoEstimadoDias ?? '-'} días
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}

               <div className={s.sectionBlock}>
                 <div className={s.sectionHeader}>
                   <FileText size={16} />
                   <div className={s.sectionTitle}>Productos</div>
                 </div>
                 <p className={s.sectionDescription}>Organiza la cotización por producto. Cada producto puede tener múltiples conceptos.</p>

                 {quotationProducts.map((product) => (
                   <div key={product.id} className={s.productCard}>
                     <div className={s.productHeader} onClick={() => toggleProductExpanded(product.id)}>
                       <div className={s.productInfo}>
                         <div>
                           <div className={s.productTitle}>{product.nombre}</div>
                           <div className={s.productMeta}>
                             <span>Cantidad: {product.cantidad}</span>
                             {product.talla && <span>Talla: {product.talla}</span>}
                             {product.color && <span>Color: {product.color}</span>}
                             {product.material && <span>Material: {product.material}</span>}
                           </div>
                         </div>
                       </div>
                       <div className={s.productSubtotal}>
                         {formatCurrency(product.conceptos.reduce((sum, line) => sum + calcLineSubtotal(line), 0))}
                       </div>
                     </div>

                     {product.expanded && (
                       <div className={s.productBody}>
                         <div className={s.conceptsTable}>
                           <div className={s.conceptsHeader}>
                             <span>Tipo</span>
                             <span>Descripción</span>
                             <span>Cant.</span>
                             <span>P. unitario</span>
                             <span>Subtotal</span>
                             <span></span>
                           </div>
                           {product.conceptos.map((line) => (
                             <div key={line.id} className={s.conceptRow} data-testid="concept-row">
                               <div>
                                 <select className={s.select} value={line.tipo} onChange={(e) => updateQuotationLine(product.id, line.id, 'tipo', e.target.value)}>
                                   <option value="PRODUCTO_BASE">Producto base</option>
                                   <option value="MATERIA_PRIMA">Materia prima</option>
                                   <option value="MANO_OBRA">Mano de obra</option>
                                   <option value="DISENO">Diseáo</option>
                                   <option value="LOGISTICA">Logástica</option>
                                   <option value="OTRO">Otro</option>
                                 </select>
                               </div>
                               <div>
                                 <input className={s.input} placeholder="Descripción del concepto" value={line.descripcion} onChange={(e) => updateQuotationLine(product.id, line.id, 'descripcion', e.target.value)} />
                               </div>
                               <div>
                                 <input className={s.input} type="number" min="1" value={line.cantidad} onChange={(e) => updateQuotationLine(product.id, line.id, 'cantidad', Number(e.target.value))} />
                               </div>
                               <div>
                                 <input className={s.input} type="number" min="0" step="1" value={line.precioUnitario} onChange={(e) => updateQuotationLine(product.id, line.id, 'precioUnitario', Number(e.target.value))} />
                               </div>
                               <div>
                                 <span className={s.conceptSubtotal}>{formatCurrency(calcLineSubtotal(line))}</span>
                               </div>
                               <div className={s.conceptActions}>
                                 <button type="button" className={s.rowActionDanger} onClick={() => removeQuotationLine(product.id, line.id)} style={{ height: '32px', width: '32px', padding: 0 }}>
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                             </div>
                           ))}
                           <button type="button" className={s.addLineBtn} onClick={() => addQuotationLine(product.id)}>
                             <PlusCircle size={14} />
                             <span>Agregar concepto</span>
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}

                 <button type="button" className={s.addLineBtn} onClick={() => addQuotationLine()} style={{ marginTop: '8px' }}>
                   <PlusCircle size={14} />
                   <span>Agregar producto</span>
                 </button>
               </div>

               <div className={s.sectionBlock}>
                 <div className={s.sectionHeader}>
                   <FileText size={16} />
                   <div className={s.sectionTitle}>Condiciones</div>
                 </div>
                 <div className={s.formRow}>
                   <div className={s.field}>
                     <label className={s.label}>Tiempo estimado (días)</label>
                     <input className={s.input} type="number" min="1" value={quotationDeliveryDays} onChange={(e) => { setQuotationDeliveryDays(Number(e.target.value)); setHasQuotationChanges(true); }} />
                   </div>
                   <div className={s.field}>
                     <label className={s.label}>Condiciones de pago</label>
                     <input className={s.input} value={quotationPaymentTerms} onChange={(e) => { setQuotationPaymentTerms(e.target.value); setHasQuotationChanges(true); }} />
                   </div>
                 </div>
                 <div className={s.field}>
                   <label className={s.label}>Observaciones</label>
                   <textarea className={s.textarea} rows={2} value={quotationNotes} onChange={(e) => { setQuotationNotes(e.target.value); setHasQuotationChanges(true); }} />
                 </div>
               </div>
             </div>

             <div className={s.quotationEditorSummary}>
               <div className={s.sectionBlock}>
                 <div className={s.sectionHeader}>
                   <FileText size={16} />
                   <div className={s.sectionTitle}>Resumen</div>
                 </div>
                 <div className={s.summaryPanel}>
                   <div className={s.summaryRow}>
                     <span className={s.summaryRowLabel}>Subtotal</span>
                     <span className={s.summaryRowValue}>{formatCurrency(calcQuotation.subtotal)}</span>
                   </div>
                    <div className={s.summaryRow}>
                      <span className={s.summaryRowLabel}>Descuento (%)</span>
                      <input className={s.summaryInput} type="number" min="0" max="100" value={quotationDiscount} onChange={(e) => { const val = Math.min(Math.max(Number(e.target.value) || 0, 0), 100); setQuotationDiscount(val); setHasQuotationChanges(true); }} />
                    </div>
                   <div className={s.summaryRow}>
                     <span className={s.summaryRowLabel}>Base gravable</span>
                     <span className={s.summaryRowValue}>{formatCurrency(calcQuotation.base)}</span>
                   </div>
                   <div className={s.summaryRow}>
                     <span className={s.summaryRowLabel}>Impuestos ({quotationTaxRate}%)</span>
                     <input className={s.summaryInput} type="number" min="0" max="100" value={quotationTaxRate} onChange={(e) => { setQuotationTaxRate(Number(e.target.value)); setHasQuotationChanges(true); }} />
                   </div>
                   <div className={`${s.summaryRow} ${s.summaryTotal}`}>
                     <span className={s.summaryRowLabel}>TOTAL</span>
                     <span className={s.summaryRowValue} style={{ fontSize: '1rem', fontWeight: 700 }}>{formatCurrency(calcQuotation.total)}</span>
                   </div>
                   <div className={s.summaryRow}>
                     <span className={s.summaryRowLabel}>Anticipo ({quotationAdvanceRate}%)</span>
                     <input className={s.summaryInput} type="number" min="0" max="100" value={quotationAdvanceRate} onChange={(e) => { setQuotationAdvanceRate(Number(e.target.value)); setHasQuotationChanges(true); }} />
                   </div>
                   <div className={`${s.summaryRow} ${s.summaryBalance}`}>
                     <span className={s.summaryRowLabel}>Saldo</span>
                     <span className={s.summaryRowValue}>{formatCurrency(calcQuotation.balance)}</span>
                   </div>
                 </div>
               </div>
             </div>

             <div className={s.actionsBar}>
               <div className={s.actionsBarLeft}>
                  <Button variant="secondary" size="sm" onClick={handleBackFromQuotation}>
                    ? Volver
                  </Button>
               </div>
               <div className={s.actionsBarRight}>
                  {selectedOrder?.cotizacion?.estado === 'PENDIENTE' && (
                    <Button variant="outline" size="sm" onClick={handleResendQuotation} disabled={quotationSaving || hasQuotationChanges} data-testid="btn-reenviar">
                      {quotationSaving ? 'Reenviando...' : 'Reenviar'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveDraftQuotation}
                    disabled={quotationSaving || quotationProducts.length === 0 || quotationProducts.every(p => p.conceptos.length === 0)}
                    data-testid="btn-guardar-cotizacion"
                  >
                    {quotationSaving ? 'Guardando...' : 'Guardar borrador'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendQuotation}
                    disabled={quotationSaving || quotationProducts.length === 0 || quotationProducts.every(p => p.conceptos.length === 0)}
                    data-testid="btn-enviar-cotizacion"
                  >
                    {quotationSaving ? 'Enviando...' : 'Enviar cotización'}
                  </Button>
               </div>
             </div>
           </div>
        ) : (
          summaryData && (
            <CustomOrderSummary
              data={summaryData}
              styles={summaryStyles}
              cotizacion={selectedOrder?.cotizacion}
              footerActions={
                  [
                    { label: 'Cerrar', variant: 'secondary' as const, onClick: () => setDetailOpen(false) },
                    ...(selectedOrder && selectedOrder.cotizacion?.estado === 'CANCELADA'
                      ? [{ label: 'Cotización cancelada (sin acciones)', variant: 'secondary' as const, onClick: () => {}, disabled: true }]
                      : []),
                    ...(selectedOrder && selectedOrder.cotizacion?.estado === 'RECHAZADA' && selectedOrder.cotizacion.negotiationCount !== 3
                      ? [{ label: 'Negociar', onClick: () => openNegotiation(), variant: 'secondary' as const }]
                      : []),
                    ...(selectedOrder && selectedOrder.cotizacion?.estado === 'PENDIENTE' && selectedOrder.cotizacion.negotiationCount !== 3
                      ? [{ label: 'Reenviar cotización', onClick: () => handleResendQuotation(), variant: 'primary' as const }]
                      : []),
                    ...(selectedOrder && !['CONVERTIDO_A_PEDIDO', 'COMPLETADO', 'CANCELADO', 'VENCIDO', 'EN_PRODUCCION'].includes(selectedOrder.estado)
                      && (!selectedOrder.cotizacion || ['PENDIENTE', 'BORRADOR', 'RECHAZADA', 'VENCIDA'].includes(selectedOrder.cotizacion.estado))
                      && selectedOrder.cotizacion?.estado !== 'CANCELADA' && (selectedOrder.cotizacion?.negotiationCount ?? 0) < 3
                      ? [{ label: selectedOrder.cotizacion ? 'Editar cotización' : 'Gestionar cotización', onClick: () => openQuotationEditor(selectedOrder), variant: 'primary' as const }]
                      : []),
                    ...(selectedOrder && selectedOrder.estado === 'PAGO_PENDIENTE' && !selectedOrder.anticipoPagado
                      ? [{ label: 'Confirmar anticipo', onClick: () => { setPaymentConfirm(selectedOrder); setDetailOpen(false); } }]
                      : []),
                    ...(selectedOrder && selectedOrder.estado === 'PAGO_APROBADO'
                      ? [{ label: 'Convertir a pedido', onClick: async () => { try { await customOrdersApi.convertToOrder(selectedOrder.id); toast.success('Pedido convertido exitosamente'); setDetailOpen(false); void loadOrders(); } catch { toast.error('Error al convertir a pedido'); } } }]
                      : []),
                    ...(selectedOrder && !selectedOrder.anticipoPagado && (selectedOrder.paymentKey || selectedOrder.paymentProofUrl) && selectedOrder.estado !== 'COTIZACION_ACEPTADA'
                      ? [{ label: 'Confirmar anticipo', onClick: () => { setPaymentConfirm(selectedOrder); setDetailOpen(false); } }]
                      : []),
                  ]
                }
            />
          )
        )}
      </Modal>

      <CustomOrderFormModal
        key={editingId || 'new'}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setWizardStep(1);
        }}
        title={editingId ? 'Editar solicitud' : 'Solicitar cotización'}
        step={wizardStep}
        steps={['Cliente', 'Producto y personalización', 'Entrega', 'Resumen']}
        onStepChange={(newStep) => {
          if (validateStep(wizardStep)) setWizardStep(newStep);
        }}
        onBack={() => setWizardStep(prev => prev - 1)}
        onSubmit={handleSave}
        saving={saving}
        isEditing={!!editingId}
      >
        <div className={s.form}>
          {/* Cliente */}
          <div className={`${s.sectionBlock} ${s.sectionBlockAcccent}`}>
            <div className={s.sectionHeader}>
              <User size={18} />
              <div className={s.sectionTitle}>Cliente</div>
            </div>
            <p className={s.sectionDescription}>Selecciona el cliente que solicita la personalización. Los datos de contacto se completan automáticamente.</p>
            <div className={s.formRow}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label htmlFor="admin-cliente" className={s.label}>Cliente <span className={s.labelRequired}>*</span></label>
                <select id="admin-cliente" className={`${s.select} ${touched['clienteNombre'] && errors['clienteNombre'] ? s.selectError : ''}`} value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} onBlur={() => handleBlur('clienteNombre')}>
                  <option value="">Selecciona un cliente</option>
                  {clientes.length === 0 && <option value="" disabled>No hay clientes disponibles</option>}
                  {clientes.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
                {touched['clienteNombre'] && errors['clienteNombre'] && <span className={s.errorText}>{errors['clienteNombre']}</span>}
                {clientes.length === 0 && <span className={s.hintText}>No se encontraron clientes registrados.</span>}
              </div>
            </div>
            <div className={s.formRow}>
              <div className={s.field}>
                <label htmlFor="admin-email" className={s.label}>Email</label>
                <input id="admin-email" className={s.input} placeholder="Email" value={form.clienteEmail} onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })} />
              </div>
              <div className={s.field}>
                <label htmlFor="admin-telefono" className={s.label}>Teléfono</label>
                <input id="admin-telefono" className={s.input} placeholder="Teléfono" value={form.clienteTelefono} onChange={(e) => setForm({ ...form, clienteTelefono: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Producto solicitado */}
          <div className={s.sectionBlock}>
            <div className={s.sectionHeader}>
              <Package size={18} />
              <div className={s.sectionTitle}>Producto solicitado</div>
            </div>
            <p className={s.sectionDescription}>Define el producto base y sus atributos fásicos para la personalización. Puedes agregar varios productos.</p>
            
            {/* Lista de productos agregados */}
            {form.items.length > 1 && (
              <div className={s.filePreview} style={{ marginBottom: 12 }}>
                {form.items.map((item, idx) => (
                  <div key={idx} className={`${s.fileChip} ${idx === activeItemIndex ? s.multiSelectOptionSelected : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveItemIndex(idx)}>
                    <Package size={16} />
                    <span className={s.fileChipName}>{item.descripcion || `Producto ${idx + 1}`}</span>
                    {form.items.length > 1 && (
                      <button type="button" className={s.removeFileBtn} onClick={(e) => { e.stopPropagation(); const items = form.items.filter((_, i) => i !== idx); setForm({ ...form, items }); if (activeItemIndex >= items.length) setActiveItemIndex(Math.max(0, items.length - 1)); }}>Eliminar</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={s.formRow}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label htmlFor="admin-producto" className={s.label}>Producto base <span className={s.labelRequired}>*</span></label>
                <input
                  id="admin-producto"
                  className={s.input}
                  placeholder="Escribe el nombre del producto o selecciona uno del catálogo"
                  value={form.items[activeItemIndex]?.descripcion || ''}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[activeItemIndex] = { ...items[activeItemIndex], descripcion: e.target.value };
                    setForm({ ...form, items });
                  }}
                  list="productos-sugeridos"
                />
                <datalist id="productos-sugeridos">
                  {productos.map(p => (
                    <option key={p.id} value={p.nombre} />
                  ))}
                </datalist>
                {productos.length > 0 && <span className={s.hintText}>Sugerencias del catálogo disponibles.</span>}
              </div>
            </div>
            <div className={s.formRow}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <Button type="button" variant="outline" size="sm" leftIcon={<PlusCircle size={16} />} onClick={() => {
                  if (!(form.items[activeItemIndex]?.descripcion || '').trim()) {
                    toast.error('Ingresa el nombre del producto');
                    return;
                  }
                  const newItem = {
                    descripcion: form.items[activeItemIndex]?.descripcion || '',
                    tipoPersonalizacion: form.items[activeItemIndex]?.tipoPersonalizacion || 'BORDADO_ESTAMPADO',
                    especificaciones: form.items[activeItemIndex]?.especificaciones || '',
                    cantidad: form.items[activeItemIndex]?.cantidad || '1',
                    talla: form.items[activeItemIndex]?.talla || '',
                    color: form.items[activeItemIndex]?.color || '',
                    material: form.items[activeItemIndex]?.material || '',
                    ubicacion: form.items[activeItemIndex]?.ubicacion || [],
                    personalizaciones: form.items[activeItemIndex]?.personalizaciones || [],
                  };
                  const updatedItems = [...form.items, newItem];
                  updatedItems[activeItemIndex] = { descripcion: '', tipoPersonalizacion: 'BORDADO_ESTAMPADO', especificaciones: '', cantidad: '1', talla: '', color: '', material: '', ubicacion: [], personalizaciones: [] };
                  setForm({
                    ...form,
                    items: updatedItems,
                    cantidadTotal: (form.cantidadTotal || 0) + Number(newItem.cantidad || 0),
                  });
                  setActiveItemIndex(updatedItems.length - 1);
                  setCurrentProduct('');
                }}>
                  Agregar otro producto
                </Button>
              </div>
            </div>
            <div className={s.formRowAttr4}>
              <div className={s.field}>
                <label htmlFor="admin-cantidad" className={s.label}>Cantidad <span className={s.labelRequired}>*</span></label>
                <input id="admin-cantidad" type="number" className={s.input} placeholder="Cantidad" value={form.items[activeItemIndex]?.cantidad || '1'} onChange={(e) => {
                  const items = [...form.items];
                  items[activeItemIndex] = { ...items[activeItemIndex], cantidad: e.target.value };
                  setForm({ ...form, items, cantidadTotal: Number(e.target.value) });
                }} />
              </div>
              <div className={s.field}>
                <label htmlFor="admin-talla" className={s.label}>Talla</label>
                <input id="admin-talla" className={s.input} placeholder="Talla" value={form.items[activeItemIndex]?.talla || ''} onChange={(e) => {
                  const items = [...form.items];
                  items[activeItemIndex] = { ...items[activeItemIndex], talla: e.target.value };
                  setForm({ ...form, items });
                }} />
              </div>
              <div className={s.field}>
                <label htmlFor="admin-color" className={s.label}>Color</label>
                <input id="admin-color" className={s.input} placeholder="Color" value={form.items[activeItemIndex]?.color || ''} onChange={(e) => {
                  const items = [...form.items];
                  items[activeItemIndex] = { ...items[activeItemIndex], color: e.target.value };
                  setForm({ ...form, items });
                }} />
              </div>
              <div className={s.field}>
                <label htmlFor="admin-material" className={s.label}>Material/Tela</label>
                <input id="admin-material" className={s.input} placeholder="Material" value={form.items[activeItemIndex]?.material || ''} onChange={(e) => {
                  const items = [...form.items];
                  items[activeItemIndex] = { ...items[activeItemIndex], material: e.target.value };
                  setForm({ ...form, items });
                }} />
              </div>
            </div>
            <div className={s.formRowAttr4}>
              <div className={s.field}>
                <label htmlFor="admin-tipo-prenda" className={s.label}>Tipo de prenda</label>
                <input id="admin-tipo-prenda" className={s.input} placeholder="Ej: Camiseta, Chaqueta..." value={form.tipoPrenda} onChange={(e) => setForm({ ...form, tipoPrenda: e.target.value })} />
              </div>
              <div className={s.field}>
                <label htmlFor="admin-tecnica" className={s.label}>Técnica</label>
                <input id="admin-tecnica" className={s.input} placeholder="Ej: DTF, Serigrafía..." value={form.tecnicaPersonalizacion} onChange={(e) => setForm({ ...form, tecnicaPersonalizacion: e.target.value })} />
              </div>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label htmlFor="admin-tallas" className={s.label}>Tallas (separadas por coma)</label>
                <input id="admin-tallas" className={s.input} placeholder="S, M, L, XL..." value={form.tallas} onChange={(e) => setForm({ ...form, tallas: e.target.value })} />
              </div>
            </div>
            <div className={s.formRowAttr4}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label htmlFor="admin-colores" className={s.label}>Colores (separados por coma)</label>
                <input id="admin-colores" className={s.input} placeholder="Rojo, Azul, Negro..." value={form.coloresSolicitados} onChange={(e) => setForm({ ...form, coloresSolicitados: e.target.value })} />
              </div>
            </div>

            <div className={s.formRowAttr4} style={{ marginTop: '16px' }}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <div className={s.sectionHeader} style={{ marginBottom: '8px' }}>
                  <Paintbrush size={18} />
                  <div className={s.sectionTitle}>Personalizaciones del producto</div>
                </div>
                <p className={s.sectionDescription} style={{ marginBottom: '12px' }}>Agrega una o varias personalizaciones para este producto.</p>
              </div>
            </div>

            {(form.items[activeItemIndex]?.personalizaciones || []).map((pers, persIndex) => (
              <div key={persIndex} className={s.registroInfo} style={{ marginBottom: '16px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600 }}>Personalización #{persIndex + 1}</div>
                  <Button variant="danger" size="sm" onClick={() => eliminarPersonalizacion(persIndex)}>Eliminar</Button>
                </div>
                <div className={s.formRow}>
                  <div className={s.field}>
                    <label className={s.label}>Tipo <span className={s.labelRequired}>*</span></label>
                    <select className={s.select} value={pers.tipo} onChange={(e) => actualizarPersonalizacion(persIndex, 'tipo', e.target.value)}>
                      <option value="ESTAMPADO">Estampado</option>
                      <option value="BORDADO">Bordado</option>
                      <option value="SUBLIMACION">Sublimación</option>
                      <option value="VINILO">Vinilo</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div className={s.field}>
                    <label className={s.label}>Técnica</label>
                    <input className={s.input} placeholder="Ej: DTF, Serigrafía..." value={pers.tecnica || ''} onChange={(e) => actualizarPersonalizacion(persIndex, 'tecnica', e.target.value)} />
                  </div>
                </div>
                <div className={s.formRow}>
                  <div className={`${s.field} ${s.colSpan2}`}>
                    <label className={s.label}>Ubicación</label>
                    <div className={s.multiSelectContainer}>
                      <div className={s.multiSelectOptions}>
                         {['FRENTE', 'ESPALDA', 'MANGA_IZQUIERDA', 'MANGA_DERECHA', 'PECHO', 'PUNTO_CORAZON', 'OTRA'].map((option) => {
                           const isSelected = (pers.ubicacion || []).includes(option);
                           return (
                             <button
                               key={option}
                               type="button"
                               className={`${s.multiSelectOption} ${isSelected ? s.multiSelectOptionSelected : ''}`}
                               onClick={() => {
                                 const current = pers.ubicacion || [];
                                 const next = isSelected ? current.filter((u) => u !== option) : [...current, option];
                                 actualizarPersonalizacion(persIndex, 'ubicacion', next);
                               }}
                             >
                               {option.replace('MANGA_IZQUIERDA', 'Manga izq.').replace('MANGA_DERECHA', 'Manga der.').replace('PUNTO_CORAZON', 'Punto corazón')}
                             </button>
                           );
                         })}
                      </div>
                      {(pers.ubicacion || []).length > 0 && (
                        <div className={s.multiSelectChips}>
                           {(pers.ubicacion || []).map((u) => (
                             <span key={u} className={s.multiSelectChip}>
                               {u.replace('MANGA_IZQUIERDA', 'Manga izq.').replace('MANGA_DERECHA', 'Manga der.').replace('PUNTO_CORAZON', 'Punto corazón')}
                               <button type="button" className={s.multiSelectChipRemove} onClick={() => actualizarPersonalizacion(persIndex, 'ubicacion', (pers.ubicacion || []).filter((val) => val !== u))}>
                                 <X size={12} />
                               </button>
                             </span>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={s.field} style={{ marginTop: '12px' }}>
                  <label className={s.label}>Descripción del diseño <span className={s.labelRequired}>*</span></label>
                  <textarea className={s.textarea} rows={2} placeholder="Describe el diseño..." value={pers.descripcion || ''} onChange={(e) => actualizarPersonalizacion(persIndex, 'descripcion', e.target.value)} />
                </div>
                <div className={s.field} style={{ marginTop: '12px' }}>
                  <label className={s.label}>Variantes a personalizar</label>
                  {(pers.variantes || []).map((variante, varIndex) => (
                    <div key={varIndex} className={s.formRow} style={{ marginBottom: '8px' }}>
                      <div className={s.field}>
                        <input className={s.input} placeholder="Talla" value={variante.talla} onChange={(e) => actualizarVariante(persIndex, varIndex, 'talla', e.target.value)} />
                      </div>
                      <div className={s.field}>
                        <input className={s.input} placeholder="Color" value={variante.color} onChange={(e) => actualizarVariante(persIndex, varIndex, 'color', e.target.value)} />
                      </div>
                      <div className={s.field}>
                         <input className={s.input} type="number" min="0" placeholder="Cant." value={variante.cantidad} onChange={(e) => actualizarVariante(persIndex, varIndex, 'cantidad', Number(e.target.value))} />
                      </div>
                      <div className={s.field}>
                        <button type="button" className={s.removeFileBtn} onClick={() => eliminarVariante(persIndex, varIndex)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" leftIcon={<PlusCircle size={16} />} onClick={() => agregarVariante(persIndex)}>
                    Agregar variante
                  </Button>
                  <div style={{ marginTop: '8px', fontWeight: 600 }}>
                    Total personalización: {(pers.variantes || []).reduce((sum: number, v: Record<string, unknown>) => sum + (Number(v.cantidad) || 0), 0)}
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" leftIcon={<PlusCircle size={16} />} onClick={agregarPersonalizacion} style={{ marginTop: '8px' }}>
              Agregar personalización
            </Button>
          </div>

          {/* Archivos y Entrega */}
          <div className={s.sectionBlock}>
            <div className={s.sectionHeader}>
              <Image size={18} />
              <div className={s.sectionTitle}>Archivos y Entrega</div>
            </div>
            <p className={s.sectionDescription}>Adjunta referencias visuales y define la fecha esperada de entrega.</p>
            <div className={s.formRow}>
              <div className={`${s.field} ${s.colSpan2}`}>
                <label htmlFor="admin-archivos" className={s.label}>Archivos de referencia (JPG, PNG, PDF)</label>
                <input id="admin-archivos" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className={s.hiddenInput} onChange={handleFileChange} />
                <label htmlFor="admin-archivos" className={s.uploadLabel}>Seleccionar archivos</label>
                {selectedFiles.length > 0 && (
                  <div className={s.filePreview}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className={s.fileChip}>
                        {file.type.startsWith('image/') && fileUrls[idx] ? (
                          <img src={fileUrls[idx]} alt={file.name} className={s.fileChipImage} />
                        ) : (
                          <FileText size={16} />
                        )}
                        <span className={s.fileChipName}>{file.name}</span>
                        <button type="button" className={s.removeFileBtn} onClick={() => removeFile(idx)}>Eliminar</button>
                      </div>
                    ))}
                  </div>
                )}
                <span className={s.hintText}>Puedes adjuntar múltiples archivos.</span>
              </div>
              <div className={s.field}>
                <label htmlFor="admin-fecha" className={s.label}>Fecha solicitada de entrega</label>
                <input id="admin-fecha" type="date" className={s.input} value={form.fechaEntregaDeseada} onChange={(e) => setForm({ ...form, fechaEntregaDeseada: e.target.value })} />
              </div>
            </div>
            <div className={s.field}>
              <label htmlFor="admin-observaciones" className={s.label}>Observaciones</label>
              <textarea id="admin-observaciones" className={s.textarea} rows={2} placeholder="Notas adicionales..." value={form.notasCliente} onChange={(e) => setForm({ ...form, notasCliente: e.target.value })} />
            </div>
          </div>
        </div>
      </CustomOrderFormModal>

      <Modal open={!!paymentConfirm} onClose={() => { if (!confirmingPayment) { setPaymentConfirm(null); setConfirmingPayment(false); } }} title="Confirmar pago de anticipo" description="Marca el anticipo como recibido para permitir el paso a producción." size="md" variant="form">
        {paymentConfirm && (
          <div className={s.form}>
            <div className={s.registroInfo}>
              <div className={s.formRow}>
                <div className={s.field}>
                  <span className={s.label}>Solicitud</span>
                  <span className={s.infoValue}>{paymentConfirm.numeroSolicitud}</span>
                </div>
                <div className={s.field}>
                  <span className={s.label}>Cliente</span>
                  <span className={s.infoValue}>{paymentConfirm.clienteNombre}</span>
                </div>
              </div>
            </div>
            {paymentConfirm.paymentProofUrl && (
              <div className={s.field}>
                <span className={s.label}>Comprobante de pago</span>
                <div className={s.paymentProofContainer}>
                  {paymentProofLoading && (
                    <div className={s.paymentProofLoading}>Cargando comprobante...</div>
                  )}
                  {paymentProofError && (
                    <div className={s.paymentProofError}>
                      <span>{paymentProofError}</span>
                      <button
                        className={s.fileLink}
                        onClick={() => setPaymentProofViewer({ orderId: paymentConfirm.id, url: customOrdersApi.getPaymentProofUrl(paymentConfirm.id) })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Ver comprobante de pago
                      </button>
                    </div>
                  )}
                  {paymentProofBlobUrl && !paymentProofLoading && (
                    <div className={s.paymentProofImageContainer}>
                      <img
                        src={paymentProofBlobUrl}
                        alt="Comprobante de pago"
                        className={s.paymentProofImage}
                        onError={() => setPaymentProofError('No se pudo cargar la imagen del comprobante')}
                      />
                      <button
                        className={s.fileLink}
                        onClick={() => window.open(paymentProofBlobUrl, '_blank')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '8px' }}
                      >
                        Ver comprobante completo
                      </button>
                    </div>
                  )}
                  {!paymentProofBlobUrl && !paymentProofLoading && !paymentProofError && (
                    <button
                      className={s.fileLink}
                      onClick={() => setPaymentProofViewer({ orderId: paymentConfirm.id, url: customOrdersApi.getPaymentProofUrl(paymentConfirm.id) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Ver comprobante de pago
                    </button>
                  )}
                </div>
              </div>
            )}
            <ModalFooter
              actions={[
                { label: 'Cancelar', variant: 'secondary', onClick: () => setPaymentConfirm(null), disabled: confirmingPayment },
                { label: confirmingPayment ? 'Registrando pago...' : 'Confirmar anticipo', variant: 'primary', disabled: confirmingPayment, onClick: async () => {
                  if (confirmingPayment) return;
                  setConfirmingPayment(true);
                  try {
                    await customOrdersApi.adminUpdatePayment(paymentConfirm.id, { anticipoPagado: true, paymentStatus: 'APPROVED' });
                    toast.success('Anticipo confirmado. Ahora puede pasar a producción.');
                    setPaymentConfirm(null);
                    void loadOrders();
                  } catch (err) {
                    const message = err instanceof ApiError
                      ? (err.status === 0 ? 'No se pudo conectar con el servidor. Verifica tu conexión.' : err.message)
                      : 'Error al confirmar pago';
                    toast.error('No se pudo confirmar el pago', { description: message });
                  } finally {
                    setConfirmingPayment(false);
                  }
                } },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal open={!!statusConfirm} onClose={() => { setStatusConfirm(null); setSelectedStatus(null); }} title="Cambiar estado de la solicitud" description="Actualiza el estado de la solicitud personalizada." size="md" variant="form">
        <div className={s.form}>
          {statusConfirm && (
            <CustomOrderStatusSelector
              currentStatus={statusConfirm.estado}
              selectedStatus={selectedStatus ?? statusConfirm.estado}
              onSelectedStatusChange={setSelectedStatus}
            />
          )}
           <ModalFooter
             actions={[
               { label: 'Cancelar', variant: 'secondary', onClick: () => { setStatusConfirm(null); setSelectedStatus(null); }, disabled: saving },
               { label: saving ? 'Guardando...' : 'Guardar cambios', onClick: handleChangeStatus, disabled: saving || !selectedStatus || selectedStatus === statusConfirm?.estado },
             ]}
           />
         </div>
       </Modal>

        <ConfirmationModal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDelete}
          title="Eliminar solicitud"
          description={`¿Estás seguro de eliminar la solicitud ${deleteConfirm?.numeroSolicitud ?? ''}?`}
          variant="danger"
          confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
          cancelLabel="Cancelar"
          loading={deleting}
          warning="Esta acción no se puede deshacer."
        />

        {paymentProofViewer && (
          <Modal
            open={!!paymentProofViewer}
            onClose={() => setPaymentProofViewer(null)}
            title="Comprobante de pago"
            description="Comprobante adjunto por el cliente."
            size="lg"
            footer={
              <ModalFooter
                align="end"
                actions={[
                  { label: 'Cerrar', variant: 'secondary', onClick: () => setPaymentProofViewer(null) },
                ]}
              />
            }
          >
            <div className={s.paymentProofViewer}>
              <PaymentProofImage
                src={paymentProofViewer.url}
                onError={() => toast.error('No se pudo cargar el comprobante.')}
              />
            </div>
          </Modal>
        )}
      </div>
    );
 };


