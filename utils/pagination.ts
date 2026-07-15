/**
 * Encodes an arbitrary JSON-serializable value into an opaque, URL-safe
 * cursor token, and back. Used to pass Firestore "start after" sort-key
 * values across a Server Action boundary without exposing internals or
 * relying on non-serializable `QueryDocumentSnapshot` objects.
 *
 * Uses Web-standard `TextEncoder`/`btoa` (not Node's `Buffer`) so this stays
 * usable from both server and client code, per utils/ conventions.
 */
export function encodeCursor(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeCursor<T>(cursor: string): T {
  const padded = cursor.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}
