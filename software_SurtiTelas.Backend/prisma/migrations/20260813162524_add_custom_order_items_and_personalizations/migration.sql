-- CreateTable
CREATE TABLE "custom_order_items" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "producto_nombre" TEXT,
    "descripcion" TEXT NOT NULL,
    "tipo_personalizacion" TEXT NOT NULL,
    "especificaciones" TEXT,
    "cantidad" INTEGER NOT NULL,
    "talla" TEXT,
    "color" TEXT,
    "material" TEXT,
    "ubicacion" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personalizations" (
    "id" TEXT NOT NULL,
    "custom_order_item_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tecnica" TEXT,
    "ubicacion" JSONB,
    "descripcion" TEXT NOT NULL,
    "archivos" TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personalizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "custom_order_personalization_id" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_order_items_custom_order_id_idx" ON "custom_order_items"("custom_order_id");

-- CreateIndex
CREATE INDEX "personalizations_custom_order_item_id_idx" ON "personalizations"("custom_order_item_id");

-- CreateIndex
CREATE INDEX "variants_custom_order_personalization_id_idx" ON "variants"("custom_order_personalization_id");

-- AddForeignKey
ALTER TABLE "custom_order_items" ADD CONSTRAINT "custom_order_items_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personalizations" ADD CONSTRAINT "personalizations_custom_order_item_id_fkey" FOREIGN KEY ("custom_order_item_id") REFERENCES "custom_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_custom_order_personalization_id_fkey" FOREIGN KEY ("custom_order_personalization_id") REFERENCES "personalizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
