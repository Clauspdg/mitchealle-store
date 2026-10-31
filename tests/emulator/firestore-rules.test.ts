import { readFileSync } from "node:fs"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { afterAll, beforeAll, describe, it } from "vitest"

// Its own project, so loading rules never touches the data of the other
// emulator tests.
const PROJECT_ID = "demo-clag-rules"

let env: RulesTestEnvironment

beforeAll(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":")
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host,
      port: Number(port),
    },
  })

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "sellers/store-a"), { name: "A", status: "active" })
    await setDoc(doc(db, "sellers/store-p"), { name: "P", status: "pending" })
    await setDoc(doc(db, "sellers/store-a/private/profile"), {
      contactEmail: "a@demo.clag.test",
    })
    await setDoc(doc(db, "sellerMembers/store-a_owner-a"), {
      sellerId: "store-a",
      uid: "owner-a",
      role: "owner",
      status: "active",
    })
    await setDoc(doc(db, "products/legacy"), { name: "L", status: "published" })
  })
})

afterAll(async () => {
  await env.cleanup()
})

const owner = () => env.authenticatedContext("owner-a").firestore()
const admin = () =>
  env.authenticatedContext("admin-1", { role: "admin" }).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

describe("sellers", () => {
  it("lets anyone read an active store", async () => {
    await assertSucceeds(getDoc(doc(anonymous(), "sellers/store-a")))
  })

  it("hides a store that isn't active", async () => {
    await assertFails(getDoc(doc(anonymous(), "sellers/store-p")))
  })

  it("refuses every client write, even from the owner or an admin", async () => {
    await assertFails(
      setDoc(doc(owner(), "sellers/store-a"), { status: "active" })
    )
    await assertFails(
      setDoc(doc(admin(), "sellers/store-b"), { status: "active" })
    )
  })
})

describe("private store data", () => {
  it("is never readable by a client", async () => {
    for (const db of [anonymous(), owner(), admin()]) {
      await assertFails(getDoc(doc(db, "sellers/store-a/private/profile")))
    }
  })
})

describe("sellerMembers", () => {
  it("is never readable by a client, not even the member", async () => {
    for (const db of [anonymous(), owner(), admin()]) {
      await assertFails(getDoc(doc(db, "sellerMembers/store-a_owner-a")))
    }
  })

  it("can't be forged to self-grant a store", async () => {
    await assertFails(
      setDoc(doc(owner(), "sellerMembers/store-b_owner-a"), {
        sellerId: "store-b",
        uid: "owner-a",
        role: "owner",
        status: "active",
      })
    )
  })
})

describe("existing rules", () => {
  it("still serve published products to anyone", async () => {
    await assertSucceeds(getDoc(doc(anonymous(), "products/legacy")))
  })
})
