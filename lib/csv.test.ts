import { describe, expect, it } from "vitest"

import { escapeCsvField, parseCsv, parseCsvRecords, toCsv } from "./csv"

describe("escapeCsvField", () => {
  it("leaves plain values untouched", () => {
    expect(escapeCsvField("hello")).toBe("hello")
  })

  it("quotes values containing a comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"')
  })

  it("quotes and escapes embedded quotes", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it("quotes values containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"')
  })
})

describe("toCsv", () => {
  it("joins rows and escapes as needed", () => {
    expect(
      toCsv([
        ["a", "b,c"],
        ["1", "2"],
      ])
    ).toBe('a,"b,c"\n1,2')
  })
})

describe("parseCsv", () => {
  it("parses plain comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ])
  })

  it("parses quoted fields containing commas", () => {
    expect(parseCsv('name,note\n"Doe, John",hello')).toEqual([
      ["name", "note"],
      ["Doe, John", "hello"],
    ])
  })

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsv('note\n"she said ""hi"""')).toEqual([
      ["note"],
      ['she said "hi"'],
    ])
  })

  it("parses a newline embedded in a quoted field", () => {
    expect(parseCsv('note\n"line1\nline2"')).toEqual([
      ["note"],
      ["line1\nline2"],
    ])
  })

  it("round-trips through toCsv", () => {
    const rows = [
      ["name", "note"],
      ["Doe, John", 'said "hi"'],
    ]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })

  it("ignores a trailing blank line", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })
})

describe("parseCsvRecords", () => {
  it("maps rows to header-keyed records", () => {
    expect(parseCsvRecords("name,sku\nFoulard,FOU-1\nRobe,ROB-2")).toEqual([
      { name: "Foulard", sku: "FOU-1" },
      { name: "Robe", sku: "ROB-2" },
    ])
  })

  it("returns an empty array for an empty string", () => {
    expect(parseCsvRecords("")).toEqual([])
  })

  it("trims header whitespace", () => {
    expect(parseCsvRecords(" name , sku \nFoulard,FOU-1")).toEqual([
      { name: "Foulard", sku: "FOU-1" },
    ])
  })
})
