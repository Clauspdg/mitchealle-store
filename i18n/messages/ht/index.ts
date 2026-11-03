import type { Messages } from "@/i18n/messages/en"

import * as base from "./base"
import { catalog } from "./catalog"
import { emails } from "./emails"
import { home } from "./home"
import { shell } from "./shell"
import * as shop from "./shop"

export const ht: Messages = { ...base, ...shop, shell, home, catalog, emails }
