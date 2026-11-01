ALTER TABLE "audit_log"
  ADD COLUMN "requestJson" JSONB,
  ADD COLUMN "metadataJson" JSONB;
