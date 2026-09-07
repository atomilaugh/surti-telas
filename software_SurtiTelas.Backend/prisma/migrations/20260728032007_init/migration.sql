-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ASESOR', 'DOMICILIARIO', 'CLIENTE', 'ALMACEN', 'PRODUCCION', 'REPORTES');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('OK', 'BAJO_STOCK', 'AGOTADO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NUEVO', 'EN_PRODUCCION', 'LISTO', 'DESPACHADO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO', 'PENDIENTE', 'EN_VALIDACION', 'ACEPTADO', 'RECHAZADO', 'RECIBO_GENERADO', 'RECIBO_ENVIADO');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('ESTANDAR', 'PRIORITARIO');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'TERMINADO');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "WorkshopStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'DANGER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AlertState" AS ENUM ('PENDIENTE', 'LEIDA', 'RESUELTA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "ControlPrendaEtapa" AS ENUM ('CORTE', 'CONFECCION', 'ACABADO', 'CONTROL_CALIDAD', 'EMPAQUE');

-- CreateEnum
CREATE TYPE "ControlPrendaEstado" AS ENUM ('PROCESO', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "tipo_documento" TEXT,
    "numero_documento" TEXT,
    "role" "Role" NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "refresh_token" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "google_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "Role" NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permissionId")
);

