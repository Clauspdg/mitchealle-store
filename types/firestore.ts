/**
 * Structural interface matching both `firebase/firestore` and
 * `firebase-admin/firestore` Timestamp classes, so `types/` stays
 * SDK-agnostic and usable from the client app, Server Actions, and Cloud
 * Functions alike.
 */
export interface FirestoreTimestamp {
  toDate(): Date
  toMillis(): number
  seconds: number
  nanoseconds: number
}
