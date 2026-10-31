export function hasAtMostDecimalPlaces(value: number, places: number): boolean {
  if (!Number.isFinite(value)) return false;

  const [coefficient, exponentText] = value.toString().toLowerCase().split("e");
  const fractionalDigits = coefficient.split(".")[1]?.length ?? 0;
  const exponent = exponentText ? Number(exponentText) : 0;

  return Math.max(0, fractionalDigits - exponent) <= places;
}
