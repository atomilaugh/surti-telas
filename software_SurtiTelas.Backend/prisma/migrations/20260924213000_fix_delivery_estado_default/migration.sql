-- Fix default estado for deliveries table.
-- New deliveries created without an explicit estado will default to 'PENDIENTE'
-- instead of 'ASIGNADO', preventing inconsistent records where estado='ASIGNADO'
-- but domiciliarioId is NULL.

ALTER TABLE "deliveries" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "deliveries" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
