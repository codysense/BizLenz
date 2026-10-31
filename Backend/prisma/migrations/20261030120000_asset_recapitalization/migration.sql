-- Support prospective asset recapitalization and finer disposal proceeds.
ALTER TABLE "assets"
  ALTER COLUMN "disposalAmount" SET DATA TYPE DECIMAL(15,4);

CREATE TABLE "asset_recapitalizations" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "transactionType" TEXT NOT NULL,
  "usefulLifeExtension" INTEGER NOT NULL DEFAULT 0,
  "previousAcquisitionCost" DECIMAL(15,2) NOT NULL,
  "newAcquisitionCost" DECIMAL(15,2) NOT NULL,
  "previousUsefulLife" INTEGER NOT NULL,
  "newUsefulLife" INTEGER NOT NULL,
  "sourceAccountId" TEXT,
  "journalId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_recapitalizations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "asset_recapitalizations"
  ADD CONSTRAINT "asset_recapitalizations_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_recapitalizations"
  ADD CONSTRAINT "asset_recapitalizations_sourceAccountId_fkey"
  FOREIGN KEY ("sourceAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_recapitalizations"
  ADD CONSTRAINT "asset_recapitalizations_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "asset_recapitalizations"
  ADD CONSTRAINT "asset_recapitalizations_journalId_fkey"
  FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
