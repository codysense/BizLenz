CREATE TABLE "document_number_sequences" (
  "sequenceKey" TEXT NOT NULL,
  "lastValue" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_number_sequences_pkey" PRIMARY KEY ("sequenceKey")
);

-- Start each sequence after the largest valid number already stored. Purchase
-- orders and production orders share the PO prefix; purchase returns and
-- purchase refunds share PR, so each prefix has one counter across both tables.
INSERT INTO "document_number_sequences" ("sequenceKey", "lastValue", "updatedAt")
SELECT 'cash_transaction', COALESCE(MAX(substring("transactionNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "cash_transactions" WHERE "transactionNo" ~ '^CT[0-9]+$'
UNION ALL
SELECT 'journal', COALESCE(MAX(substring("journalNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "journals" WHERE "journalNo" ~ '^J[0-9]+$'
UNION ALL
SELECT 'customer_payment', COALESCE(MAX(substring("paymentNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "customer_payments" WHERE "paymentNo" ~ '^CP[0-9]+$'
UNION ALL
SELECT 'sales_refund', COALESCE(MAX(substring("refundNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "sales_refunds" WHERE "refundNo" ~ '^RF[0-9]+$'
UNION ALL
SELECT 'vendor_payment', COALESCE(MAX(substring("paymentNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "vendor_payments" WHERE "paymentNo" ~ '^VP[0-9]+$'
UNION ALL
SELECT 'purchase_refund_return', GREATEST(
  COALESCE((SELECT MAX(substring("refundNo" from '[0-9]+$')::BIGINT) FROM "purchase_refunds" WHERE "refundNo" ~ '^PR[0-9]+$'), 0),
  COALESCE((SELECT MAX(substring("returnNo" from '[0-9]+$')::BIGINT) FROM "purchase_returns" WHERE "returnNo" ~ '^PR[0-9]+$'), 0)
), NOW()
UNION ALL
SELECT 'memo', COALESCE(MAX(substring("memoNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "memo" WHERE "memoNo" ~ '^M[0-9]+$'
UNION ALL
SELECT 'asset', COALESCE(MAX(substring("assetNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "assets" WHERE "assetNo" ~ '^AST[0-9]+$'
UNION ALL
SELECT 'purchase_production_order', GREATEST(
  COALESCE((SELECT MAX(substring("orderNo" from '[0-9]+$')::BIGINT) FROM "purchases" WHERE "orderNo" ~ '^PO[0-9]+$'), 0),
  COALESCE((SELECT MAX(substring("orderNo" from '[0-9]+$')::BIGINT) FROM "production_orders" WHERE "orderNo" ~ '^PO[0-9]+$'), 0)
), NOW()
UNION ALL
SELECT 'sale', COALESCE(MAX(substring("orderNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "sales" WHERE "orderNo" ~ '^SO[0-9]+$'
UNION ALL
SELECT 'sales_return', COALESCE(MAX(substring("returnNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "sales_returns" WHERE "returnNo" ~ '^SR[0-9]+$'
UNION ALL
SELECT 'pos_document', GREATEST(
  COALESCE((SELECT MAX(substring("sessionNo" from '[0-9]+$')::BIGINT) FROM "pos_sessions" WHERE "sessionNo" ~ '^POS[0-9]+$'), 0),
  COALESCE((SELECT MAX(substring("saleNo" from '[0-9]+$')::BIGINT) FROM "pos_sales" WHERE "saleNo" ~ '^POS[0-9]+$'), 0)
), NOW()
UNION ALL
SELECT 'pending_pos_sale', COALESCE(MAX(substring("saleNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "pending_pos_sales" WHERE "saleNo" ~ '^P-[0-9]+$'
UNION ALL
SELECT 'pos_return', COALESCE(MAX(substring("returnNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "pos_returns" WHERE "returnNo" ~ '^RTN[0-9]+$'
UNION ALL
SELECT 'opening_stock', COALESCE(MAX(substring("referenceNo" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "opening_stock" WHERE "referenceNo" ~ '^OS[0-9]+$'
UNION ALL
SELECT 'item_sku', COALESCE(MAX(substring("sku" from '[0-9]+$')::BIGINT), 0), NOW()
FROM "items" WHERE "sku" ~ '^ITM-[0-9]+$';
