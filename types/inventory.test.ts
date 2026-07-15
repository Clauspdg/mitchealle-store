import { describe, expect, it } from "vitest"

import { DEFAULT_VARIANT_ID, variantIdsOrDefault } from "@/types/inventory"

describe("variantIdsOrDefault", () => {
  it("returns the default variant id for a simple product with no variants", () => {
    expect(variantIdsOrDefault([])).toEqual([DEFAULT_VARIANT_ID])
  })

  it("returns the real variant ids when the product has variants", () => {
    expect(variantIdsOrDefault(["S-black", "M-black"])).toEqual([
      "S-black",
      "M-black",
    ])
  })
})
