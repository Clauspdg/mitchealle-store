import type { Messages } from "@/i18n/messages/en"

export const emails: Messages["emails"] = {
  hello: "Bonjour,",
  viewOrder: "Voir ma commande",
  trackOrder: "Suivre ma commande",
  total: "Total : {amount}",
  viewReturn: "Voir ma demande",
  returnAccepted: {
    subject: "Votre demande de retour a été acceptée",
    body: "Votre demande de retour pour la commande liée a été <strong>acceptée</strong>.",
  },
  returnRejected: {
    subject: "Votre demande de retour a été refusée",
    body: "Votre demande de retour a été <strong>refusée</strong>.",
    reason: "Motif : {reason}",
    noReason: "Non spécifié",
  },
  returnRefunded: {
    subject: "Votre retour a été remboursé",
    body: "Votre retour a été remboursé pour un montant de {amount}.",
  },
  confirmation: {
    subject: "Commande {number} reçue",
    body: "Nous avons bien reçu votre commande {number}.",
  },
  payment: {
    subject: "Paiement confirmé pour la commande {number}",
    body: "Votre paiement pour la commande {number} a bien été confirmé.",
    paid: "Total réglé : {amount}",
  },
  shipped: {
    subject: "Votre commande {number} est en route",
    body: "Votre commande {number} a été expédiée.",
    tracking: "Numéro de suivi : {tracking}",
    sms: "Votre commande {number} a été expédiée.",
  },
  delivered: {
    subject: "Votre commande {number} a été livrée",
    body: "Votre commande {number} a été livrée. Nous espérons qu'elle vous plaira !",
    sms: "Votre commande {number} a été livrée.",
  },
  refunded: {
    subject: "Commande {number} remboursée",
    body: "Votre commande {number} a été remboursée pour un montant de {amount}.",
  },
}
