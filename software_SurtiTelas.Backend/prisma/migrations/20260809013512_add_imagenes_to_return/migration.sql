-- Add imagenes column to returns if it does not exist
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add cliente_id column to returns if it does not exist
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "cliente_id" TEXT;

-- Create index on returns.cliente_id if it does not exist
CREATE INDEX IF NOT EXISTS "returns_cliente_id_idx" ON "returns" ("cliente_id");
