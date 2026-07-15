import { describe, expect, it } from "vitest"

import { decodeCursor, encodeCursor } from "@/utils/pagination"

describe("cursor encode/decode", () => {
  it("round-trips a simple payload", () => {
    const payload = { sortValue: 42, id: "abc123" }
    const cursor = encodeCursor(payload)
    expect(decodeCursor(cursor)).toEqual(payload)
  })

  it("round-trips non-ASCII values (e.g. accented product names)", () => {
    const payload = { sortValue: "été", id: "xyz" }
    const cursor = encodeCursor(payload)
    expect(decodeCursor(cursor)).toEqual(payload)
  })

  it("produces a URL-safe token (no +, /, or = characters)", () => {
    const cursor = encodeCursor({ sortValue: "a".repeat(50), id: "1" })
    expect(cursor).not.toMatch(/[+/=]/)
  })
})
