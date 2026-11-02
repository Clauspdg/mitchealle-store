import { describe, expect, it } from "vitest"

import { loginHref, safeRedirectPath } from "@/lib/safe-redirect"

describe("safeRedirectPath", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeRedirectPath("/cart")).toBe("/cart")
    expect(safeRedirectPath("/products/sac?color=bleu")).toBe(
      "/products/sac?color=bleu"
    )
    expect(safeRedirectPath(["/checkout", "/x"])).toBe("/checkout")
  })

  it("falls back to the home page when there is nothing to return to", () => {
    expect(safeRedirectPath(undefined)).toBe("/")
    expect(safeRedirectPath(null)).toBe("/")
    expect(safeRedirectPath("")).toBe("/")
  })

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/javascript:alert(1)",
    "cart",
    "/ /evil",
  ])("refuses %s", (value) => {
    expect(safeRedirectPath(value)).toBe("/")
  })

  it("never sends a signed-in user back to an auth page", () => {
    expect(safeRedirectPath("/login")).toBe("/")
    expect(safeRedirectPath("/login?redirect=/cart")).toBe("/")
    expect(safeRedirectPath("/register")).toBe("/")
    expect(safeRedirectPath("/loginx")).toBe("/loginx")
  })
})

describe("loginHref", () => {
  it("brings the visitor back to the page they were on", () => {
    expect(loginHref("/products/sac")).toBe("/login?redirect=%2Fproducts%2Fsac")
    expect(loginHref("/products/sac", "/register")).toBe(
      "/register?redirect=%2Fproducts%2Fsac"
    )
  })

  it("adds nothing from the home page or an auth page", () => {
    expect(loginHref("/")).toBe("/login")
    expect(loginHref("/login")).toBe("/login")
  })
})
