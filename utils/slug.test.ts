import { describe, expect, it } from "vitest"

import { slugify } from "@/utils/slug"

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("Été 2026 !")).toBe("ete-2026")
  })

  it("collapses punctuation and whitespace into single hyphens", () => {
    expect(slugify("  Robe d'été -- Édition Limitée!!  ")).toBe(
      "robe-d-ete-edition-limitee"
    )
  })

  it("leaves an already-clean slug untouched", () => {
    expect(slugify("black-friday")).toBe("black-friday")
  })

  it("has no leading or trailing hyphens", () => {
    expect(slugify("--Nouveautés--")).toBe("nouveautes")
  })
})
