import type {
  ProductModerationStatus,
  SellerApplicationStatus,
  SellerDecisionType,
  SellerMemberRole,
  SellerStatus,
} from "@/types/seller"

export const APPLICATION_STATUS_LABELS: Record<
  SellerApplicationStatus,
  string
> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
}

export const APPLICATION_STATUS_BADGE: Record<SellerApplicationStatus, string> =
  {
    pending: "bg-accent-gold-muted text-accent-gold-foreground",
    approved: "bg-brand-blue text-white",
    rejected: "bg-destructive/10 text-destructive",
  }

export const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "En attente",
  active: "Active",
  suspended: "Suspendue",
  closed: "Fermée",
}

export const SELLER_STATUS_BADGE: Record<SellerStatus, string> = {
  pending: "bg-muted text-foreground",
  active: "bg-brand-blue text-white",
  suspended: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
}

export const MEMBER_ROLE_LABELS: Record<SellerMemberRole, string> = {
  owner: "Propriétaire",
  manager: "Gestionnaire",
  staff: "Personnel",
}

export const DECISION_LABELS: Record<SellerDecisionType, string> = {
  application_submitted: "Candidature déposée",
  application_approved: "Candidature approuvée",
  application_rejected: "Candidature refusée",
  seller_suspended: "Boutique suspendue",
  seller_activated: "Boutique réactivée",
  product_submitted: "Produit soumis",
  product_approved: "Produit approuvé",
  product_rejected: "Produit refusé",
}

export const MODERATION_LABELS: Record<ProductModerationStatus, string> = {
  pending: "En modération",
  approved: "Approuvé",
  rejected: "Refusé",
}

export const MODERATION_BADGE: Record<ProductModerationStatus, string> = {
  pending: "bg-accent-gold-muted text-accent-gold-foreground",
  approved: "bg-brand-blue text-white",
  rejected: "bg-destructive/10 text-destructive",
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Hors ligne",
  published: "En ligne",
  archived: "Archivé",
}

export function formatDateTime(millis: number | null): string {
  return millis
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(millis)
    : "—"
}
