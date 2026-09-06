import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Eye, Edit3, Trash2, CheckCircle, FileText, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray, type FieldError, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter, type ModalFooterAction } from '@/shared/ui/ModalFooter';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { SearchInput } from '@/shared/ui/SearchInput';
import { customOrdersApi, type CustomOrder, type NegotiationMessage } from '@/infrastructure/api/customOrdersApi';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { useAuthStore } from '@/core/stores/authStore';
import { CustomOrderFormModal } from '@/presentation/components/CustomOrderFormModal';
import { BankingQrCode } from '@/presentation/components/BankingQrCode';
import { ClientStep, DeliveryStep, ProductStep, SummaryStep } from './quotation-steps';
import { CustomOrderSummary, type CustomOrderSummaryData } from './quotation-steps/CustomOrderSummary';
import { QuotationDecision, type QuotationItemDecision } from './quotation-steps/QuotationDecision';
import { QuotationInlineDisplay } from './QuotationInlineDisplay';
import { useLocation } from 'react-router-dom';
import s from './MisPedidosPersonalizados.module.css';

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

export type FormValues = z.infer<typeof formSchema>;

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
};

const toUbicacionArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.split(',').map((u) => u.trim()).filter(Boolean);
  return [];
};

const getStatusLabel = (estado: string) => {
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    ACEPTADO: 'Aceptado',
    CANCELADO: 'Cancelado',
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
    VENCIDO: 'Vencido',
  };
  return labels[estado] ?? estado;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

