-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDIENTE', 'RECIBIDA', 'CANCELADA', 'ANULADA');

-- DropIndex
DROP INDEX "sales_order_id_key";

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "inicio_ruta_en" TIMESTAMP(3),
ADD COLUMN     "motivo" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "custom_order_item_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "fecha_anulacion" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "fecha_anulacion" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quote_items" ALTER COLUMN "custom_order_item_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "quote_negotiations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "raw_materials" ADD COLUMN     "categoria_id" TEXT;

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_categories" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "raw_material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_items" (
    "id" TEXT NOT NULL,
    "produccion_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL,
    "unidad" TEXT,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precioUnitario" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" "PurchaseStatus" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "motivo_cancelacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "raw_material_id" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_permissionId_key" ON "user_permissions"("user_id", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_material_categories_slug_key" ON "raw_material_categories"("slug");

-- CreateIndex
CREATE INDEX "raw_material_categories_slug_idx" ON "raw_material_categories"("slug");

-- CreateIndex
CREATE INDEX "raw_material_categories_estado_idx" ON "raw_material_categories"("estado");

-- CreateIndex
CREATE INDEX "raw_material_categories_deleted_at_idx" ON "raw_material_categories"("deleted_at");

-- CreateIndex
CREATE INDEX "production_items_produccion_id_idx" ON "production_items"("produccion_id");

-- CreateIndex
CREATE INDEX "production_items_deleted_at_idx" ON "production_items"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_numero_key" ON "purchases"("numero");

-- CreateIndex
CREATE INDEX "purchases_proveedor_id_idx" ON "purchases"("proveedor_id");

-- CreateIndex
CREATE INDEX "purchases_usuario_id_idx" ON "purchases"("usuario_id");

-- CreateIndex
CREATE INDEX "purchases_estado_idx" ON "purchases"("estado");

-- CreateIndex
CREATE INDEX "purchases_deleted_at_idx" ON "purchases"("deleted_at");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_items_raw_material_id_idx" ON "purchase_items"("raw_material_id");

-- CreateIndex
CREATE INDEX "order_items_custom_order_item_id_idx" ON "order_items"("custom_order_item_id");

-- CreateIndex
CREATE INDEX "raw_materials_categoria_id_idx" ON "raw_materials"("categoria_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_materials" ADD CONSTRAINT "raw_materials_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "raw_material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_items" ADD CONSTRAINT "production_items_produccion_id_fkey" FOREIGN KEY ("produccion_id") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_raw_material_id_fkey" FOREIGN KEY ("raw_material_id") REFERENCES "raw_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_quote_items_custom_order_item_id" RENAME TO "quote_items_custom_order_item_id_idx";

