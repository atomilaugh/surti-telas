const parseCsv = (value: string | undefined, fallback: string[]) => {
  const parsed = value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  return parsed.length ? parsed : fallback;
};

const parseNumberList = (value: string | undefined, fallback: number[]) => {
  const parsed = parseCsv(value, [])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  return parsed.length ? parsed : fallback;
};

export const appContent = {
  brand: {
    name: import.meta.env.VITE_APP_NAME?.trim() || 'SurtiTelas',
    shortName: import.meta.env.VITE_APP_SHORT_NAME?.trim() || 'ST',
    tagline: import.meta.env.VITE_APP_TAGLINE?.trim() || 'Plataforma de gestión',
    description: import.meta.env.VITE_APP_DESCRIPTION?.trim() || 'Gestiona ventas, producción e inventario desde un solo lugar.',
    footerDescription: import.meta.env.VITE_FOOTER_DESCRIPTION?.trim() || 'Confección y personalización de prendas con enfoque en calidad y operación.',
    legalText: import.meta.env.VITE_FOOTER_COPY?.trim() || 'Tu negocio, conectado y en control.',
    copyright: import.meta.env.VITE_COPYRIGHT?.trim() || '© 2025 SurtiTelas. Todos los derechos reservados.',
  },
  auth: {
    heading: import.meta.env.VITE_AUTH_HEADING?.trim() || 'Controla tu negocio con precisión y elegancia',
    description: import.meta.env.VITE_AUTH_DESCRIPTION?.trim() || 'Gestiona operaciones, pedidos y seguimiento desde un único lugar.',
    roles: [
      { id: 'admin', icon: '⚙️', label: 'Administrador', desc: 'Acceso completo al sistema', iconClass: 'roleIcon -= 1admin' },
      { id: 'asesor', icon: '💼', label: 'Asesor', desc: 'Gestión de clientes y ventas', iconClass: 'roleIcon -= 1asesor' },
      { id: 'domiciliario', icon: '🚚', label: 'Domiciliario', desc: 'Gestión de entregas y rutas', iconClass: 'roleIcon -= 1delivery' },
      { id: 'cliente', icon: '🛍️', label: 'Cliente', desc: 'Catálogo y seguimiento de pedidos', iconClass: 'roleIcon -= 1cliente' },
    ],
  },
  home: {
    challenges: [
      { id: 'inventory', title: 'Desorden en inventario', desc: 'No sabes cuántos productos o materiales tienes disponibles.' },
      { id: 'sales', title: 'Ventas dispersas', desc: 'Los pedidos y seguimientos se pierden entre canales manuales.' },
      { id: 'production', title: 'Falta de control', desc: 'No hay visibilidad clara del estado de producción.' },
      { id: 'data', title: 'Pérdida de información', desc: 'Los datos quedan repartidos y son difíciles de consultar.' },
    ],
    slides: [
      { id: 'quality', title: 'Calidad que se siente', phrase: 'Procesos claros y herramientas simples para operar con confianza.', tag: 'Premium' },
      { id: 'production', title: 'Producción más ordenada', phrase: 'Coordina talleres, pedidos y entregas desde un único lugar.', tag: 'Compromiso' },
      { id: 'technology', title: 'Tecnología útil', phrase: 'Digitaliza las operaciones sin perder agilidad ni control.', tag: 'Innovación' },
    ],
    features: [
      { id: 'responsive', title: 'Diseño responsive', desc: 'Perfecta en cualquier dispositivo.' },
      { id: 'fast', title: 'Carga ultrarrápida', desc: 'Optimizada para operar sin fricción.' },
      { id: 'ui', title: 'Interfaz intuitiva', desc: 'Fácil de usar para cualquier persona.' },
    ],
    trackingSteps: [
      { id: 1, label: 'Recibido' },
      { id: 2, label: 'En producción' },
      { id: 3, label: 'Enviado' },
      { id: 4, label: 'Entregado' },
    ],
  },
  publicPages: {
    about: {
      identityLabel: import.meta.env.VITE_ABOUT_IDENTITY_LABEL?.trim() || 'Identidad',
      introTitle: import.meta.env.VITE_ABOUT_TITLE?.trim() || 'Conocémonos',
      introDescription: import.meta.env.VITE_ABOUT_DESCRIPTION?.trim() || 'Una plataforma enfocada en operar con orden, trazabilidad y agilidad.',
      roles: [
        { title: 'Misión', description: 'Simplificar la operación textil con procesos claros y herramientas reales.' },
        { title: 'Visión', description: 'Ser una plataforma de referencia para negocios textiles que buscan crecer con control.' },
        { title: 'Valores', description: 'Calidad, claridad y compromiso constante con cada cliente y proyecto.' },
      ],
      features: [
        { title: 'Experiencia moderna', description: 'Una plataforma intuitiva diseñada para facilitar compras, pedidos y seguimiento.' },
        { title: 'Procesos ágiles', description: 'Producción y distribución optimizadas para tiempos de entrega más fiables.' },
        { title: 'Seguimiento transparente', description: 'Visibilidad completa durante todo el proceso de producción.' },
      ],
      team: [
        { name: 'Equipo de producto', role: 'Estrategia y operación', description: 'Orientado a transformar procesos manuales en experiencias digitales claras.' },
        { name: 'Equipo creativo', role: 'Diseño y experiencia', description: 'Enfocado en interfaces simples, útiles y fáciles de aprender.' },
        { name: 'Equipo técnico', role: 'Desarrollo y escalabilidad', description: 'Responsable del rendimiento, la integración y la confiabilidad del sistema.' },
      ],
    },
    contact: {
      title: import.meta.env.VITE_CONTACT_TITLE?.trim() || 'Conecta con nosotros',
      description: import.meta.env.VITE_CONTACT_DESCRIPTION?.trim() || 'Nuestro equipo está listo para ayudarte con cotizaciones, pedidos, asesoría y soporte personalizado.',
      heroBadge: import.meta.env.VITE_CONTACT_BADGE?.trim() || 'Atención inmediata',
    },
  },
  checkout: {
    paymentBanks: parseCsv(import.meta.env.VITE_PAYMENT_BANKS, ['Banco principal', 'Banco alternativo']),
    installmentOptions: parseNumberList(import.meta.env.VITE_INSTALLMENT_OPTIONS, [2, 3, 6, 12]),
    trustBadges: [
      { label: 'Pago seguro' },
      { label: 'Compra protegida' },
    ],
    bankingKey: {
      bankName: 'Banco de Occidente',
      accountNumber: '1234567890',
      accountType: 'Cuenta de ahorros',
      beneficiary: 'SurtiTelas SAS',
      taxId: '900123456-7',
      qrPayload: '{"bank":"Banco de Occidente","account":"1234567890","type":"CA","beneficiary":"SurtiTelas SAS","taxId":"900123456-7"}',
    },
  },
  catalog: {
    productCategories: parseCsv(import.meta.env.VITE_PRODUCT_CATEGORIES, ['Categoría principal', 'Categoría secundaria']),
    productSizes: parseCsv(import.meta.env.VITE_PRODUCT_SIZES, ['Única']),
    insumoCategories: parseCsv(import.meta.env.VITE_INSUMO_CATEGORIES, ['Material', 'Accesorio']),
    insumoUnits: parseCsv(
      import.meta.env.VITE_INSUMO_UNITS,
      [
        'Und',
        'Par',
        'Docena',
        'Caja',
        'Paquete',
        'mm',
        'cm',
        'm',
        'yd',
        'g',
        'kg',
        't',
        'mL',
        'L',
        'Tex',
        'Den',
        'dtex',
        'Ne',
        'Nm',
        'L',
      ],
    ),
  },
};
