/** Uniform return shape for Server Actions, so client callers can branch without try/catch. */
export type ActionResult<T = undefined> =
  { success: true; data: T } | { success: false; error: string }
