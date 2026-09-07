-- CreateEnum
CREATE TYPE "MessageTemplateType" AS ENUM ('INFORMATION_REQUEST', 'QUOTE', 'PAYMENT_REMINDER', 'STATUS_UPDATE', 'APPROVAL_REQUEST', 'PRODUCTION_START', 'QC_PASSED', 'DELIVERY');

-- CreateEnum
CREATE TYPE "VideoCallProvider" AS ENUM ('ZOOM', 'MEET', 'MS_TEAMS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "MessageTemplateType" NOT NULL,
    "canal" TEXT NOT NULL,
    "asunto" TEXT,
    "contenido" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_calls" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "proveedor" "VideoCallProvider" NOT NULL,
    "enlace" TEXT NOT NULL,
    "codigo_acceso" TEXT,
    "contrasena" TEXT,
    "fecha_inicio" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "creado_por_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "video_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_approvals" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento_url" TEXT,
    "aprobado_por" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "rechazado_por" TEXT,
    "rechazado_en" TIMESTAMP(3),
    "motivo_rechazo" TEXT,
    "firma_url" TEXT,
    "estado" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "digital_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_tipo_idx" ON "message_templates"("tipo");

-- CreateIndex
CREATE INDEX "message_templates_deleted_at_idx" ON "message_templates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "video_calls_custom_order_id_key" ON "video_calls"("custom_order_id");

-- CreateIndex
CREATE INDEX "video_calls_custom_order_id_idx" ON "video_calls"("custom_order_id");

-- CreateIndex
CREATE INDEX "video_calls_deleted_at_idx" ON "video_calls"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "digital_approvals_custom_order_id_key" ON "digital_approvals"("custom_order_id");

-- CreateIndex
CREATE INDEX "digital_approvals_custom_order_id_idx" ON "digital_approvals"("custom_order_id");

-- CreateIndex
CREATE INDEX "digital_approvals_estado_idx" ON "digital_approvals"("estado");

-- CreateIndex
CREATE INDEX "digital_approvals_deleted_at_idx" ON "digital_approvals"("deleted_at");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_calls" ADD CONSTRAINT "video_calls_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_approvals" ADD CONSTRAINT "digital_approvals_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
