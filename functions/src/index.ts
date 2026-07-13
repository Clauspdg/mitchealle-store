/**
 * Cloud Functions entry point.
 *
 * Sprint 1 scope: Authentication + roles foundations only. Product,
 * order, payment, and delivery triggers are intentionally not implemented
 * yet — see /docs/firestore-architecture.md and /docs/sprint-1-report.md.
 *
 * Modules:
 *   - auth/       Auth triggers (custom claims, profile sync) — implemented
 *   - firestore/  Firestore triggers (order totals, stock decrement, notifications) — not yet
 *   - http/       Callable / HTTPS endpoints — health check + setUserRole implemented
 *   - scheduled/  Scheduled jobs (pre-order status sweep, cleanup) — not yet
 */

export { healthCheck } from "./http/health-check"
export { setUserRole } from "./http/set-user-role"

export { beforeCreate } from "./auth/before-create"
export { onUserCreated } from "./auth/on-user-created"
export { onUserDeleted } from "./auth/on-user-deleted"
