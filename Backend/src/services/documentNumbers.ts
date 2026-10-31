import { Prisma } from "@prisma/client";

/**
 * Allocate a unique number for a document type inside the caller's transaction.
 * Counters are retained independently of documents, so deleting a draft never
 * makes an already-issued number available again.
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  sequenceKey: string,
  prefix: string,
  width = 6,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ lastValue: bigint }>>`
    INSERT INTO "document_number_sequences" ("sequenceKey", "lastValue", "updatedAt")
    VALUES (${sequenceKey}, 1, NOW())
    ON CONFLICT ("sequenceKey") DO UPDATE
      SET "lastValue" = "document_number_sequences"."lastValue" + 1,
          "updatedAt" = NOW()
    RETURNING "lastValue"
  `;

  if (rows.length !== 1) {
    throw new Error(`Unable to allocate ${sequenceKey} document number`);
  }

  return `${prefix}${rows[0].lastValue.toString().padStart(width, "0")}`;
}
