import { describe, expect, it } from "vitest"

import { loginSchema, registerSchema } from "@/schemas/auth.schema"

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "client@example.com",
      password: "hunter2",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "hunter2",
    })
    expect(result.success).toBe(false)
  })
})

describe("registerSchema", () => {
  const base = {
    displayName: "Client Test",
    email: "client@example.com",
    password: "supersecret",
    confirmPassword: "supersecret",
    acceptTerms: true,
  }

  it("accepts matching passwords and accepted terms", () => {
    expect(registerSchema.safeParse(base).success).toBe(true)
  })

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: "different",
    })
    expect(result.success).toBe(false)
  })

  it("rejects unaccepted terms", () => {
    const result = registerSchema.safeParse({ ...base, acceptTerms: false })
    expect(result.success).toBe(false)
  })
})
