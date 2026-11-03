import * as base from "./base"
import * as customer from "./customer"
import { catalog } from "./catalog"
import { emails } from "./emails"
import { home } from "./home"
import { shell } from "./shell"
import * as shop from "./shop"

export const en = {
  ...base,
  ...shop,
  ...customer,
  shell,
  home,
  catalog,
  emails,
}

/** Every language has exactly these keys: English is the reference. */
export type Messages = typeof en
