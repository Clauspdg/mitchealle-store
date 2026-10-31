import { afterEach, describe, expect, it, vi } from "vitest"

async function loadRobots() {
  vi.resetModules()
  const { default: robots } = await import("@/app/robots")
  return robots()
}

describe("robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("blocks every crawler on DEV and exposes no sitemap", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "dev")
    expect(await loadRobots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    })
  })

  it("keeps the production rules by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "")
    const result = await loadRobots()
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" })
    expect(result.sitemap).toContain("/sitemap.xml")
  })
})
