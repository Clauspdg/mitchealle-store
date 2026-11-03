import type { Messages } from "@/i18n/messages/en"

export const emails: Messages["emails"] = {
  hello: "Bonjou,",
  viewOrder: "Wè kòmand mwen",
  trackOrder: "Swiv kòmand mwen",
  total: "Total: {amount}",
  viewReturn: "Wè demann mwen",
  returnAccepted: {
    subject: "Nou aksepte demann retou ou",
    body: "Nou <strong>aksepte</strong> demann retou ou pou kòmand sa a.",
  },
  returnRejected: {
    subject: "Nou refize demann retou ou",
    body: "Nou <strong>refize</strong> demann retou ou.",
    reason: "Rezon: {reason}",
    noReason: "Pa presize",
  },
  returnRefunded: {
    subject: "Nou ranbouse retou ou",
    body: "Nou ranbouse retou ou pou yon montan {amount}.",
  },
  confirmation: {
    subject: "Nou resevwa kòmand {number}",
    body: "Nou byen resevwa kòmand ou {number}.",
  },
  payment: {
    subject: "Peman konfime pou kòmand {number}",
    body: "Peman ou pou kòmand {number} konfime.",
    paid: "Montan ou peye: {amount}",
  },
  shipped: {
    subject: "Kòmand ou {number} sou wout",
    body: "Nou voye kòmand ou {number}.",
    tracking: "Nimewo swivi: {tracking}",
    sms: "Nou voye kòmand ou {number}.",
  },
  delivered: {
    subject: "Kòmand ou {number} rive",
    body: "Kòmand ou {number} rive. Nou espere w ap renmen l!",
    sms: "Kòmand ou {number} rive.",
  },
  refunded: {
    subject: "Kòmand {number} ranbouse",
    body: "Nou ranbouse kòmand ou {number} pou yon montan {amount}.",
  },
}
