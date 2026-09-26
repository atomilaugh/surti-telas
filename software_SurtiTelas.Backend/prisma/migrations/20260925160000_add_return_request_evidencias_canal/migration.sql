-- FASE 2B — Evidencias persistentes y canal de registro en devoluciones (FASE 1)
-- Additive migration: no modifica ni elimina tablas existentes.
-- - return_requests.evidencias      TEXT[]  referencias persistentes de las evidencias adjuntas
-- - return_requests.canal_registro  TEXT    canal por el que se registró la solicitud

-- AlterTable
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "evidencias" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "return_requests" ADD COLUMN IF NOT EXISTS "canal_registro" TEXT NOT NULL DEFAULT 'PORTAL';
