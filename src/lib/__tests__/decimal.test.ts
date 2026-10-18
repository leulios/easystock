import { describe, it, expect } from "vitest";
import {
  toDecimal,
  calculateLineTotal,
  calculateTax,
  formatCurrency,
  Decimal,
} from "../decimal";

describe("Decimal Financial Utilities", () => {
  it("prevents floating-point drift in line total calculations", () => {
    // In IEEE 754 float: 0.1 + 0.2 = 0.30000000000000004
    // 3 * 19.99 = 59.970000000000006
    const lineTotal = calculateLineTotal(3, "19.99", "5.00");
    expect(lineTotal.toString()).toBe("54.97");
  });

  it("handles line totals with zero and excess discounts safely", () => {
    const normal = calculateLineTotal(2, 50, 0);
    expect(normal.toString()).toBe("100");

    // Discount exceeds line total -> clamp to 0
    const clamped = calculateLineTotal(1, 20, 30);
    expect(clamped.toString()).toBe("0");
  });

  it("calculates exact sales tax without floating-point artifacts", () => {
    // 15% tax on 89.95
    const tax = calculateTax("89.95", 15);
    // 89.95 * 0.15 = 13.4925 -> rounded to 13.49
    expect(tax.toString()).toBe("13.49");

    // 8.25% tax on 199.99
    const complexTax = calculateTax("199.99", "8.25");
    // 199.99 * 0.0825 = 16.499175 -> rounded to 16.5
    expect(complexTax.toString()).toBe("16.5");
  });

  it("formats currency strings consistently", () => {
    const formatted = formatCurrency("1250.5", "USD", "en-US");
    expect(formatted).toBe("$1,250.50");
  });

  it("safely handles null and undefined values in toDecimal", () => {
    expect(toDecimal(null).toString()).toBe("0");
    expect(toDecimal(undefined).toString()).toBe("0");
    expect(toDecimal(42).toString()).toBe("42");
  });
});
