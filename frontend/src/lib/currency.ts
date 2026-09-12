/**
 * Formats a monetary amount using the business's own currency code
 * (Business.currency from Phase 2 — e.g. "NPR", "INR"), never a
 * hardcoded one. Falls back to plain "<code> <amount>" formatting if
 * Intl doesn't recognize the code (some ISO 4217 codes render fine
 * numerically even without a locale that names them).
 */
export function formatCurrency(amount: number | string, currencyCode: string): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(numericAmount)) return `${currencyCode} —`;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currencyCode} ${numericAmount.toFixed(2)}`;
  }
}