-- CreateTable
CREATE TABLE "role_configs" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "descripcion_corta" TEXT,
    "categoria_id" TEXT,
    "subcategoria" TEXT,
    "marca" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "precio_anterior" DECIMAL(12,2),
    "descuento" INTEGER NOT NULL DEFAULT 0,
    "cantidad_stock" INTEGER NOT NULL DEFAULT 0,
    "stock_status" "StockStatus" NOT NULL DEFAULT 'OK',
    "estado" "ProductStatus" NOT NULL DEFAULT 'ACTIVO',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_publicacion" TIMESTAMP(3),
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "oferta" BOOLEAN NOT NULL DEFAULT false,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "mas_vendido" BOOLEAN NOT NULL DEFAULT false,
    "tela" TEXT NOT NULL,
    "colores" TEXT[],
    "tallas" TEXT[],
    "imagen_principal" TEXT,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" VARCHAR(255),
    "ciudad" TEXT,
    "telefono" TEXT,
    "nit" TEXT,
    "asesor_id" TEXT,
    "cupo_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cupo_usado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deuda_vencida" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_trusted_customer" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "cliente_nombre" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "asesor_nombre" TEXT NOT NULL,
    "tipo_flujo" TEXT NOT NULL DEFAULT 'PRODUCCION',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2),
    "impuestos" DECIMAL(12,2) DEFAULT 0,
    "descuentos" DECIMAL(12,2) DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "items_count" INTEGER NOT NULL DEFAULT 0,
    "estado" "OrderStatus" NOT NULL DEFAULT 'NUEVO',
    "prioridad" "OrderPriority" NOT NULL DEFAULT 'ESTANDAR',
    "observaciones" TEXT,
    "medio_pago" TEXT,
    "fecha_validacion" TIMESTAMP(3),
    "usuario_validacion_id" TEXT,
    "razon_rechazo" TEXT,
    "observaciones_rechazo" TEXT,
    "comprobante_pago_url" TEXT,
    "comprobante_pago_nombre" TEXT,
    "comprobante_pago_mime" TEXT,
    "comprobante_pago_tamaño" INTEGER,
    "comprobante_pago_cargado_en" TIMESTAMP(3),
    "comprobante_pago_cargado_por_id" TEXT,
    "comprobante_pago_estado" TEXT,
    "comprobante_pago_observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "materiales" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estado" "SupplierStatus" NOT NULL DEFAULT 'ACTIVO',
    "calificacion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pedidos_realizados" INTEGER NOT NULL DEFAULT 0,
    "ultimo_pedido" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "unidad_medida" TEXT NOT NULL,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "proveedor_id" TEXT,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "tipo" "MovementType" NOT NULL,
    "product_id" TEXT,
    "raw_material_id" TEXT,
    "cantidad" INTEGER NOT NULL,
    "ajuste" INTEGER,
    "motivo" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "encargado_id" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "estado" "WorkshopStatus" NOT NULL DEFAULT 'ACTIVO',
    "capacidad" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT,
    "operario_id" TEXT,
    "taller_id" TEXT,
    "referencia" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_estimada" TIMESTAMP(3) NOT NULL,
    "avance" INTEGER NOT NULL DEFAULT 0,
    "estado" "ProductionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "tela" TEXT,
    "colores" TEXT[],
    "curva_tallas" JSONB,
    "notas_tecnicas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tipo" "NotificationType" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usuario_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "asesor_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "concepto" TEXT NOT NULL,
    "notas" TEXT,
    "url" TEXT,
    "emitidoPor" TEXT,
    "emitido_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "estado_envio" TEXT DEFAULT 'PENDIENTE',
    "fecha_envio" TIMESTAMP(3),
    "intentos_envio" INTEGER NOT NULL DEFAULT 0,
    "ultimo_error_envio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "cliente_nombre" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "asesor_nombre" TEXT NOT NULL,
    "fecha_venta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "impuestos" DECIMAL(12,2) NOT NULL,
    "descuentos" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "medio_pago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_history" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "estado_anterior" TEXT NOT NULL,
    "estado_nuevo" TEXT NOT NULL,
    "razon" TEXT,
    "informacion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "asesor_id" TEXT NOT NULL,
    "order_id" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_config" (
    "id" TEXT NOT NULL DEFAULT 'company',
    "nombre" TEXT NOT NULL DEFAULT 'SurtiTelas',
    "nit" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "logo" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "respondida" BOOLEAN NOT NULL DEFAULT false,
    "respuesta" TEXT,
    "respondido_por" TEXT,
    "respondido_en" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "referencia_id" TEXT,
    "mensaje" TEXT NOT NULL,
    "estado" "AlertState" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "AlertPriority" NOT NULL DEFAULT 'MEDIA',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leida_por_id" TEXT,
    "resuelta_por_id" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "referencia_id" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_prendas" (
    "id" TEXT NOT NULL,
    "produccion_id" TEXT NOT NULL,
    "etapa" "ControlPrendaEtapa" NOT NULL,
    "estado" "ControlPrendaEstado" NOT NULL DEFAULT 'PROCESO',
    "cantidadTotal" INTEGER NOT NULL,
    "cantidadRevisada" INTEGER NOT NULL,
    "cantidadAprobada" INTEGER NOT NULL,
    "cantidadRechazada" INTEGER NOT NULL,
    "observaciones" TEXT,
    "revisado_por_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "control_prendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "domiciliario_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ASIGNADO',
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT,
    "telefono" TEXT,
    "notas" TEXT,
    "asignadoEn" TIMESTAMP(3),
    "entregadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" TEXT NOT NULL,
    "numero_devolucion" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "prenda" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidad_inspeccionada" INTEGER NOT NULL DEFAULT 0,
    "fecha_devolucion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "destino" TEXT,
    "cliente" TEXT,
    "responsable" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "advisor_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_configs_role_key" ON "role_configs"("role");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_ref_key" ON "products"("ref");

-- CreateIndex
CREATE INDEX "products_categoria_id_deleted_at_idx" ON "products"("categoria_id", "deleted_at");

-- CreateIndex
CREATE INDEX "products_publicado_estado_idx" ON "products"("publicado", "estado");

-- CreateIndex
CREATE INDEX "products_stock_status_idx" ON "products"("stock_status");

-- CreateIndex
CREATE INDEX "products_stock_status_publicado_idx" ON "products"("stock_status", "publicado");

-- CreateIndex
CREATE INDEX "products_deleted_at_idx" ON "products"("deleted_at");

