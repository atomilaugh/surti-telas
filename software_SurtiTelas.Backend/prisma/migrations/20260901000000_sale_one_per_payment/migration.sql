-- ============================================================================
-- Migración: modelo "1 venta por pago confirmado"
-- ----------------------------------------------------------------------------
-- Cambios:
--   1. Quita UNIQUE de order_id en sales (ahora un pedido puede tener N ventas).
--   2. Agrega payment_id UNIQUE NULLABLE en sales (idempotencia por pago).
--   3. Agrega columnas para tipo de pago, número de cuota, anticipo, saldo,
--      estado del pago, comprobante, registradoPorId.
--   4. Agrega índice en order_id para mantener performance de joins/filtros.
--
-- Compatibilidad: ventas legacy (sin payment_id) se conservan intactas.
-- ============================================================================

-- 1. Quitar constraint UNIQUE de order_id si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_order_id_key'
  ) THEN
    ALTER TABLE "sales" DROP CONSTRAINT "sales_order_id_key";
  END IF;
END $$;

-- 2. Nuevas columnas (todas NULLABLE para no romper datos existentes)
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_id" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "tipo_pago" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "numero_cuota" INTEGER;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "total_cuotas" INTEGER;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "es_anticipo" BOOLEAN DEFAULT false;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "es_saldo" BOOLEAN DEFAULT false;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "payment_status" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "comprobante_pago_url" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "registrado_por_id" TEXT;

-- 3. UNIQUE en payment_id (idempotencia: NULL no entra en unique constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_payment_id_key'
  ) THEN
    ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_id_key" UNIQUE ("payment_id");
  END IF;
END $$;

-- 4. Índice en order_id (para joins/filtros por pedido)
CREATE INDEX IF NOT EXISTS "sales_order_id_idx" ON "sales"("order_id");
CREATE INDEX IF NOT EXISTS "sales_payment_status_idx" ON "sales"("payment_status");

-- 5. Pago ahora también puede llevar su propio comprobante (independiente
--    del comprobante asociado al pedido).
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "comprobante_pago_url" TEXT;