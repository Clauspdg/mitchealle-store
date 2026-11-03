/**
 * Notes written to an order's history when it is cancelled before payment.
 * They are read in the admin panel, which is in French: they stay French
 * whatever the customer's language.
 */
export const CANCEL_REASONS = {
  sessionFailed: "Échec de la création de la session de paiement",
  simulationAbandoned: "Paiement simulé abandonné",
} as const
