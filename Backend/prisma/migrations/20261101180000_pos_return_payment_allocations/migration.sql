CREATE TABLE "pos_return_payments" (
  "id" TEXT NOT NULL,
  "posReturnId" TEXT NOT NULL,
  "originalSalePaymentId" TEXT NOT NULL,
  "cashAccountId" TEXT,
  "method" "PosPaymentMethod" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_return_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pos_return_payments_posReturnId_originalSalePaymentId_key"
  ON "pos_return_payments"("posReturnId", "originalSalePaymentId");
CREATE INDEX "pos_return_payments_originalSalePaymentId_idx"
  ON "pos_return_payments"("originalSalePaymentId");
ALTER TABLE "pos_return_payments"
  ADD CONSTRAINT "pos_return_payments_posReturnId_fkey"
  FOREIGN KEY ("posReturnId") REFERENCES "pos_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_return_payments"
  ADD CONSTRAINT "pos_return_payments_originalSalePaymentId_fkey"
  FOREIGN KEY ("originalSalePaymentId") REFERENCES "pos_sale_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_return_payments"
  ADD CONSTRAINT "pos_return_payments_cashAccountId_fkey"
  FOREIGN KEY ("cashAccountId") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
