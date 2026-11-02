import { describe, expect, it } from "vitest"

import { formatPriceMinor } from "@/utils/currency"

describe("formatPriceMinor", () => {
  it("converts minor units to a formatted currency string", () => {
    const formatted = formatPriceMinor(1999, "USD", "en-US")
    expect(formatted).toBe("$19.99")
  })

  it("shows the Bahamian dollar as B$, in whole cents", () => {
    expect(formatPriceMinor(123_450, "BSD")).toBe("B$1,234.50")
    expect(formatPriceMinor(5, "BSD")).toBe("B$0.05")
    expect(formatPriceMinor(0, "BSD")).toBe("B$0.00")
    expect(formatPriceMinor(-500, "BSD")).toBe("-B$5.00")
  })

  it("keeps historical HTG amounts in HTG, with the same digits", () => {
    const formatted = formatPriceMinor(125_000, "HTG")
    expect(formatted).toContain("1")
    expect(formatted).toContain("250,00")
    expect(formatted).toContain("HTG")
    expect(formatted).not.toContain("B$")
  })

  it("handles zero", () => {
    expect(formatPriceMinor(0, "USD", "en-US")).toBe("$0.00")
  })
})
