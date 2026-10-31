-- Preserve twelve decimal places throughout BOM-driven production quantities.
ALTER TABLE "bom_lines"
  ALTER COLUMN "qtyPer" TYPE DECIMAL(30, 12);

ALTER TABLE "inventory_batches"
  ALTER COLUMN "qtyOnHand" TYPE DECIMAL(30, 12);

ALTER TABLE "inventory_ledger"
  ALTER COLUMN "qty" TYPE DECIMAL(30, 12),
  ALTER COLUMN "runningQty" TYPE DECIMAL(30, 12);

ALTER TABLE "production_orders"
  ALTER COLUMN "qtyTarget" TYPE DECIMAL(30, 12),
  ALTER COLUMN "qtyProduced" TYPE DECIMAL(30, 12);

ALTER TABLE "wip_ledger"
  ALTER COLUMN "qty" TYPE DECIMAL(30, 12);
