import { Prisma } from "@prisma/client";

const asDecimal = (value: number | string | Prisma.Decimal) =>
  new Prisma.Decimal(String(value));

export function calculateLineAmount(
  qty: number | string | Prisma.Decimal,
  unitPrice: number | string | Prisma.Decimal,
) {
  return asDecimal(qty)
    .mul(asDecimal(unitPrice))
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculateCurrencyLineAmount(
  qty: number | string | Prisma.Decimal,
  unitPrice: number | string | Prisma.Decimal,
) {
  return asDecimal(qty)
    .mul(asDecimal(unitPrice))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function calculateDocumentAmount(
  lines: Array<{ qty: number | string | Prisma.Decimal; unitPrice: number | string | Prisma.Decimal }>,
) {
  return lines
    .reduce(
      (total, line) => total.plus(calculateLineAmount(line.qty, line.unitPrice)),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

