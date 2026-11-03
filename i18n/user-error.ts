import "server-only"

import { translatorFor } from "@/i18n/dictionaries"
import type { MessageKey, Params, Translator } from "@/i18n/translate"

/**
 * An error meant for the customer, carried as a dictionary key. Its
 * `message` stays the French text it always was, for callers that show it
 * as is (the admin panel, which is not translated yet).
 */
export class UserError extends Error {
  constructor(
    readonly key: MessageKey,
    readonly params?: Params
  ) {
    super(translatorFor("fr").t(key, params))
    this.name = "UserError"
  }
}

/** What to tell the visitor: the error's own text when it is meant for
 * them, a generic one otherwise (never an internal message). */
export function userMessage(
  error: unknown,
  { t }: Pick<Translator, "t">,
  fallback: MessageKey = "common.genericError"
): string {
  return error instanceof UserError ? t(error.key, error.params) : t(fallback)
}