-- CreateIndex
CREATE INDEX "customers_asesor_id_idx" ON "customers"("asesor_id");

-- CreateIndex
CREATE INDEX "customers_asesor_id_estado_idx" ON "customers"("asesor_id", "estado");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_numero_key" ON "orders"("numero");

-- CreateIndex
CREATE INDEX "orders_cliente_id_deleted_at_idx" ON "orders"("cliente_id", "deleted_at");

-- CreateIndex
CREATE INDEX "orders_asesor_id_idx" ON "orders"("asesor_id");

-- CreateIndex
CREATE INDEX "orders_estado_fecha_idx" ON "orders"("estado", "fecha");

-- CreateIndex
CREATE INDEX "orders_estado_fecha_asesor_id_idx" ON "orders"("estado", "fecha", "asesor_id");

-- CreateIndex
CREATE INDEX "orders_tipo_flujo_idx" ON "orders"("tipo_flujo");

-- CreateIndex
CREATE INDEX "orders_deleted_at_idx" ON "orders"("deleted_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_nit_key" ON "suppliers"("nit");

-- CreateIndex
CREATE INDEX "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");

-- CreateIndex
CREATE INDEX "raw_materials_proveedor_id_idx" ON "raw_materials"("proveedor_id");

-- CreateIndex
CREATE INDEX "raw_materials_stock_actual_idx" ON "raw_materials"("stock_actual");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_fecha_idx" ON "inventory_movements"("product_id", "fecha");

-- CreateIndex
CREATE INDEX "inventory_movements_raw_material_id_fecha_idx" ON "inventory_movements"("raw_material_id", "fecha");

-- CreateIndex
CREATE INDEX "inventory_movements_deleted_at_idx" ON "inventory_movements"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_pedido_id_key" ON "production_orders"("pedido_id");

-- CreateIndex
CREATE INDEX "production_orders_pedido_id_idx" ON "production_orders"("pedido_id");

-- CreateIndex
CREATE INDEX "production_orders_estado_idx" ON "production_orders"("estado");

-- CreateIndex
CREATE INDEX "production_orders_deleted_at_idx" ON "production_orders"("deleted_at");

-- CreateIndex
CREATE INDEX "notifications_usuario_id_leida_idx" ON "notifications"("usuario_id", "leida");

