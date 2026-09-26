-- Inventario por color: una fila por color/variante del producto.
CREATE TABLE IF NOT EXISTS "product_color_stock" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "stock_status" "StockStatus" NOT NULL DEFAULT 'OK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_color_stock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_color_stock_product_id_color_key"
    ON "product_color_stock" ("product_id", "color");

CREATE INDEX IF NOT EXISTS "product_color_stock_product_id_deleted_at_idx"
    ON "product_color_stock" ("product_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "product_color_stock_stock_status_idx"
    ON "product_color_stock" ("stock_status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'product_color_stock_product_id_fkey'
    ) THEN
        ALTER TABLE "product_color_stock"
            ADD CONSTRAINT "product_color_stock_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Backfill: cada color existente arranca en 0 unidades, salvo el primero,
-- que hereda el stock global historico para no perder la cantidad total.
INSERT INTO "product_color_stock" (
    "id", "product_id", "color", "cantidad", "stock_status", "created_at", "updated_at"
)
SELECT
    md5(random()::text || clock_timestamp()::text || p."id" || c."color"),
    p."id",
    c."color",
    CASE WHEN c."ord" = 1 THEN p."cantidad_stock" ELSE 0 END,
    CASE
        WHEN (CASE WHEN c."ord" = 1 THEN p."cantidad_stock" ELSE 0 END) <= 0 THEN 'AGOTADO'::"StockStatus"
        WHEN (CASE WHEN c."ord" = 1 THEN p."cantidad_stock" ELSE 0 END) < 10 THEN 'BAJO_STOCK'::"StockStatus"
        ELSE 'OK'::"StockStatus"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "products" p
CROSS JOIN LATERAL unnest(p."colores") WITH ORDINALITY AS c("color", "ord")
WHERE p."deleted_at" IS NULL
ON CONFLICT ("product_id", "color") DO NOTHING;