export const MisPedidosPersonalizados: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const location = useLocation();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingEditOrder = useRef<CustomOrder | null>(null);
  const loadedNegotiationRef = useRef<Set<string>>(new Set());

  const [deleteConfirm, setDeleteConfirm] = useState<CustomOrder | null>(null);

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string>('');

  const [rejectConfirm, setRejectConfirm] = useState<CustomOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [quotationDecisionOrder, setQuotationDecisionOrder] = useState<CustomOrder | null>(null);
  const [quotationDecisionLoading, setQuotationDecisionLoading] = useState(false);

  const [uploadPaymentOpen, setUploadPaymentOpen] = useState(false);
  const [uploadPaymentOrderId, setUploadPaymentOrderId] = useState<string | null>(null);

  const [productos, setProductos] = useState<{ id: string; nombre: string; tela?: string; colores?: string[]; tallas?: string[] }[]>([]);
  const [loadingCatalog, setLoadingCatalogState] = useState(false);

  const [negotiationHistory, setNegotiationHistory] = useState<NegotiationMessage[]>([]);
  const [clientResponseMessage, setClientResponseMessage] = useState('');
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  const [clientNegotiationLoading, setClientNegotiationLoading] = useState(false);
  const [clientNegotiationSending, setClientNegotiationSending] = useState(false);

  const [clientNegotiationOpen, setClientNegotiationOpen] = useState(false);
  const [clientNegotiationMessage, setClientNegotiationMessage] = useState('');
  const [clientNegotiationOrderId, setClientNegotiationOrderId] = useState<string | null>(null);

  const [itemReferenceImages, setItemReferenceImages] = useState<Record<number, { files: File[]; urls: string[] }>>({});
  const [personalizacionFiles, setPersonalizacionFiles] = useState<Record<string, { file: File; blobUrl: string }[]>>({});
  const [stepperStep, setStepperStep] = useState(1);
  const [_colorRows, setColorRows] = useState<{ id: number; color: string; cantidad: string }[]>([{ id: Date.now(), color: '', cantidad: '' }]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [editingPersonalizacionIndex, setEditingPersonalizacionIndex] = useState<number | null>(null);
  const [showPersonalizacionForm, setShowPersonalizacionForm] = useState(false);

  useEffect(() => {
    if (location.pathname === '/cliente/cotizaciones/nueva') {
      setEditingId(null);
      setFormOpen(true);
    }
  }, [location.pathname]);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.estado === 'PENDIENTE' || o.estado === 'SOLICITUD_RECIBIDA' || o.estado === 'EN_REVISION').length;
  const quotedOrders = orders.filter(o => o.estado === 'COTIZADO' || o.estado === 'COTIZACION_ACEPTADA').length;
  const productionOrders = orders.filter(o => o.estado === 'EN_PRODUCCION').length;

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors: formErrorsHook }, getValues } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyForm,
    shouldUnregister: false,
  });

  const { fields: itemFields, append: appendItem, remove: removeItem, replace: replaceItems } = useFieldArray({
    control,
    name: 'items',
    shouldUnregister: false,
  });

  const cleanFormValues = (values: FormValues): FormValues => {
    return {
      ...values,
      items: values.items.map((item) => {
        const normalizedDistribucionTallas: Record<string, number | null> = {};
        Object.entries(item.distribucionTallas || {}).forEach(([key, raw]) => {
          if (raw === undefined || raw === null) return;
          const num = typeof raw === 'number' ? raw : Number(raw);
          normalizedDistribucionTallas[key] = Number.isNaN(num) ? null : num;
        });

        const normalizedPersonalizaciones = (item.personalizaciones || [])
          .map((pers) => {
            const normalizedVariantes = (pers.variantes || [])
              .map((v) => ({
                talla: typeof v.talla === 'string' ? v.talla : String(v.talla ?? ''),
                color: typeof v.color === 'string' ? v.color : String(v.color ?? ''),
                cantidad: typeof v.cantidad === 'number' ? v.cantidad : Number(v.cantidad ?? 0),
              }))
              .filter((v) => Number(v.cantidad) > 0);

            return {
              tipo: typeof pers.tipo === 'string' ? pers.tipo : '',
              tecnica: typeof pers.tecnica === 'string' ? pers.tecnica : '',
              ubicacion: Array.isArray(pers.ubicacion) ? pers.ubicacion : [],
              descripcion: typeof pers.descripcion === 'string' ? pers.descripcion : '',
              archivos: Array.isArray(pers.archivos) ? pers.archivos : [],
              variantes: normalizedVariantes,
            };
          })
          .filter((pers) => {
            const hasDesc = !!pers.descripcion && pers.descripcion.trim() !== '';
            const hasUbic = Array.isArray(pers.ubicacion) && pers.ubicacion.length > 0;
            const hasVar = (pers.variantes || []).length > 0;
            return hasDesc || hasUbic || hasVar;
          });

        return {
          ...item,
          descripcion: typeof item.descripcion === 'string' ? item.descripcion : '',
          tipoPersonalizacion: typeof item.tipoPersonalizacion === 'string' ? item.tipoPersonalizacion : '',
          especificaciones: typeof item.especificaciones === 'string' ? item.especificaciones : '',
          cantidad: Object.values(normalizedDistribucionTallas).length > 0
            ? Object.values(normalizedDistribucionTallas).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0)
            : (typeof item.cantidad === 'number' ? item.cantidad : Number(item.cantidad ?? 0)),
          talla: typeof item.talla === 'string' ? item.talla : '',
          color: typeof item.color === 'string' ? item.color : '',
          material: typeof item.material === 'string' ? item.material : '',
          ubicacion: Array.isArray(item.ubicacion) ? item.ubicacion : [],
          distribucionTallas: normalizedDistribucionTallas,
          imagenesReferencia: Array.isArray(item.imagenesReferencia) ? item.imagenesReferencia : [],
          personalizaciones: normalizedPersonalizaciones,
        };
      }),
    };
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onSubmit(e);
  };

  const _ubicacionValues = watch(`items.${activeItemIndex}.ubicacion`) as string[] | undefined;

  const agregarProducto = () => {
    const nextIndex = itemFields.length;
    appendItem({
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
    });
    setActiveItemIndex(nextIndex);
    toast.success('Producto agregado');
  };

  const agregarPersonalizacion = () => {
    const current = watch(`items.${activeItemIndex}.personalizaciones`) as Personalizacion[] || [];
    const newPers = {
      tipo: 'ESTAMPADO',
      tecnica: '',
      ubicacion: [],
      descripcion: '',
      archivos: [],
      variantes: [],
    };
    setValue(`items.${activeItemIndex}.personalizaciones`, [...current, newPers]);
  };

  const eliminarPersonalizacion = (persIndex: number) => {
    const current = watch(`items.${activeItemIndex}.personalizaciones`) as Personalizacion[] || [];
    setValue(`items.${activeItemIndex}.personalizaciones`, current.filter((_, i) => i !== persIndex));
  };

  const actualizarPersonalizacion = (persIndex: number, field: string, value: string | string[]) => {
    const current = watch(`items.${activeItemIndex}.personalizaciones`) as Personalizacion[] || [];
    const updated = current.map((p, i) => i === persIndex ? { ...p, [field]: value } : p);
    setValue(`items.${activeItemIndex}.personalizaciones`, updated);
  };

  const agregarVariante = (persIndex: number) => {
    const current = watch(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`) as Variante[] || [];
    const distribucion = watch(`items.${activeItemIndex}.distribucionTallas`) || {};
    const tallasDisponibles = Object.entries(distribucion)
      .filter(([, cantidad]) => Number(cantidad) > 0)
      .map(([talla]) => talla);

    const primeraTallaDisponible = tallasDisponibles[0] || '';

    setValue(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`, [...current, { talla: primeraTallaDisponible, color: '', cantidad: 1 }]);
  };

  const eliminarVariante = (persIndex: number, varIndex: number) => {
    const current = watch(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`) as Variante[] || [];
    setValue(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`, current.filter((_, i) => i !== varIndex));
  };

  const actualizarVariante = (persIndex: number, varIndex: number, field: string, value: string | number) => {
    const current = watch(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`) as Variante[] || [];
    const updated = current.map((v, i) => i === varIndex ? { ...v, [field]: value } : v);
    setValue(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`, updated);

    if (field === 'cantidad') {
      const distribucion = watch(`items.${activeItemIndex}.distribucionTallas`) || {};
      const variantes = updated;
      const talla = current[varIndex]?.talla;
      if (talla && distribucion[talla] !== undefined) {
        const sumaVariantesTalla = variantes
          .filter((v) => v.talla === talla)
          .reduce((sum, v) => sum + (Number(v.cantidad) || 0), 0);
        const maximo = Number(distribucion[talla]) || 0;
        if (sumaVariantesTalla > maximo) {
           toast.error(`La suma de variantes para ${talla} (${sumaVariantesTalla}) supera la distribución (${maximo}).`);
        }
      }
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customOrdersApi.list({ page, limit: pageSize, search: search || undefined, clienteId: currentUser?.uid });
      setOrders(result.items ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotalItems(result.totalRecords ?? 0);
    } catch (_err) {
      toast.error('Error al cargar tus pedidos personalizados');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, currentUser?.uid]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!editingId) return;
    const fullOrder = pendingEditOrder.current;
    if (!fullOrder) return;

    const nextItems = fullOrder.items.map((item, index) => ({
      id: item.id || `edit-item-${fullOrder.id}-${index}`,
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

    const imagenUrls = nextItems.reduce<Record<number, { files: File[]; urls: string[] }>>((acc, item, idx) => {
      const itemUrls = item.imagenesReferencia || [];
      const persUrls = (item.personalizaciones || [])
        .flatMap((pers) => (Array.isArray(pers.archivos) ? pers.archivos : []))
        .filter((url): url is string => typeof url === 'string' && !!url);
      const allUrls = [...itemUrls, ...persUrls];
      if (allUrls.length > 0) acc[idx] = { files: [], urls: allUrls };
      return acc;
    }, {});

    const payload = {
      clienteNombre: fullOrder.clienteNombre,
      clienteEmail: fullOrder.clienteEmail ?? '',
      clienteTelefono: fullOrder.clienteTelefono ?? '',
      usoFinal: fullOrder.usoFinal ?? '',
      fechaEntregaDeseada: fullOrder.fechaEntregaDeseada ? new Date(fullOrder.fechaEntregaDeseada).toISOString().slice(0, 10) : '',
      notasCliente: fullOrder.notasCliente ?? '',
      notasReferencia: fullOrder.notasReferencia ?? '',
      direccionEntrega: fullOrder.direccionEntrega ?? '',
      items: nextItems,
    };

    reset(payload, { keepDefaultValues: false });
    replaceItems(nextItems);

    nextItems.forEach((item, idx) => {
      setValue(`items.${idx}.distribucionTallas`, item.distribucionTallas || {});
      setValue(`items.${idx}.imagenesReferencia`, item.imagenesReferencia || []);
      setValue(`items.${idx}.ubicacion`, item.ubicacion || []);
      Object.entries(item.distribucionTallas || {}).forEach(([talla, cantidad]) => {
        setValue(`items.${idx}.distribucionTallas.${talla}` as Path<FormValues>, cantidad);
      });
      (item.personalizaciones || []).forEach((pers: Personalizacion, pIdx: number) => {
        setValue(`items.${idx}.personalizaciones.${pIdx}.tipo`, pers.tipo || 'ESTAMPADO');
        setValue(`items.${idx}.personalizaciones.${pIdx}.tecnica`, pers.tecnica || '');
        setValue(`items.${idx}.personalizaciones.${pIdx}.ubicacion`, pers.ubicacion || []);
        setValue(`items.${idx}.personalizaciones.${pIdx}.descripcion`, pers.descripcion || '');
        setValue(`items.${idx}.personalizaciones.${pIdx}.archivos`, pers.archivos || []);
        (pers.variantes || []).forEach((v: Variante, vIdx: number) => {
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.talla`, v.talla || '');
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.color`, v.color || '');
          setValue(`items.${idx}.personalizaciones.${pIdx}.variantes.${vIdx}.cantidad`, Number(v.cantidad) || 0);
        });
      });
    });

    setValue('direccionEntrega', fullOrder.direccionEntrega ?? '');
    setValue('usoFinal', fullOrder.usoFinal ?? '');

    setItemReferenceImages(imagenUrls);
    setPaymentProofFile(null);
    setPaymentProofUrl(fullOrder.paymentProofUrl ?? '');
    setStepperStep(1);
    setActiveItemIndex(0);
    setShowPersonalizacionForm(false);
    setEditingPersonalizacionIndex(null);
    setColorRows([{ id: Date.now(), color: '', cantidad: '' }]);
    setFormOpen(true);
  }, [editingId, reset, replaceItems, setValue, setItemReferenceImages, setPaymentProofFile, setPaymentProofUrl, setStepperStep, setActiveItemIndex, setShowPersonalizacionForm, setEditingPersonalizacionIndex, setColorRows, setFormOpen]);

  useEffect(() => {
    if (!formOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingCatalogState(true);
      try {
        const productosRes = await catalogApi.list({ limit: 100 });
        if (!cancelled) {
          setProductos((productosRes.data ?? []).map(p => ({ id: p.id ?? '', nombre: p.nombre, tela: p.tela, colores: p.colores, tallas: p.tallas })));
        }
      } catch {
        if (!cancelled) {
          setProductos([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalogState(false);
      }
    })();
    return () => { cancelled = true };
  }, [formOpen]);

  useEffect(() => {
    const subscription = watch((value) => {
      const nombre = value.items?.[activeItemIndex]?.productoNombre;
      const descripcion = value.items?.[activeItemIndex]?.descripcion;
      if (nombre && !descripcion) {
        setValue(`items.${activeItemIndex}.descripcion`, nombre, { shouldDirty: false, shouldTouch: false });
      }
    });
    return () => subscription.unsubscribe();
  }, [activeItemIndex, watch, setValue]);

  const openCreate = () => {
    setEditingId(null);
    reset({
      ...emptyForm,
      clienteNombre: currentUser?.name ?? '',
      clienteEmail: currentUser?.email ?? '',
    });
    setPaymentProofFile(null);
    setPaymentProofUrl('');
    setStepperStep(1);
    setColorRows([{ id: Date.now(), color: '', cantidad: '' }]);
    setFormOpen(true);
  };

  const editableStates = ['PENDIENTE', 'SOLICITUD_RECIBIDA', 'EN_REVISION', 'COTIZADO', 'COTIZACION_ACEPTADA'];

  const openEdit = async (order: CustomOrder) => {
    if (!editableStates.includes(order.estado)) {
      toast.error('Solo puedes editar solicitudes en estados iniciales');
      return;
    }
    let fullOrder = order;
    try {
      const fullOrderData = await customOrdersApi.getById(order.id);
      if (fullOrderData) {
        fullOrder = fullOrderData;
      }
    } catch {
      fullOrder = order;
    }
    pendingEditOrder.current = fullOrder;
    setEditingId(fullOrder.id);
  };

  const handleReferenceImageChange = (itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const urls = files.map(f => URL.createObjectURL(f));
    setItemReferenceImages(prev => {
      const newUrls = [...(prev[itemIndex]?.urls || []), ...urls];
      setValue(`items.${itemIndex}.imagenesReferencia` as const, newUrls);
      return {
        ...prev,
        [itemIndex]: {
          files: [...(prev[itemIndex]?.files || []), ...files],
          urls: newUrls,
        }
      };
    });
  };

  const removeReferenceImage = (itemIndex: number, imgIndex: number) => {
    setItemReferenceImages(prev => {
      const current = prev[itemIndex] || { files: [], urls: [] };
      const newUrls = current.urls.filter((_, i) => i !== imgIndex);
      setValue(`items.${itemIndex}.imagenesReferencia` as const, newUrls);
      return {
        ...prev,
        [itemIndex]: {
          files: current.files.filter((_, i) => i !== imgIndex),
          urls: newUrls,
        }
      };
    });
  };

  const eliminarProducto = (idx: number) => {
    if (itemFields.length <= 1) {
      toast.error('Debe haber al menos un producto');
      return;
    }
    const nextLength = itemFields.length - 1;
    removeItem(idx);
    setItemReferenceImages(prev => {
      const next: Record<number, { files: File[]; urls: string[] }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const keyNum = Number(key);
        if (keyNum < idx) {
          next[keyNum] = value;
        } else if (keyNum > idx) {
          next[keyNum - 1] = value;
        }
      });
      return next;
    });
    setActiveItemIndex(prev => {
      if (prev === idx) {
        return Math.min(prev, nextLength - 1);
      }
      if (prev > idx) {
        return prev - 1;
      }
      return prev;
    });
  };

  const onSubmit = handleSubmit(
    async (values) => {
      const cleaned = cleanFormValues(values);
      const onSubmitPayload = { ...cleaned, items: cleaned.items.map((item: FormValues['items'][number], index: number) => ({
        ...item,
        orden: index,
        imagenesReferencia: item.imagenesReferencia || [],
        personalizaciones: (item.personalizaciones || [])
          .filter((pers) => {
            const hasTipo = !!pers.tipo;
            const hasDescripcion = !!pers.descripcion && pers.descripcion.trim() !== '';
            const hasUbicacion = Array.isArray(pers.ubicacion) && pers.ubicacion.length > 0;
            const hasVariantes = (pers.variantes || []).some((v) => Number(v.cantidad) > 0);
            return hasTipo && (hasDescripcion || hasUbicacion || hasVariantes);
          })
          .map((pers: Personalizacion, pIndex: number) => ({
            ...pers,
            orden: pIndex,
            variantes: (pers.variantes || []).map((variante: Variante) => ({
              talla: variante.talla,
              color: variante.color,
              cantidad: Number(variante.cantidad),
            })),
          })),
      })) };

      const validationErrors: string[] = [];
      const validationDetails: string[] = [];

      for (const item of onSubmitPayload.items) {
        const distribucionTotal = Object.values(item.distribucionTallas || {}).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0);

        if (!item.descripcion || !item.descripcion.trim()) {
          validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la descripción del producto es obligatoria.`);
          validationDetails.push(`descripcion vacía para producto ${item.productoNombre || 'sin nombre'}`);
        }
        if (!item.productoNombre || !item.productoNombre.trim()) {
          validationErrors.push(`El producto #${onSubmitPayload.items.indexOf(item) + 1}: el nombre del producto es obligatorio.`);
          validationDetails.push(`productoNombre vacío en índice ${onSubmitPayload.items.indexOf(item)}`);
        }
        if (distribucionTotal <= 0) {
          validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la distribución de prendas debe sumar más de 0.`);
          validationDetails.push(`distribucionTotal=${distribucionTotal}`);
        }

        const totalPersonalizado = (item.personalizaciones || []).reduce((sum: number, pers: Personalizacion) => sum + (pers.variantes || []).reduce((s: number, v: Variante) => s + (Number(v.cantidad) || 0), 0), 0);
        if (totalPersonalizado > distribucionTotal && distribucionTotal > 0) {
          validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la cantidad personalizada (${totalPersonalizado}) supera la cantidad total (${distribucionTotal}).`);
          validationDetails.push(`totalPersonalizado=${totalPersonalizado}, distribucionTotal=${distribucionTotal}`);
        }

        for (const pers of item.personalizaciones || []) {
          if (!pers.descripcion || !pers.descripcion.trim()) {
            validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la descripción de la personalización es obligatoria.`);
            validationDetails.push(`personalizacion descripcion vacía`);
          }
          for (const variante of pers.variantes || []) {
            if (!variante.talla || !variante.color || Number(variante.cantidad) <= 0) {
              validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la variante "${variante.talla || 'sin talla'} / ${variante.color || 'sin color'}" es inválida.`);
              validationDetails.push(`variante inválida: talla=${variante.talla}, color=${variante.color}, cantidad=${variante.cantidad}`);
            }
          }

          const sumaPorTalla: Record<string, number> = {};
          for (const variante of pers.variantes || []) {
            const talla = variante.talla;
            if (!talla) continue;
            sumaPorTalla[talla] = (sumaPorTalla[talla] || 0) + (Number(variante.cantidad) || 0);
          }

          for (const [talla, suma] of Object.entries(sumaPorTalla)) {
            const distribucionTalla = Number(item.distribucionTallas?.[talla]) || 0;
            if (distribucionTalla <= 0) {
              validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": la talla ${talla} tiene variantes pero su distribución es 0. Elimina o reduce las variantes de ${talla}.`);
              validationDetails.push(`talla=${talla}, distribucion=0, sumaVariantes=${suma}`);
            } else if (suma !== distribucionTalla) {
              if (suma > distribucionTalla) {
                validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": ${talla} tiene ${suma} prendas asignadas en variantes, pero la distribución es de ${distribucionTalla}. Reduce ${suma - distribucionTalla} prendas.`);
                validationDetails.push(`talla=${talla}, sumaVariantes=${suma}, distribucion=${distribucionTalla}`);
              } else {
                validationErrors.push(`Producto "${item.productoNombre || 'sin nombre'}": debes distribuir las ${distribucionTalla} unidades de talla ${talla}. Actualmente has asignado ${suma}.`);
                validationDetails.push(`talla=${talla}, sumaVariantes=${suma}, distribucion=${distribucionTalla}`);
              }
            }
          }
        }
      }

      if (validationErrors.length > 0) {
        toast.error('Errores de validación', { description: validationErrors.join('\n') });
        return;
      }

      const isBlobUrl = (url: string | undefined) => typeof url === 'string' && url.startsWith('blob:');

      const basePayload = {
        clienteId: currentUser?.uid,
        clienteNombre: cleaned.clienteNombre,
        clienteEmail: cleaned.clienteEmail || undefined,
        clienteTelefono: cleaned.clienteTelefono || undefined,
        direccionEntrega: cleaned.direccionEntrega || undefined,
        notasReferencia: cleaned.notasReferencia || undefined,
        descripcionGeneral: cleaned.items[0]?.descripcion || undefined,
        usoFinal: cleaned.usoFinal || undefined,
        fechaEntregaDeseada: cleaned.fechaEntregaDeseada ? new Date(cleaned.fechaEntregaDeseada).toISOString() : undefined,
        notasCliente: cleaned.notasCliente || undefined,
        items: cleaned.items.map((item: FormValues['items'][number], index: number) => ({
          productoId: item.productoId || undefined,
          productoNombre: item.productoNombre || undefined,
          descripcion: item.descripcion || '',
           tipoPersonalizacion: item.tipoPersonalizacion || '',
           especificaciones: item.especificaciones || undefined,
           cantidad: Object.values(item.distribucionTallas || {}).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0),
          talla: item.talla || undefined,
          color: item.color || undefined,
          material: item.material || undefined,
          ubicacion: item.ubicacion || undefined,
          distribucionTallas: Object.fromEntries(
            Object.entries(item.distribucionTallas || {}).filter(([, v]) => v !== undefined && v !== null)
          ) as Record<string, number> | undefined,
          imagenesReferencia: (item.imagenesReferencia || []).filter((url) => !isBlobUrl(url)),
          orden: index,
          personalizaciones: (item.personalizaciones || []).map((pers: Personalizacion, pIndex: number) => ({
            tipo: pers.tipo || '',
            tecnica: pers.tecnica || undefined,
            ubicacion: pers.ubicacion || undefined,
            descripcion: pers.descripcion || '',
            archivos: (pers.archivos || []).filter((url: string) => !isBlobUrl(url)),
            orden: pIndex,
            variantes: (pers.variantes || []).map((variante: Variante) => ({
              talla: variante.talla || '',
              color: variante.color || '',
              cantidad: Number(variante.cantidad),
            })),
          })),
        })),
      };

      setSaving(true);
      try {
        let orderId = editingId;
        const safePaymentProofUrl = (paymentProofUrl && !paymentProofUrl.startsWith('blob:')) ? paymentProofUrl : undefined;
        if (editingId) {
          await customOrdersApi.clientUpdate(editingId, { ...basePayload, paymentProofUrl: safePaymentProofUrl });
          toast.success('Solicitud actualizada');
        } else {
          const created = await customOrdersApi.create({ ...basePayload, paymentProofUrl: safePaymentProofUrl });
          orderId = created.id;
          toast.success('Solicitud creada');
        }

        const allBlobFiles: File[] = [];
        const blobUrlToFile = new Map<string, File>();
        cleaned.items.forEach((item, itemIdx) => {
          (item.imagenesReferencia || []).forEach((url, urlIdx) => {
            if (isBlobUrl(url)) {
              const file = itemReferenceImages[itemIdx]?.files[urlIdx];
              if (file) {
                allBlobFiles.push(file);
                blobUrlToFile.set(url, file);
              }
            }
          });
          (item.personalizaciones || []).forEach((pers, persIdx) => {
            const key = `${itemIdx}-${persIdx}`;
            (pers.archivos || []).forEach((url) => {
              if (isBlobUrl(url)) {
                const entry = personalizacionFiles[key]?.find((e) => e.blobUrl === url);
                if (entry) {
                  allBlobFiles.push(entry.file);
                  blobUrlToFile.set(url, entry.file);
                }
              }
            });
          });
        });

        if (orderId && allBlobFiles.length > 0) {
          const uploadedUrls = await Promise.all(allBlobFiles.map((file) => customOrdersApi.uploadReferenceImage(orderId, file)));
          const uploaded = uploadedUrls.map((r) => r.url);

          const blobUrlToUploaded = new Map<string, string>();
          let uploadIdx = 0;
          blobUrlToFile.forEach((file, url) => {
            if (uploadIdx < uploaded.length) {
              blobUrlToUploaded.set(url, uploaded[uploadIdx++]);
            }
          });

          const updatedItems = cleaned.items.map((item, itemIdx) => {
            const itemPublicRefs: string[] = [];
            (item.imagenesReferencia || []).forEach((url) => {
              if (isBlobUrl(url) && blobUrlToUploaded.has(url)) {
                itemPublicRefs.push(blobUrlToUploaded.get(url)!);
              } else {
                itemPublicRefs.push(url);
              }
            });

            const publicPers = (item.personalizaciones || []).map((pers, _persIdx) => {
              const publicArchivos: string[] = [];
              (pers.archivos || []).forEach((url) => {
                if (isBlobUrl(url) && blobUrlToUploaded.has(url)) {
                  publicArchivos.push(blobUrlToUploaded.get(url)!);
                } else {
                  publicArchivos.push(url);
                }
              });
              return {
                ...pers,
                tipo: pers.tipo || '',
                descripcion: pers.descripcion || '',
                archivos: publicArchivos,
                variantes: (pers.variantes || []).map((variante: Variante) => ({
                  talla: variante.talla || '',
                  color: variante.color || '',
                  cantidad: Number(variante.cantidad),
                })),
              };
            });

            return {
              productoId: item.productoId,
              productoNombre: item.productoNombre,
              descripcion: item.descripcion || '',
              tipoPersonalizacion: item.tipoPersonalizacion || '',
              especificaciones: item.especificaciones || undefined,
              cantidad: Number(item.cantidad),
              talla: item.talla || undefined,
              color: item.color || undefined,
              material: item.material || undefined,
              ubicacion: item.ubicacion || undefined,
              distribucionTallas: Object.fromEntries(
                Object.entries(item.distribucionTallas || {}).filter(([, v]) => v !== undefined && v !== null)
              ) as Record<string, number> | undefined,
              imagenesReferencia: itemPublicRefs,
              orden: itemIdx,
              personalizaciones: publicPers,
            };
          });

          await customOrdersApi.clientUpdate(orderId, { items: updatedItems });
        }

        if (orderId && paymentProofFile) {
          try {
            const result = await customOrdersApi.uploadPaymentProof(orderId, paymentProofFile);
            await customOrdersApi.updatePayment(orderId, { paymentProofUrl: result.paymentProofUrl });
          } catch {
            toast.error('Error al subir comprobante de pago');
          }
        }

        if (!editingId) {
          window.location.replace('/cliente/pedidos-personalizados');
          return;
        }
        setFormOpen(false);
        void loadOrders();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al guardar solicitud';
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    (errors) => {
      const _values = getValues();
      toast.error('Errores de validación', {
        description: Object.entries(errors)
          .map(([key, value]) => {
            const val = value as FieldError | FieldError[] | undefined;
            if (val && !Array.isArray(val) && val.message) return `${key}: ${val.message}`;
            if (Array.isArray(val)) return `${key}: ${val.map((v) => v?.message || 'Campo inválido').join(', ')}`;
            return `${key}: Campo inválido`;
          })
          .join('\n')
      });
    }
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await customOrdersApi.remove(deleteConfirm.id);
      toast.success('Solicitud eliminada');
      setDeleteConfirm(null);
      void loadOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la solicitud';
      toast.error(message);
    }
  };

  const submitOrder = async (order: CustomOrder) => {
    try {
      await customOrdersApi.submit(order.id);
      toast.success('Solicitud enviada a revisión');
      void loadOrders();
    } catch {
      toast.error('Error al enviar solicitud');
    }
  };

  const _acceptQuotation = async (order: CustomOrder) => {
    try {
      await customOrdersApi.acceptQuotation(order.id);
      toast.success('Cotización aceptada. Ahora puedes realizar el pago del anticipo.');
      void loadOrders();
    } catch {
      toast.error('Error al aceptar cotización');
    }
  };

  const _rejectQuotation = async (order: CustomOrder) => {
    setRejectConfirm(order);
    setRejectReason('');
  };

  const confirmRejectQuotation = async () => {
    if (!rejectConfirm || !rejectReason.trim()) {
      toast.error('Debes ingresar un motivo de rechazo');
      return;
    }
    try {
      await customOrdersApi.rejectQuotation(rejectConfirm.id, rejectReason.trim());
      toast.success('Cotización rechazada');
      setRejectConfirm(null);
      setRejectReason('');
      void loadOrders();
    } catch {
      toast.error('Error al rechazar cotización');
    }
  };

  const openQuotationDecision = (order: CustomOrder) => {
    setQuotationDecisionOrder(order);
  };

  const handleConfirmQuotationSelection = async (decisions: QuotationItemDecision[]) => {
    const order = quotationDecisionOrder;
    if (!order) return;
    setQuotationDecisionLoading(true);
    try {
      const acceptedItems = decisions.filter(d => d.status === 'ACEPTADO');
      const rejectedItems = decisions.filter(d => d.status === 'RECHAZADO');

      if (acceptedItems.length === decisions.length) {
        await customOrdersApi.acceptQuotation(quotationDecisionOrder.id);
        toast.success('Cotización aceptada. Ahora puedes realizar el pago del anticipo.');
      } else if (rejectedItems.length === decisions.length) {
        const rejectReason = rejectedItems
          .map(item => `${item.descripcion}: ${item.rejectReason ?? 'Sin motivo'}${item.rejectComment ? ` - ${item.rejectComment}` : ''}`)
          .join('; ');
        await customOrdersApi.rejectQuotation(quotationDecisionOrder.id, rejectReason);
        toast.success('Cotización rechazada');
      } else {
        const acceptedIds = acceptedItems.map(i => i.detalleId);
        const _rejectedInfo = rejectedItems
          .map(item => `${item.descripcion} (motivo: ${item.rejectReason ?? 'Sin motivo'})`)
          .join(', ');
        await customOrdersApi.acceptQuotationWithDecisions(quotationDecisionOrder.id, {
          acceptedIds,
          rejectedItems: rejectedItems.map(i => ({
            detalleId: i.detalleId,
            reason: i.rejectReason ?? 'OTRO',
            comment: i.rejectComment,
          })),
        });
        toast.success(`Selección confirmada. Productos aceptados: ${acceptedItems.length}. Rechazados: ${rejectedItems.length}.`);
      }

      setQuotationDecisionOrder(null);
      void loadOrders();
    } catch {
      toast.error('Error al confirmar selección');
    } finally {
      setQuotationDecisionLoading(false);
    }
  };

  const loadClientNegotiationHistory = async (orderId: string) => {
    setClientNegotiationLoading(true);
    try {
      const history = await customOrdersApi.getNegotiationHistory(orderId);
      setNegotiationHistory(history);
    } catch {
      setNegotiationHistory([]);
    } finally {
      setClientNegotiationLoading(false);
    }
  };

  const handleClientAcceptProposal = async (orderId: string, negotiationId: string) => {
    try {
      await customOrdersApi.acceptNegotiationProposal(orderId, negotiationId);
      toast.success('Propuesta aceptada');
      setRespondingToId(null);
      setClientResponseMessage('');
      await loadClientNegotiationHistory(orderId);
      void loadOrders();
    } catch {
      toast.error('Error al aceptar propuesta');
    }
  };

  const handleClientRejectProposal = async (orderId: string, negotiationId: string) => {
    try {
      await customOrdersApi.rejectNegotiationProposal(orderId, negotiationId);
      toast.success('Propuesta rechazada');
      setRespondingToId(null);
      setClientResponseMessage('');
      await loadClientNegotiationHistory(orderId);
      void loadOrders();
    } catch {
      toast.error('Error al rechazar propuesta');
    }
  };

  const handleClientRespond = async (orderId: string, parentId: string, message: string) => {
    if (!message.trim()) {
      toast.error('Ingresa un mensaje de respuesta');
      return;
    }
    setClientNegotiationSending(true);
    try {
      await customOrdersApi.respondToNegotiation(orderId, message, undefined, parentId);
      toast.success('Respuesta enviada');
      setRespondingToId(null);
      setClientResponseMessage('');
      await loadClientNegotiationHistory(orderId);
      void loadOrders();
    } catch {
      toast.error('Error al responder');
    } finally {
      setClientNegotiationSending(false);
    }
  };

  const getClientNegotiationCounts = () => {
    const clientRounds = negotiationHistory.filter(m => m.authorRole === 'cliente').length;
    const adminRounds = negotiationHistory.filter(m => m.authorRole === 'admin' || m.authorRole === 'asesor').length;
    return { clientRounds, adminRounds, clientRemaining: 3 - clientRounds, adminRemaining: 3 - adminRounds };
  };

  const openClientNegotiation = (orderId: string) => {
    setClientNegotiationOrderId(orderId);
    setClientNegotiationMessage('');
    setClientNegotiationOpen(true);
  };

  const startClientNegotiation = async () => {
    if (!clientNegotiationOrderId || !clientNegotiationMessage.trim()) {
      toast.error('Ingresa un mensaje para la negociación');
      return;
    }
    const counts = getClientNegotiationCounts();
    if (counts.clientRemaining <= 0) {
      toast.error('Has alcanzado el límite de negociaciones');
      return;
    }
    setClientNegotiationSending(true);
    try {
      await customOrdersApi.startNegotiation(clientNegotiationOrderId, clientNegotiationMessage.trim());
      toast.success('Negociación iniciada');
      setClientNegotiationOpen(false);
      setClientNegotiationMessage('');
      await loadClientNegotiationHistory(clientNegotiationOrderId);
      void loadOrders();
    } catch {
      toast.error('Error al iniciar negociación');
    } finally {
      setClientNegotiationSending(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'numeroSolicitud',
      header: 'Solicitud',
      render: (row: CustomOrder) => (
        <span className={s.tdMono + ' ' + s.tdPrimary}>{row.numeroSolicitud}</span>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (row: CustomOrder) => (
        <div className={s.clientCell}>
          <span className={s.clientName}>{row.clienteNombre || '-'}</span>
        </div>
      ),
    },
    {
      key: 'clienteEmail',
      header: 'Correo electrónico',
      render: (row: CustomOrder) => (
        <span className={s.tdEmail}>{row.clienteEmail || '-'}</span>
      ),
    },
    {
      key: 'clienteTelefono',
      header: 'Teléfono',
      render: (row: CustomOrder) => (
        <span className={s.tdMono}>{row.clienteTelefono || '-'}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row: CustomOrder) => <StatusBadge status={row.estado} label={getStatusLabel(row.estado)} />,
    },
    {
      key: 'updatedAt',
      header: 'Actualizado',
      render: (row: CustomOrder) => (
        <span className={s.tdMono}>{new Date(row.updatedAt).toLocaleDateString('es-CO')}</span>
      ),
    },
  ], []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => o.numeroSolicitud.toLowerCase().includes(q));
  }, [orders, search]);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
           <h1 className={s.pageTitle}>Mis Cotizaciones</h1>
          <p className={s.pageSubtitle}>Gestiona tus solicitudes, cotizaciones y envíos</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2" data-testid="new-custom-order">
          <Plus size={18} />
          <span>Nueva solicitud</span>
        </Button>
      </div>

      <div className={s.metricsRow}>
        <div className={`${s.metricCard} ${s.metricCardPrimary}`}>
          <span className={`${s.metricIcon} ${s.metricIconPending}`}>
            <FileText size={24} />
          </span>
          <div className={s.metricBody}>
            <span className={s.metricValue}>{totalOrders}</span>
            <span className={s.metricLabel}>Total</span>
          </div>
        </div>
        <div className={`${s.metricCard} ${s.metricCardWarning}`}>
          <span className={`${s.metricIcon} ${s.metricIconWarning}`}>
            <Eye size={24} />
          </span>
          <div className={s.metricBody}>
            <span className={s.metricValue}>{pendingOrders}</span>
            <span className={s.metricLabel}>Pendientes</span>
          </div>
        </div>
        <div className={`${s.metricCard} ${s.metricCardSuccess}`}>
          <span className={`${s.metricIcon} ${s.metricIconDone}`}>
            <CheckCircle size={24} />
          </span>
          <div className={s.metricBody}>
            <span className={s.metricValue}>{quotedOrders}</span>
            <span className={s.metricLabel}>Cotizados</span>
          </div>
        </div>
        <div className={`${s.metricCard} ${s.metricCardPrimary}`}>
          <span className={`${s.metricIcon} ${s.metricIconReceived}`}>
            <RefreshCcw size={24} />
          </span>
          <div className={s.metricBody}>
            <span className={s.metricValue}>{productionOrders}</span>
            <span className={s.metricLabel}>En producción</span>
          </div>
        </div>
      </div>

      <div className={s.tableWrapper}>
        <div className={s.filters}>
          <div className={s.searchBox}>
            <span className={s.searchIcon}>
              <Eye size={16} />
            </span>
            <SearchInput
              className={s.searchInput}
              placeholder="Buscar por número de solicitud..."
              value={search}
              onSearch={setSearch}
              onChange={(e) => setSearch(e.target.value)}
              debounceMs={100}
              minChars={0}
            />
          </div>
          <Button onClick={loadOrders} disabled={loading} variant="secondary">
            <RefreshCcw size={16} className="mr-2" />
            Actualizar
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={loading ? 'Cargando...' : 'No tienes pedidos personalizados'}
          enableRowSelection={false}
          maxVisibleColumns={10}
          serverMode
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
          detailPanel={{
            title: (row) => `Solicitud ${row.numeroSolicitud}`,
            render: (row, onClose) => {
              const summaryData: CustomOrderSummaryData = {
                clienteNombre: row.clienteNombre,
                clienteEmail: row.clienteEmail ?? undefined,
                clienteTelefono: row.clienteTelefono ?? undefined,
                descripcionGeneral: row.descripcionGeneral ?? undefined,
                notasReferencia: row.notasReferencia ?? undefined,
                estado: getStatusLabel(row.estado),
                items: (row.items || []).map((item) => ({
                  id: item.id,
                  productoNombre: item.productoNombre,
                  descripcion: item.descripcion,
                  tipoPersonalizacion: item.tipoPersonalizacion,
                  cantidad: item.distribucionTallas
                    ? Object.values(item.distribucionTallas).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0)
                    : item.cantidad ?? 0,
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
                fechaEntregaDeseada: row.fechaEntregaDeseada ?? undefined,
                usoFinal: row.usoFinal ?? undefined,
                direccionEntrega: row.direccionEntrega ?? undefined,
                notasCliente: row.notasCliente ?? undefined,
                paymentStatus: row.paymentStatus ?? undefined,
                paymentProofUrl: row.paymentProofUrl ?? undefined,
                paymentProofOrderId: row.id,
                paymentKey: row.paymentKey ?? undefined,
                anticipoPagado: row.anticipoPagado ?? undefined,
              };

              return (
                <div className={s.form}>
                  {row.cotizacion && (() => {
                    if (row.cotizacion.estado === 'RECHAZADA' || row.cotizacion.estado === 'COTIZADO') {
                      if (!loadedNegotiationRef.current.has(row.id)) {
                        loadedNegotiationRef.current.add(row.id);
                        loadClientNegotiationHistory(row.id);
                      }
                    }

                    const isPendingReview = row.cotizacion.estado === 'COTIZADO' || row.cotizacion.estado === 'ENVIADA';
                    if (isPendingReview) {
                      openQuotationDecision(row);
                    }

                    return (
                      <>
                        <QuotationInlineDisplay
                          order={row}
                          style={{ marginBottom: '16px' }}
                        />

                        {isPendingReview && (
                          <div style={{ marginTop: '20px' }}>
                            <QuotationDecision
                              quotationId={row.cotizacion.id}
                              numeroCotizacion={row.cotizacion.numeroCotizacion}
                              numeroSolicitud={row.numeroSolicitud}
                              estado={row.cotizacion.estado}
                              fechaEmision={row.cotizacion.enviadaEn ?? row.createdAt}
                              validaHasta={row.cotizacion.validaHasta ?? undefined}
                              condicionesPago={row.cotizacion.condicionesPago ?? undefined}
                              observaciones={row.cotizacion.observaciones ?? undefined}
                              subtotal={Number(row.cotizacion.subtotal)}
                              descuento={Number(row.cotizacion.descuento)}
                              impuestos={Number(row.cotizacion.impuestos)}
                              total={Number(row.cotizacion.total)}
                              items={row.cotizacion.detalles.map((detalle) => ({
                                detalleId: detalle.id,
                                customOrderItemId: detalle.customOrderItemId,
                                descripcion: detalle.descripcion,
                                tipo: detalle.tipo,
                                cantidad: Number(detalle.cantidad),
                                precioUnitario: Number(detalle.precioUnitario),
                                subtotal: Number(detalle.subtotal),
                                status: 'PENDIENTE' as const,
                              }))}
                              productoNombres={row.productoNombres ?? undefined}
                              onConfirmSelection={handleConfirmQuotationSelection}
                              onCancel={() => {}}
                              loading={quotationDecisionLoading}
                            />
                          </div>
                        )}

                        {row.cotizacion.estado === 'RECHAZADA' && (
                          <div style={{ marginTop: '16px' }}>
                            {clientNegotiationLoading ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                Cargando negociaciones...
                              </div>
                            ) : (
                              <>
                                {negotiationHistory.length > 0 && (
                                  <div style={{ marginBottom: '16px' }}>
                                    <div className={s.negotiationSectionTitle}>Historial de negociaciones</div>
                                    {negotiationHistory.map((entry) => {
                                      const isAdmin = entry.authorRole === 'admin' || entry.authorRole === 'asesor';
                                      const isPending = entry.status === 'PENDING' || entry.status === 'pending';
                                      const counts = getClientNegotiationCounts();
                                      const cot = row.cotizacion!;
                                      return (
                                        <div key={entry.id} className={s.negotiationMessage}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <strong style={{ fontSize: '0.85rem' }}>
                                              {isAdmin ? 'Asesor/Admin' : 'Tú'} - Ronda {entry.round}
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                              {new Date(entry.created_at).toLocaleDateString('es-CO')}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: entry.proposalData ? '8px' : '0' }}>
                                            {entry.message}
                                          </div>
                                          {entry.proposalData && (
                                            <div className={s.negotiationProposal}>
                                              <div className={s.negotiationProposalOld}>
                                                <div className={s.negotiationSectionTitle}>Valores actuales</div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Subtotal</span>
                                                  <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.subtotal))}</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Total</span>
                                                  <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.total))}</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Condiciones</span>
                                                  <span className={s.negotiationDiffValue}>{cot.condicionesPago ?? '-'}</span>
                                                </div>
                                              </div>
                                              <div className={s.negotiationProposalNew}>
                                                <div className={s.negotiationSectionTitle}>Propuesta</div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Subtotal</span>
                                                  <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{formatCurrency(Number(entry.proposalData.subtotal))}</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Total</span>
                                                  <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{formatCurrency(Number(entry.proposalData.total))}</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Condiciones</span>
                                                  <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.condicionesPago ?? '-'}</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>% Anticipo</span>
                                                  <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.porcentajeAnticipo ?? '-'}%</span>
                                                </div>
                                                <div className={s.negotiationDiffRow}>
                                                  <span className={s.negotiationDiffLabel}>Tiempo estimado</span>
                                                   <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.tiempoEstimadoDias ?? '-'} días</span>
                                                </div>
                                              </div>
                                              {isAdmin && isPending && (
                                                <div className={s.negotiationActions}>
                                                  <Button size="sm" onClick={() => handleClientAcceptProposal(row.id, entry.id)}>
                                                    Aceptar propuesta
                                                  </Button>
                                                  <Button size="sm" variant="danger" onClick={() => handleClientRejectProposal(row.id, entry.id)}>
                                                    Rechazar propuesta
                                                  </Button>
                                                  {counts.clientRemaining > 0 && respondingToId !== entry.id && (
                                                    <Button size="sm" variant="outline" onClick={() => setRespondingToId(entry.id)}>
                                                      Responder
                                                    </Button>
                                                  )}
                                                </div>
                                              )}
                                              {respondingToId === entry.id && counts.clientRemaining > 0 && (
                                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                  <textarea
                                                    className={s.negotiationTextarea}
                                                    rows={2}
                                                    placeholder="Escribe tu respuesta..."
                                                    value={clientResponseMessage}
                                                    onChange={(e) => setClientResponseMessage(e.target.value)}
                                                  />
                                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <Button size="sm" variant="secondary" onClick={() => { setRespondingToId(null); setClientResponseMessage(''); }}>
                                                      Cancelar
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleClientRespond(row.id, entry.id, clientResponseMessage)} disabled={clientNegotiationSending || !clientResponseMessage.trim()}>
                                                      {clientNegotiationSending ? 'Enviando...' : 'Enviar respuesta'}
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {negotiationHistory.length === 0 && (
                                      <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                         No hay negociaciones aún
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <CustomOrderSummary data={summaryData} styles={s} />

                  {row.cotizacion && row.cotizacion.estado === 'RECHAZADA' && (
                    <div style={{ marginTop: '16px' }}>
                      {clientNegotiationLoading ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                          Cargando negociaciones...
                        </div>
                      ) : (
                        <>
                          {negotiationHistory.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div className={s.negotiationSectionTitle}>Historial de negociaciones</div>
                              {negotiationHistory.map((entry) => {
                                const isAdmin = entry.authorRole === 'admin' || entry.authorRole === 'asesor';
                                const isPending = entry.status === 'PENDING' || entry.status === 'pending';
                                const counts = getClientNegotiationCounts();
                                const cot = row.cotizacion!;
                                return (
                                  <div key={entry.id} className={s.negotiationMessage}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                      <strong style={{ fontSize: '0.85rem' }}>
                                        {isAdmin ? 'Asesor/Admin' : 'Tú'} - Ronda {entry.round}
                                      </strong>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        {new Date(entry.created_at).toLocaleDateString('es-CO')}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: entry.proposalData ? '8px' : '0' }}>
                                      {entry.message}
                                    </div>
                                    {entry.proposalData && (
                                      <div className={s.negotiationProposal}>
                                        <div className={s.negotiationProposalOld}>
                                          <div className={s.negotiationSectionTitle}>Valores actuales</div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Subtotal</span>
                                            <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.subtotal))}</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Total</span>
                                            <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.total))}</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Condiciones</span>
                                            <span className={s.negotiationDiffValue}>{cot.condicionesPago ?? '-'}</span>
                                          </div>
                                        </div>
                                        <div className={s.negotiationProposalNew}>
                                          <div className={s.negotiationSectionTitle}>Propuesta</div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Subtotal</span>
                                            <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{formatCurrency(Number(entry.proposalData.subtotal))}</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Total</span>
                                            <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{formatCurrency(Number(entry.proposalData.total))}</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Condiciones</span>
                                            <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.condicionesPago ?? '-'}</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>% Anticipo</span>
                                            <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.porcentajeAnticipo ?? '-'}%</span>
                                          </div>
                                          <div className={s.negotiationDiffRow}>
                                            <span className={s.negotiationDiffLabel}>Tiempo estimado</span>
                                             <span className={`${s.negotiationDiffValue} ${s.negotiationDiffNew}`}>{entry.proposalData.tiempoEstimadoDias ?? '-'} días</span>
                                          </div>
                                        </div>
                                        {isAdmin && isPending && (
                                          <div className={s.negotiationActions}>
                                            <Button size="sm" onClick={() => handleClientAcceptProposal(row.id, entry.id)}>
                                              Aceptar propuesta
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => handleClientRejectProposal(row.id, entry.id)}>
                                              Rechazar propuesta
                                            </Button>
                                            {counts.clientRemaining > 0 && respondingToId !== entry.id && (
                                              <Button size="sm" variant="outline" onClick={() => setRespondingToId(entry.id)}>
                                                Responder
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                        {respondingToId === entry.id && counts.clientRemaining > 0 && (
                                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <textarea
                                              className={s.negotiationTextarea}
                                              rows={2}
                                              placeholder="Escribe tu respuesta..."
                                              value={clientResponseMessage}
                                              onChange={(e) => setClientResponseMessage(e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                              <Button size="sm" variant="secondary" onClick={() => { setRespondingToId(null); setClientResponseMessage(''); }}>
                                                Cancelar
                                              </Button>
                                              <Button size="sm" onClick={() => handleClientRespond(row.id, entry.id, clientResponseMessage)} disabled={clientNegotiationSending || !clientResponseMessage.trim()}>
                                                {clientNegotiationSending ? 'Enviando...' : 'Enviar respuesta'}
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {negotiationHistory.length === 0 && (
                                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                   No hay negociaciones aún
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <ModalFooter
                    actions={[
                      { label: 'Cerrar', variant: 'secondary', onClick: onClose },
                      ...(row.estado === 'PENDIENTE' || row.estado === 'SOLICITUD_RECIBIDA'
                        ? [{ label: 'Enviar a revisión', onClick: () => submitOrder(row) } as ModalFooterAction]
                        : []),
                      ...(row.cotizacion?.estado === 'RECHAZADA' && getClientNegotiationCounts().clientRemaining > 0
                        ? [{ label: 'Negociar', onClick: () => openClientNegotiation(row.id) } as ModalFooterAction]
                        : []),
                      ...(row.estado === 'PAGO_PENDIENTE' && !row.anticipoPagado
                        ? [{ label: 'Subir comprobante', onClick: () => { setUploadPaymentOrderId(row.id); setPaymentProofFile(null); setPaymentProofUrl(row.paymentProofUrl ?? ''); setUploadPaymentOpen(true); } } as ModalFooterAction]
                        : []),
                    ]}
                  />
                </div>
              );
            },
          }}
          actions={(row) => [
            ...(editableStates.includes(row.estado)
              ? [{ label: 'Editar', icon: <Edit3 size={14} />, onClick: () => { openEdit(row); } }]
              : []),
            { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(row), danger: true },
          ]}
        />
      </div>

      <CustomOrderFormModal
        key={editingId || 'new'}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
          setStepperStep(1);
          reset({
            ...emptyForm,
            clienteNombre: currentUser?.name ?? '',
            clienteEmail: currentUser?.email ?? '',
          });
        }}
        title={editingId ? 'Editar solicitud' : 'Solicitar cotización'}
        step={stepperStep}
        steps={['Cliente', 'Producto y personalización', 'Entrega', 'Resumen']}
        onStepChange={(newStep) => {
          if (stepperStep === 1 && !formErrorsHook.clienteNombre) {
            setStepperStep(newStep);
          } else if (stepperStep === 2) {
            setStepperStep(newStep);
          } else if (stepperStep === 3) {
            setStepperStep(newStep);
          } else if (stepperStep === 4) {
            setStepperStep(newStep);
          }
        }}
        onBack={() => setStepperStep(prev => prev - 1)}
        onSubmit={handleFormSubmit}
        saving={saving}
        isEditing={!!editingId}
      >
        <form onSubmit={handleFormSubmit} className={s.form}>
          {stepperStep === 1 && (
            <ClientStep
              register={register}
              errors={formErrorsHook}
              styles={s}
            />
          )}

            {stepperStep === 2 && control && (
              <ProductStep
                register={register}
                errors={formErrorsHook}
                watch={watch}
                setValue={setValue}
                styles={s}
                control={control}
                itemFields={itemFields}
                activeItemIndex={activeItemIndex}
                setActiveItemIndex={setActiveItemIndex}
                editingPersonalizacionIndex={editingPersonalizacionIndex}
                setEditingPersonalizacionIndex={setEditingPersonalizacionIndex}
                showPersonalizacionForm={showPersonalizacionForm}
                setShowPersonalizacionForm={setShowPersonalizacionForm}
                productos={productos}
                agregarProducto={agregarProducto}
                agregarPersonalizacion={agregarPersonalizacion}
                actualizarPersonalizacion={actualizarPersonalizacion}
                 agregarVariante={agregarVariante}
                 eliminarVariante={eliminarVariante}
                 actualizarVariante={actualizarVariante}
                 eliminarPersonalizacion={eliminarPersonalizacion}
                eliminarProducto={eliminarProducto}
                 loadingCatalog={loadingCatalog}
                 personalizacionFiles={personalizacionFiles}
                 setPersonalizacionFiles={setPersonalizacionFiles}
                 imagenesReferencia={itemReferenceImages[activeItemIndex]?.urls || []}
                  handleReferenceImageChange={handleReferenceImageChange}
                  removeReferenceImage={removeReferenceImage}
                />
            )}

            {stepperStep === 3 && (
              <DeliveryStep
                register={register}
                styles={s}
                direccionEntrega={watch('direccionEntrega') || ''}
              />
            )}

            {stepperStep === 4 && (
              <SummaryStep
                watch={watch}
                styles={s}
                onEditClient={() => setStepperStep(1)}
                onEditProducts={() => setStepperStep(2)}
                onEditDelivery={() => setStepperStep(3)}
              />
            )}
        </form>
      </CustomOrderFormModal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar solicitud"
        description={`¿Estás seguro de que deseas eliminar la solicitud "${deleteConfirm?.numeroSolicitud}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      <Modal open={!!rejectConfirm} onClose={() => { setRejectConfirm(null); setRejectReason(''); }} title="Rechazar cotización" description="Indica el motivo del rechazo. Esta acción no se puede deshacer." size="md" variant="form">
        {rejectConfirm && (
          <div className={s.form}>
            <div className={s.registroInfo}>
              <div className={s.formRow}>
                <div className={s.field}>
                  <span className={s.label}>Solicitud</span>
                  <span className={s.infoValue}>{rejectConfirm.numeroSolicitud}</span>
                </div>
                <div className={s.field}>
                  <span className={s.label}>Cliente</span>
                  <span className={s.infoValue}>{rejectConfirm.clienteNombre}</span>
                </div>
              </div>
            </div>
            <div className={s.field}>
              <label htmlFor="reject-reason" className={s.label}>Motivo del rechazo <span className={s.labelRequired}>*</span></label>
              <textarea
                id="reject-reason"
                className={s.textarea}
                rows={3}
                placeholder="Explica por qué rechazas esta cotización..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <ModalFooter
              actions={[
                { label: 'Cancelar', variant: 'secondary', onClick: () => { setRejectConfirm(null); setRejectReason(''); } },
                { label: 'Rechazar cotización', variant: 'danger', onClick: confirmRejectQuotation, disabled: !rejectReason.trim() },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal open={uploadPaymentOpen} onClose={() => setUploadPaymentOpen(false)} title="Realizar pago" description="Completa el pago y adjunta tu comprobante." size="md" variant="form">
        {uploadPaymentOrderId && (() => {
          const order = orders.find(o => o.id === uploadPaymentOrderId);
          const totalPagar = order?.cotizacion?.valorAnticipo ? Number(order.cotizacion.valorAnticipo) : (order?.cotizacion?.total ? Number(order.cotizacion.total) : 0);
          return (
            <div className={s.form}>
              <div className={s.paymentTotalBlock}>
                <div className={s.paymentTotalLabel}>TOTAL A PAGAR</div>
                <div className={s.paymentTotalValue}>{totalPagar.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</div>
              </div>
              <div className={s.paymentQrBlock}>
                <BankingQrCode amount={totalPagar} />
              </div>
              <div className={s.paymentField}>
                <label htmlFor="payment-proof-upload" className={s.paymentLabel}>Comprobante (JPG, PNG, PDF)</label>
                <input id="payment-proof-upload" type="file" accept="image/*,.pdf" className={s.paymentFileInput} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPaymentProofFile(file);
                  setPaymentProofUrl(URL.createObjectURL(file));
                }} />
                <label htmlFor="payment-proof-upload" className={s.paymentUploadLabel}>
                  <FileText size={18} />
                  <span>{paymentProofUrl ? 'Cambiar comprobante' : 'Seleccionar comprobante'}</span>
                </label>
                {paymentProofUrl && (
                  <div className={s.paymentFilePreview}>
                    <div className={s.paymentFileChip}>
                      {paymentProofFile?.type.startsWith('image/') && paymentProofUrl ? (
                        <img src={paymentProofUrl} alt={paymentProofFile?.name ?? 'comprobante'} className={s.paymentFileChipImage} />
                      ) : (
                        <FileText size={16} />
                      )}
                      <span className={s.paymentFileName}>{paymentProofFile?.name ?? 'comprobante'}</span>
                      <button type="button" className={s.paymentRemoveBtn} onClick={() => {
                        if (paymentProofUrl.startsWith('blob:')) URL.revokeObjectURL(paymentProofUrl);
                        setPaymentProofFile(null);
                        setPaymentProofUrl('');
                      }}>Eliminar</button>
                    </div>
                  </div>
                )}
                <span className={s.paymentHint}>Adjunta el comprobante del anticipo (imagen o PDF).</span>
              </div>
              <ModalFooter
                actions={[
                  { label: 'Cancelar', variant: 'secondary', onClick: () => setUploadPaymentOpen(false) },
                  { label: 'Subir comprobante', onClick: async () => {
                    if (!uploadPaymentOrderId || !paymentProofFile) {
                      toast.error('Selecciona un comprobante');
                      return;
                    }
                    try {
                      const result = await customOrdersApi.uploadPaymentProof(uploadPaymentOrderId, paymentProofFile);
                      await customOrdersApi.updatePayment(uploadPaymentOrderId, { paymentProofUrl: result.paymentProofUrl, paymentStatus: 'PENDING' });
                      toast.success('Comprobante subido correctamente');
                      setUploadPaymentOpen(false);
                      void loadOrders();
                    } catch {
                      toast.error('Error al subir comprobante');
                    }
                  } },
                ]}
              />
            </div>
          );
        })()}
      </Modal>

      <Modal open={clientNegotiationOpen} onClose={() => setClientNegotiationOpen(false)} title="Negociar cotización" description="Envía una propuesta de negociación al asesor." size="md" variant="form">
        {clientNegotiationOrderId && (() => {
          const order = orders.find(o => o.id === clientNegotiationOrderId);
          const cot = order?.cotizacion;
          return (
            <div className={s.form}>
              {cot && (
                <div className={s.negotiationProposal}>
                  <div className={s.negotiationProposalOld}>
                    <div className={s.negotiationSectionTitle}>Cotización actual (referencia)</div>
                    <div className={s.negotiationDiffRow}>
                      <span className={s.negotiationDiffLabel}>Subtotal</span>
                      <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.subtotal))}</span>
                    </div>
                    <div className={s.negotiationDiffRow}>
                      <span className={s.negotiationDiffLabel}>Total</span>
                      <span className={s.negotiationDiffValue}>{formatCurrency(Number(cot.total))}</span>
                    </div>
                    <div className={s.negotiationDiffRow}>
                      <span className={s.negotiationDiffLabel}>Condiciones</span>
                      <span className={s.negotiationDiffValue}>{cot.condicionesPago ?? '-'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className={s.field}>
                <label className={s.label}>Mensaje de negociación</label>
                <textarea
                  className={s.textarea}
                  rows={4}
                  placeholder="Explica qué cambios necesitas..."
                  value={clientNegotiationMessage}
                  onChange={(e) => setClientNegotiationMessage(e.target.value)}
                />
              </div>
              <ModalFooter
                actions={[
                  { label: 'Cancelar', variant: 'secondary', onClick: () => setClientNegotiationOpen(false) },
                  { label: 'Enviar propuesta', onClick: startClientNegotiation, disabled: clientNegotiationSending || !clientNegotiationMessage.trim() },
                ]}
              />
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

