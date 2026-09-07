-- Add direccion to customers table
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
