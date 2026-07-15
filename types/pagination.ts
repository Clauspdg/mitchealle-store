/**
 * Cursor-based pagination result. `nextCursor` is an opaque, serializable
 * token (safe to pass through a Server Action / the network) — never a raw
 * Firestore `QueryDocumentSnapshot`, which isn't serializable. See
 * `services/firestore/pagination.ts` for how it's encoded/decoded.
 */
export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}
