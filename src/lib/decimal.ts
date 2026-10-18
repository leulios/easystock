import Decimal from "decimal.js";

// Configure Decimal precision for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

export { Decimal };

/**
 * Converts any number, string, or Decimal to a Decimal instance safely.
 */
export function toDecimal(value: string | number | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(0);
  }
  return new Decimal(value);
}

/**
 * Formats a Decimal, number, or string as a standard two-decimal currency string (e.g. "124.50").
 */
export function formatCurrency(
  value: string | number | Decimal,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  const dec = toDecimal(value);
  const num = dec.toNumber();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Computes line total: (quantity * unitPrice) - discount
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: string | number | Decimal,
  discount: string | number | Decimal = 0
): Decimal {
  const qty = new Decimal(quantity);
  const price = toDecimal(unitPrice);
  const disc = toDecimal(discount);

  const subtotal = qty.mul(price);
  const total = subtotal.minus(disc);

  return total.lessThan(0) ? new Decimal(0) : total.toDecimalPlaces(2);
}

/**
 * Computes tax amount based on taxable amount and tax rate percentage (e.g. 15 for 15%).
 */
export function calculateTax(
  taxableAmount: string | number | Decimal,
  taxRatePercent: string | number | Decimal
): Decimal {
  const amount = toDecimal(taxableAmount);
  const rate = toDecimal(taxRatePercent).div(100);
  return amount.mul(rate).toDecimalPlaces(2);
}
