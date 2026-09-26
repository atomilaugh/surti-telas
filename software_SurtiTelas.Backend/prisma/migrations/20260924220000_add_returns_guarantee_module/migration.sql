-- FASE 1 — Guarantee & Returns Foundation
-- ADDITIVE migration: does NOT modify or drop any existing tables.
-- New models: WarrantyPolicy, ReturnRequest, ReturnItem,
-- ReturnInspection, ReturnResolution, ReturnHistory.
-- Adds relation fields to Order, Customer, OrderItem, Product.

-- CreateEnum
CREATE TYPE "WarrantyPolicyTipo" AS ENUM ('VENTA', 'FABRICANTE', 'NINGUNA');

-- CreateEnum
CREATE TYPE "ReturnRequestStatus" AS ENUM ('SOLICITADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'PRODUCTO_RECIBIDO', 'EN_INSPECCION', 'RESUELTA');

-- CreateEnum
CREATE TYPE "ReturnResolutionType" AS ENUM ('REINGRESO_EXISTENCIAS', 'REPARACION', 'DESCARTE', 'DEVOLUCION_PROVEEDOR');

-- CreateEnum
CREATE TYPE "ReturnInspectionCondition" AS ENUM ('NUEVO', 'DEFECTUOSO', 'DANADO', 'REPARABLE', 'NO_RECUPERABLE');

-- CreateEnum
CREATE TYPE "ReturnItemDefectoTipo" AS ENUM ('DEFECTO_CONFECCION', 'DEFECTO_MATERIAL', 'DESGASTE', 'IMPERFECCION_VISUAL', 'ERROR_CANTIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "ReturnHistoryAccion" AS ENUM ('ESTADO_CAMBIADO', 'ITEM_AGREGADO', 'ITEM_APROBADO', 'ITEM_RECHAZADO', 'ITEM_RECIBIDO', 'INSPECCION_INICIADA', 'INSPECCION_COMPLETADA', 'RESOLUCION_ASIGNADA', 'MOTIVO_ACTUALIZADO', 'OBSERVACIONES_ACTUALIZADAS', 'GARANTIA_APLICADA', 'SOLICITUD_CREADA');

-- CreateTable: WarrantyPolicy
CREATE TABLE "warranty_policies" (
    "id" TEXT NOT NULL,
    "tipo" "WarrantyPolicyTipo" NOT NULL DEFAULT 'VENTA',
    "dias_garantia" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "warranty_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReturnRequest
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "numero_devolucion" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "cliente_snapshot" TEXT,
    "cliente_id_snapshot" TEXT,
    "tipo_garantia_snapshot" "WarrantyPolicyTipo" DEFAULT 'VENTA',
    "dias_garantia_snapshot" INTEGER,
    "fecha_inicio_garantia" TIMESTAMP(3),
    "fecha_vencimiento_garantia" TIMESTAMP(3),
    "motivo" TEXT,
    "observaciones" TEXT,
    "cantidad_total" INTEGER NOT NULL DEFAULT 0,
    "cantidad_inspeccionada" INTEGER,
    "estado" "ReturnRequestStatus" NOT NULL DEFAULT 'SOLICITADA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReturnItem
CREATE TABLE "return_items" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "product_id" TEXT,
    "ref" TEXT NOT NULL,
    "prenda" TEXT NOT NULL,
    "cantidad_solicitada" INTEGER NOT NULL,
    "cantidad_aprobada" INTEGER,
    "cantidad_recibida" INTEGER,
    "cantidad_aceptada" INTEGER,
    "cantidad_rechazada" INTEGER,
    "defecto_tipo" "ReturnItemDefectoTipo" NOT NULL DEFAULT 'OTRO',
    "defecto_descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReturnInspection
CREATE TABLE "return_inspections" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "responsable" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "condicion" "ReturnInspectionCondition" NOT NULL,
    "cantidad_aceptada" INTEGER NOT NULL,
    "cantidad_rechazada" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReturnResolution
CREATE TABLE "return_resolutions" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "tipo" "ReturnResolutionType" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "responsable" TEXT,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReturnHistory
CREATE TABLE "return_histories" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "estado_anterior" "ReturnRequestStatus",
    "estado_nuevo" "ReturnRequestStatus",
    "accion" "ReturnHistoryAccion" NOT NULL,
    "usuario" TEXT,
    "observaciones" TEXT,
    "cantidad" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warranty_policies_tipo_idx" ON "warranty_policies"("tipo");

-- CreateIndex
CREATE INDEX "warranty_policies_activa_idx" ON "warranty_policies"("activa");

-- CreateIndex
CREATE INDEX "warranty_policies_deleted_at_idx" ON "warranty_policies"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "return_requests_numero_devolucion_key" ON "return_requests"("numero_devolucion");

-- CreateIndex
CREATE INDEX "return_requests_order_id_idx" ON "return_requests"("order_id");

-- CreateIndex
CREATE INDEX "return_requests_customer_id_idx" ON "return_requests"("customer_id");

-- CreateIndex
CREATE INDEX "return_requests_estado_idx" ON "return_requests"("estado");

-- CreateIndex
CREATE INDEX "return_requests_deleted_at_idx" ON "return_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "return_items_return_request_id_idx" ON "return_items"("return_request_id");

-- CreateIndex
CREATE INDEX "return_items_order_item_id_idx" ON "return_items"("order_item_id");

-- CreateIndex
CREATE INDEX "return_items_product_id_idx" ON "return_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_inspections_return_request_id_key" ON "return_inspections"("return_request_id");

-- CreateIndex
CREATE INDEX "return_inspections_return_request_id_idx" ON "return_inspections"("return_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_resolutions_return_request_id_key" ON "return_resolutions"("return_request_id");

-- CreateIndex
CREATE INDEX "return_resolutions_return_request_id_idx" ON "return_resolutions"("return_request_id");

-- CreateIndex
CREATE INDEX "return_histories_return_request_id_created_at_idx" ON "return_histories"("return_request_id", "created_at");

-- CreateIndex
CREATE INDEX "return_histories_accion_idx" ON "return_histories"("accion");

-- CreateIndex
CREATE INDEX "return_histories_fecha_idx" ON "return_histories"("fecha");

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_inspections" ADD CONSTRAINT "return_inspections_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_resolutions" ADD CONSTRAINT "return_resolutions_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_histories" ADD CONSTRAINT "return_histories_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relation to Order model
-- (Order.returnRequests is handled as a back-relation, no schema change needed)

-- Add relation to OrderItem model
-- (OrderItem.returnItems is handled as a back-relation, no schema change needed)

-- Add relation to Product model
-- (Product.returnItems is handled as a back-relation, no schema change needed)
