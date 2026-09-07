-- CreateEnum
CREATE TYPE "TechnicalSheetStatus" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'EN_PRODUCCION');

-- CreateTable
CREATE TABLE "technical_sheets" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" "TechnicalSheetStatus" NOT NULL DEFAULT 'BORRADOR',
    "tipo_prenda" TEXT NOT NULL,
    "tecnica_personalizacion" TEXT NOT NULL,
    "tela_solicitada" TEXT,
    "colores_solicitados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tallas" JSONB,
    "cantidad_total" INTEGER NOT NULL,
    "descripcion_diseno" TEXT,
    "referencias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observaciones" TEXT,
    "aprobado_por" TEXT,
    "aprobado_at" TIMESTAMP(3),
    "rechazado_por" TEXT,
    "rechazado_at" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "technical_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_sheet_attachments" (
    "id" TEXT NOT NULL,
    "technical_sheet_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_sheet_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_sheet_approvals" (
    "id" TEXT NOT NULL,
    "technical_sheet_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "comentario" TEXT,
    "usuario_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_sheet_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technical_sheets_numero_key" ON "technical_sheets"("numero");

-- CreateIndex
CREATE INDEX "technical_sheets_custom_order_id_idx" ON "technical_sheets"("custom_order_id");

-- CreateIndex
CREATE INDEX "technical_sheets_estado_idx" ON "technical_sheets"("estado");

-- CreateIndex
CREATE INDEX "technical_sheets_deleted_at_idx" ON "technical_sheets"("deleted_at");

-- CreateIndex
CREATE INDEX "technical_sheet_attachments_technical_sheet_id_idx" ON "technical_sheet_attachments"("technical_sheet_id");

-- CreateIndex
CREATE INDEX "technical_sheet_approvals_technical_sheet_id_idx" ON "technical_sheet_approvals"("technical_sheet_id");

-- AddForeignKey
ALTER TABLE "technical_sheets" ADD CONSTRAINT "technical_sheets_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_sheet_attachments" ADD CONSTRAINT "technical_sheet_attachments_technical_sheet_id_fkey" FOREIGN KEY ("technical_sheet_id") REFERENCES "technical_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_sheet_attachments" ADD CONSTRAINT "technical_sheet_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_sheet_approvals" ADD CONSTRAINT "technical_sheet_approvals_technical_sheet_id_fkey" FOREIGN KEY ("technical_sheet_id") REFERENCES "technical_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_sheet_approvals" ADD CONSTRAINT "technical_sheet_approvals_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
