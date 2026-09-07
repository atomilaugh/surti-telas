-- CreateEnum
CREATE TYPE "CustomOrderStatus" AS ENUM ('SOLICITUD_RECIBIDA', 'EN_REVISION', 'COTIZADO', 'COTIZACION_ACEPTADA', 'COTIZACION_RECHAZADA', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO', 'CONVERTIDO_A_PEDIDO');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA');

-- AlterTable
ALTER TABLE "role_configs" ALTER COLUMN "role" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
ALTER COLUMN "role" SET DATA TYPE TEXT,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role", "permissionId");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "custom_orders" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "asesor_id" TEXT,
    "estado" "CustomOrderStatus" NOT NULL DEFAULT 'SOLICITUD_RECIBIDA',
    "tipo_prenda" TEXT NOT NULL,
    "tecnica_personalizacion" TEXT NOT NULL,
    "descripcion_diseno" TEXT,
    "referencias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telaSolicitada" TEXT,
    "colores_solicitados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tallas" JSONB,
    "cantidad_total" INTEGER NOT NULL,
    "fecha_deseada" TIMESTAMP(3),
    "presupuesto_id" TEXT,
    "orden_produccion_id" TEXT,
    "orden_id" TEXT,
    "conversacion_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "custom_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "QuoteStatus" NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "impuestos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "tiempo_estimado_dias" INTEGER NOT NULL,
    "validez_dias" INTEGER NOT NULL DEFAULT 15,
    "observaciones" TEXT,
    "aprobado_por" TEXT,
    "aprobado_at" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_order_notes" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNA',
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_order_attachments" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_order_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_orders_numero_key" ON "custom_orders"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "custom_orders_presupuesto_id_key" ON "custom_orders"("presupuesto_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_orders_orden_produccion_id_key" ON "custom_orders"("orden_produccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_orders_orden_id_key" ON "custom_orders"("orden_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_orders_conversacion_id_key" ON "custom_orders"("conversacion_id");

-- CreateIndex
CREATE INDEX "custom_orders_cliente_id_deleted_at_idx" ON "custom_orders"("cliente_id", "deleted_at");

-- CreateIndex
CREATE INDEX "custom_orders_asesor_id_idx" ON "custom_orders"("asesor_id");

-- CreateIndex
CREATE INDEX "custom_orders_estado_idx" ON "custom_orders"("estado");

-- CreateIndex
CREATE INDEX "custom_orders_deleted_at_idx" ON "custom_orders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_custom_order_id_key" ON "quotes"("custom_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_numero_key" ON "quotes"("numero");

-- CreateIndex
CREATE INDEX "quotes_custom_order_id_idx" ON "quotes"("custom_order_id");

-- CreateIndex
CREATE INDEX "quotes_estado_idx" ON "quotes"("estado");

-- CreateIndex
CREATE INDEX "quotes_deleted_at_idx" ON "quotes"("deleted_at");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");

-- CreateIndex
CREATE INDEX "custom_order_notes_custom_order_id_idx" ON "custom_order_notes"("custom_order_id");

-- CreateIndex
CREATE INDEX "custom_order_attachments_custom_order_id_idx" ON "custom_order_attachments"("custom_order_id");

-- AddForeignKey
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_order_notes" ADD CONSTRAINT "custom_order_notes_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_order_notes" ADD CONSTRAINT "custom_order_notes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_order_attachments" ADD CONSTRAINT "custom_order_attachments_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_order_attachments" ADD CONSTRAINT "custom_order_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
