-- Inventario multivariable: la variante se identifica por color + talla.
ALTER TABLE "product_color_stock"
    ADD COLUMN IF NOT EXISTS "size" TEXT NOT NULL DEFAULT '';

-- Las filas historicas (una por color) quedan como variante "sin talla".
DROP INDEX IF EXISTS "product_color_stock_product_id_color_key";

CREATE UNIQUE INDEX IF NOT EXISTS "product_color_stock_product_id_color_size_key"
    ON "product_color_stock" ("product_id", "color", "size");

-- Pedidos: se conserva la talla seleccionada junto al color.
ALTER TABLE "order_items"
    ADD COLUMN IF NOT EXISTS "talla" TEXT;
