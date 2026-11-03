import type { Messages } from "@/i18n/messages/en"

export const emails: Messages["emails"] = {
  hello: "Bonjour,",
  viewOrder: "Voir ma commande",
  trackOrder: "Suivre ma commande",
  total: "Total : {amount}",
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
