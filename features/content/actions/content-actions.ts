"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  updateContentPage,
  updateFaqPage,
} from "@/services/firestore/content-pages"
import type { ActionResult } from "@/types/action-result"
import type {
  ContentPageKey,
  ContentSection,
  FaqItem,
} from "@/types/content-page"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

const PATHS_BY_KEY: Record<ContentPageKey, string> = {
  about: "/about",
  contact: "/contact",
  legal: "/legal",
  "shipping-returns": "/shipping-returns",
}

export async function updateContentPageAction(
  key: ContentPageKey,
  input: { title: string; sections: ContentSection[] }
): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await updateContentPage(key, input, session.uid)
    revalidatePath("/admin/content")
    revalidatePath(PATHS_BY_KEY[key])
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateFaqPageAction(input: {
  title: string
  items: FaqItem[]
}): Promise<ActionResult> {
  const session = await requireSession("staff")
  try {
    await updateFaqPage(input, session.uid)
    revalidatePath("/admin/content")
    revalidatePath("/faq")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
