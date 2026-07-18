"use client"

/**
 * Exchanges a Firebase ID token for the httpOnly `session` cookie and waits
 * for the response before the caller navigates. Signing in with the client
 * SDK does not by itself make the server aware of the session — without
 * awaiting this first, a client-side redirect to a protected route can reach
 * the server before the cookie exists, bouncing the user back to /login.
 */
export async function syncSessionCookie(idToken: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  })

  if (!response.ok) {
    throw new Error("La création de la session a échoué.")
  }
}

export async function clearSessionCookie(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" })
}
