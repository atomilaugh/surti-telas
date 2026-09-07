-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomOrderStatus" ADD VALUE 'PAGO_PENDIENTE';
ALTER TYPE "CustomOrderStatus" ADD VALUE 'PAGO_EN_VERIFICACION';
ALTER TYPE "CustomOrderStatus" ADD VALUE 'PAGO_APROBADO';
ALTER TYPE "CustomOrderStatus" ADD VALUE 'VENCIDO';

-- DropForeignKey
ALTER TABLE "custom_orders" DROP CONSTRAINT "custom_orders_asesor_id_fkey";

-- AlterTable
ALTER TABLE "custom_orders" ADD COLUMN     "anticipo_pagado" BOOLEAN,
ADD COLUMN     "fecha_aceptacion" TIMESTAMP(3),
ADD COLUMN     "fecha_limite" BOOLEAN DEFAULT false,
ADD COLUMN     "fecha_limite_produccion" TIMESTAMP(3),
ADD COLUMN     "motivo_rechazo" TEXT,
ADD COLUMN     "notas_cliente" TEXT,
ADD COLUMN     "notas_internas" TEXT,
ADD COLUMN     "payment_key" TEXT,
ADD COLUMN     "payment_proof_url" TEXT,
ADD COLUMN     "payment_status" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "quote_items" ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tipo" TEXT,
ADD COLUMN     "unidad_medida" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "condiciones_pago" TEXT,
ADD COLUMN     "generado_por_id" TEXT,
ADD COLUMN     "generado_por_nombre" TEXT,
ADD COLUMN     "porcentaje_anticipo" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "valida_hasta" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "custom_orders" ADD CONSTRAINT "custom_orders_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
