import { describe, expect, it } from "vitest"

import { isPhoneNumber, STORE_TIME, storeDay } from "@/config/region"

describe("store time", () => {
  it("reads a late evening in Nassau as that day, not the next one", () => {
    const evening = new Date("2026-11-03T03:30:00Z")
    expect(storeDay(evening)).toBe("2026-11-02")
    expect(evening.toLocaleDateString("fr-FR", STORE_TIME)).toBe("02/11/2026")
  })

  it("follows daylight saving time", () => {
    expect(storeDay(new Date("2026-07-02T03:30:00Z"))).toBe("2026-07-01")
    expect(storeDay(new Date("2026-07-02T04:30:00Z"))).toBe("2026-07-02")
  })
})

describe("isPhoneNumber", () => {
  it("refuses the pre-filled prefix alone", () => {
    expect(isPhoneNumber("+1 242 ")).toBe(false)
  })

  it("accepts Bahamian numbers and other countries", () => {
    expect(isPhoneNumber("+1 242 555 0100")).toBe(true)
    expect(isPhoneNumber("+509 3700 0000")).toBe(true)
  })
})
