-- AlterTable
ALTER TABLE "custom_orders" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

-- Update existing data
UPDATE "custom_orders" SET estado = 'PENDIENTE' WHERE estado = 'SOLICITUD_RECIBIDA';
