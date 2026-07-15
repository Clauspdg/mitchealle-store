import { describe, expect, it } from "vitest"

import { generateUniqueSlug } from "@/validators/slug.validator"

describe("generateUniqueSlug", () => {
  it("returns the base slug when it doesn't exist yet", async () => {
    const slug = await generateUniqueSlug("Black Friday", async () => false)
    expect(slug).toBe("black-friday")
  })

  it("appends -2, -3... until an available slug is found", async () => {
    const taken = new Set(["black-friday", "black-friday-2", "black-friday-3"])
    const slug = await generateUniqueSlug("Black Friday", async (candidate) =>
      taken.has(candidate)
    )
    expect(slug).toBe("black-friday-4")
  })

  it("allows keeping the current slug when editing (excludes self-conflict)", async () => {
    const slug = await generateUniqueSlug(
      "Black Friday",
      async (candidate) => candidate === "black-friday",
      "black-friday"
    )
    expect(slug).toBe("black-friday")
  })
})
