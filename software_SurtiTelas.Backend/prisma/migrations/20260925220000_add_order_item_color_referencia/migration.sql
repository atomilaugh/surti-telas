-- Color y referencia del producto en cada linea del pedido.
ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "color" TEXT,
    ADD COLUMN IF NOT EXISTS "referencia" TEXT;

-- Backfill: la referencia se toma del producto relacionado cuando existe.
UPDATE "order_items" oi
SET "referencia" = p."ref"
FROM "products" p
WHERE oi."product_id" = p."id"
  AND (oi."referencia" IS NULL OR oi."referencia" = '');
