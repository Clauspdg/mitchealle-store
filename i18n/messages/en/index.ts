import * as base from "./base"
import { catalog } from "./catalog"
import { emails } from "./emails"
import { home } from "./home"
import { shell } from "./shell"
import * as shop from "./shop"

export const en = { ...base, ...shop, shell, home, catalog, emails }

/** Every language has exactly these keys: English is the reference. */
export type Messages = typeof en
