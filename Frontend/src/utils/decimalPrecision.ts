export function hasAtMostDecimalPlaces(value: number, places: number): boolean {
  if (!Number.isFinite(value)) return false;

  const [coefficient, exponentText] = value.toString().toLowerCase().split("e");
  const fractionalDigits = coefficient.split(".")[1]?.length ?? 0;
  const exponent = exponentText ? Number(exponentText) : 0;

  return Math.max(0, fractionalDigits - exponent) <= places;
}

export function roundCurrency(value: number): number {
  return Number((value + Number.EPSILON).toFixed(2));
}

export function roundToPlaces(value: number, places: number): number {
  return Number(value.toFixed(places));
}

export function formatCurrency(value: number): string {
  return roundCurrency(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatStoredAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function multiplyAndDivideToPlaces(
  factors: number[],
  divisor: number,
  places: number,
): number {
  let coefficient = 1n;
  let scale = 0;

  for (const value of factors) {
    const [mantissa, exponentText] = Math.abs(value)
      .toString()
      .toLowerCase()
      .split("e");
    const [whole, fraction = ""] = mantissa.split(".");
    let factor = BigInt(`${whole}${fraction}`);
    let factorScale = fraction.length - (exponentText ? Number(exponentText) : 0);
    if (factorScale < 0) {
      factor *= 10n ** BigInt(-factorScale);
      factorScale = 0;
    }
    coefficient *= value < 0 ? -factor : factor;
    scale += factorScale;
  }

  const [divisorMantissa, divisorExponentText] = Math.abs(divisor)
    .toString()
    .toLowerCase()
    .split("e");
  const [divisorWhole, divisorFraction = ""] = divisorMantissa.split(".");
  const divisorCoefficient = BigInt(`${divisorWhole}${divisorFraction}`);
  let divisorScale =
    divisorFraction.length - (divisorExponentText ? Number(divisorExponentText) : 0);
  if (divisorScale < 0) {
    divisorScale = 0;
  }
  if (divisor < 0) coefficient *= -1n;

  const effectiveScale = scale - divisorScale;
  let numerator = coefficient;
  let denominator = divisorCoefficient;
  if (places >= effectiveScale) {
    numerator *= 10n ** BigInt(places - effectiveScale);
  } else {
    denominator *= 10n ** BigInt(effectiveScale - places);
  }

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  coefficient = quotient +
    ((remainder < 0n ? -remainder : remainder) * 2n >= denominator
      ? numerator < 0n ? -1n : 1n
      : 0n);

  const sign = coefficient < 0 ? "-" : "";
  const digits = (coefficient < 0 ? -coefficient : coefficient)
    .toString()
    .padStart(places + 1, "0");
  const whole = digits.slice(0, -places) || "0";
  const fraction = places ? `.${digits.slice(-places)}` : "";

  return Number(`${sign}${whole}${fraction}`);
}
