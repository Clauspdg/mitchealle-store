/**
 * True when a Firestore query failed because a required composite index
 * hasn't been deployed yet (`FAILED_PRECONDITION`, gRPC code 9). Public
 * storefront list pages treat this as "no results yet" instead of crashing
 * into the error boundary — the underlying error is still logged so the
 * gap doesn't go unnoticed, and Firestore's own error message already
 * includes a direct Firebase Console link to create the missing index.
 */
export function isMissingIndexError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 9
  )
}
