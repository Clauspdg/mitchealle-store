import { onRequest } from "firebase-functions/v2/https"

/**
 * Infrastructure smoke-test endpoint — confirms the Functions deployment
 * pipeline, region, and runtime are wired correctly. Not a business feature.
 */
export const healthCheck = onRequest(
  { region: "europe-west1" },
  (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  }
)
