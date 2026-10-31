import { readFileSync } from "node:fs"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { getBytes, ref, uploadBytes } from "firebase/storage"
import { afterAll, beforeAll, describe, it } from "vitest"

const PROJECT_ID = "demo-clag"
const BYTES = new Uint8Array([137, 80, 78, 71])
const FILES = [
  "catalog/products/a.png",
  "sellers/store-a/products/a.png",
  "sellers/store-a/logo/a.png",
  "seller-applications/applicant/a.png",
]

let env: RulesTestEnvironment

beforeAll(async () => {
  const [host, port] = process.env.FIREBASE_STORAGE_EMULATOR_HOST!.split(":")
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host,
      port: Number(port),
    },
  })
  await env.withSecurityRulesDisabled(async (context) => {
    for (const path of FILES) {
      await uploadBytes(ref(context.storage(), path), BYTES)
    }
  })
})

afterAll(async () => {
  await env.cleanup()
})

const visitor = () => env.unauthenticatedContext().storage()
const applicant = () => env.authenticatedContext("applicant").storage()
const admin = () =>
  env.authenticatedContext("admin-1", { role: "admin" }).storage()

describe("storage rules", () => {
  it("lets anyone read catalog and store product images and logos", async () => {
    for (const path of FILES.slice(0, 3)) {
      await assertSucceeds(getBytes(ref(visitor(), path)))
    }
  })

  it("keeps application files private, even for their applicant or an admin client", async () => {
    const path = "seller-applications/applicant/a.png"
    await assertFails(getBytes(ref(visitor(), path)))
    await assertFails(getBytes(ref(applicant(), path)))
    await assertFails(getBytes(ref(admin(), path)))
  })

  it("refuses every client write, including into a store's own folder", async () => {
    for (const path of [
      "sellers/store-a/products/new.png",
      "sellers/store-a/logo/new.png",
      "catalog/products/new.png",
      "seller-applications/applicant/new.png",
    ]) {
      await assertFails(uploadBytes(ref(applicant(), path), BYTES))
      await assertFails(uploadBytes(ref(admin(), path), BYTES))
    }
  })

  it("refuses reads outside the public folders", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), "private/x.png"), BYTES)
    })
    await assertFails(getBytes(ref(visitor(), "private/x.png")))
  })
})
