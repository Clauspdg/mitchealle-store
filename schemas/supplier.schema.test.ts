import { describe, expect, it } from "vitest"

import { supplierFormSchema } from "@/schemas/supplier.schema"

function validSupplier(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Textiles Caraïbes",
    company: null,
    contactName: null,
    email: null,
    phone: null,
    country: "HT",
    address: null,
    currency: "USD",
    paymentTerms: null,
    averageLeadTimeDays: null,
    isActive: true,
    notes: null,
    ...overrides,
  }
}

describe("supplierFormSchema", () => {
  it("accepts a valid supplier", () => {
    expect(supplierFormSchema.safeParse(validSupplier()).success).toBe(true)
  })

  it("rejects a currency code that isn't 3 letters", () => {
    const result = supplierFormSchema.safeParse(
      validSupplier({ currency: "US" })
    )
    expect(result.success).toBe(false)
  })

  it("rejects an invalid email", () => {
    const result = supplierFormSchema.safeParse(
      validSupplier({ email: "not-an-email" })
    )
    expect(result.success).toBe(false)
  })

  it("accepts an empty-string email (treated as absent)", () => {
    const result = supplierFormSchema.safeParse(validSupplier({ email: "" }))
    expect(result.success).toBe(true)
  })
})
