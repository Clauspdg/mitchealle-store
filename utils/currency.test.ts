import { describe, expect, it } from "vitest"

import { formatPriceMinor } from "@/utils/currency"

describe("formatPriceMinor", () => {
  it("converts minor units to a formatted currency string", () => {
    const formatted = formatPriceMinor(1999, "USD", "en-US")
    expect(formatted).toBe("$19.99")
  })

  it("handles zero", () => {
    expect(formatPriceMinor(0, "USD", "en-US")).toBe("$0.00")
  })
})
