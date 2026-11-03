import type { Messages } from "@/i18n/messages/en"

export const emails: Messages["emails"] = {
  hello: "Bonjou,",
  viewOrder: "Wè kòmand mwen",
  trackOrder: "Swiv kòmand mwen",
  total: "Total: {amount}",
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
