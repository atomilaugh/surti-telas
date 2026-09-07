-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "modulo" TEXT,
ADD COLUMN     "referencia_id" TEXT;

-- CreateIndex
CREATE INDEX "notifications_modulo_referencia_id_idx" ON "notifications"("modulo", "referencia_id");
