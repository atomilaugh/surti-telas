-- Migration: add_custom_order_to_production_order
-- Adds customOrderId column to production_orders table

ALTER TABLE "production_orders" ADD COLUMN "custom_order_id" VARCHAR(255) UNIQUE;

ALTER TABLE "production_orders"
ADD CONSTRAINT "production_orders_custom_order_id_fkey"
FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id")
ON DELETE SET NULL;

CREATE INDEX "production_orders_custom_order_id_idx" ON "production_orders"("custom_order_id");