-- CreateIndex
CREATE INDEX "notifications_deleted_at_idx" ON "notifications"("deleted_at");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_usuario_id_idx" ON "webhook_subscriptions"("usuario_id");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_active_idx" ON "webhook_subscriptions"("active");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_deleted_at_idx" ON "webhook_subscriptions"("deleted_at");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_asesor_id_idx" ON "payments"("asesor_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_deleted_at_idx" ON "payments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_numero_key" ON "receipts"("numero");

-- CreateIndex
CREATE INDEX "receipts_customer_id_idx" ON "receipts"("customer_id");

-- CreateIndex
CREATE INDEX "receipts_order_id_idx" ON "receipts"("order_id");

-- CreateIndex
CREATE INDEX "receipts_estado_idx" ON "receipts"("estado");

-- CreateIndex
CREATE INDEX "receipts_deleted_at_idx" ON "receipts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_id_key" ON "sales"("order_id");

-- CreateIndex
CREATE INDEX "sales_cliente_id_idx" ON "sales"("cliente_id");

-- CreateIndex
CREATE INDEX "sales_asesor_id_idx" ON "sales"("asesor_id");

-- CreateIndex
CREATE INDEX "sales_fecha_venta_idx" ON "sales"("fecha_venta");

-- CreateIndex
CREATE INDEX "sales_deleted_at_idx" ON "sales"("deleted_at");

-- CreateIndex
CREATE INDEX "order_history_pedido_id_idx" ON "order_history"("pedido_id");

-- CreateIndex
CREATE INDEX "order_history_usuario_id_idx" ON "order_history"("usuario_id");

-- CreateIndex
CREATE INDEX "order_history_createdAt_idx" ON "order_history"("createdAt");

-- CreateIndex
CREATE INDEX "order_history_deleted_at_idx" ON "order_history"("deleted_at");

-- CreateIndex
CREATE INDEX "commissions_asesor_id_idx" ON "commissions"("asesor_id");

-- CreateIndex
CREATE INDEX "commissions_order_id_idx" ON "commissions"("order_id");

-- CreateIndex
CREATE INDEX "commissions_deleted_at_idx" ON "commissions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_pages_slug_idx" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_pages_publicado_idx" ON "cms_pages"("publicado");

-- CreateIndex
CREATE INDEX "cms_pages_deleted_at_idx" ON "cms_pages"("deleted_at");

-- CreateIndex
CREATE INDEX "contact_messages_leida_idx" ON "contact_messages"("leida");

-- CreateIndex
CREATE INDEX "contact_messages_estado_idx" ON "contact_messages"("estado");

-- CreateIndex
CREATE INDEX "contact_messages_deleted_at_idx" ON "contact_messages"("deleted_at");

-- CreateIndex
CREATE INDEX "alerts_estado_idx" ON "alerts"("estado");

-- CreateIndex
CREATE INDEX "alerts_prioridad_idx" ON "alerts"("prioridad");

-- CreateIndex
CREATE INDEX "alerts_modulo_idx" ON "alerts"("modulo");

-- CreateIndex
CREATE INDEX "alerts_leida_idx" ON "alerts"("leida");

-- CreateIndex
CREATE INDEX "alerts_deleted_at_idx" ON "alerts"("deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_usuario_id_idx" ON "audit_logs"("usuario_id");

-- CreateIndex
CREATE INDEX "audit_logs_modulo_idx" ON "audit_logs"("modulo");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "control_prendas_produccion_id_idx" ON "control_prendas"("produccion_id");

-- CreateIndex
CREATE INDEX "control_prendas_estado_idx" ON "control_prendas"("estado");

-- CreateIndex
CREATE INDEX "control_prendas_etapa_idx" ON "control_prendas"("etapa");

-- CreateIndex
CREATE INDEX "control_prendas_deleted_at_idx" ON "control_prendas"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_domiciliario_id_idx" ON "deliveries"("domiciliario_id");

-- CreateIndex
CREATE INDEX "deliveries_deleted_at_idx" ON "deliveries"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "returns_numero_devolucion_key" ON "returns"("numero_devolucion");

-- CreateIndex
CREATE INDEX "returns_order_id_idx" ON "returns"("order_id");

-- CreateIndex
CREATE INDEX "returns_deleted_at_idx" ON "returns"("deleted_at");

-- CreateIndex
CREATE INDEX "conversations_client_id_idx" ON "conversations"("client_id");

-- CreateIndex
CREATE INDEX "conversations_advisor_id_idx" ON "conversations"("advisor_id");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "conversations_deleted_at_idx" ON "conversations"("deleted_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_deleted_at_idx" ON "messages"("deleted_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_usuario_validacion_id_fkey" FOREIGN KEY ("usuario_validacion_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_comprobante_pago_cargado_por_id_fkey" FOREIGN KEY ("comprobante_pago_cargado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_operario_id_fkey" FOREIGN KEY ("operario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_taller_id_fkey" FOREIGN KEY ("taller_id") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_leida_por_id_fkey" FOREIGN KEY ("leida_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resuelta_por_id_fkey" FOREIGN KEY ("resuelta_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_prendas" ADD CONSTRAINT "control_prendas_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_prendas" ADD CONSTRAINT "control_prendas_revisado_por_id_fkey" FOREIGN KEY ("revisado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_prendas" ADD CONSTRAINT "control_prendas_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_domiciliario_id_fkey" FOREIGN KEY ("domiciliario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
