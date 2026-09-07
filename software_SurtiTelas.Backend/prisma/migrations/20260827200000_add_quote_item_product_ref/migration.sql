-- Add custom_order_item_id to quote_items for product-level grouping
ALTER TABLE quote_items ADD COLUMN custom_order_item_id VARCHAR(191) NULL;

CREATE INDEX idx_quote_items_custom_order_item_id ON quote_items(custom_order_item_id);
