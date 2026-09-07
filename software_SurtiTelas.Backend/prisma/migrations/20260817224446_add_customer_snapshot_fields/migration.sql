ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "cliente_nombre" TEXT;
ALTER TABLE "custom_orders" ADD COLUMN IF NOT EXISTS "cliente_telefono" TEXT;
