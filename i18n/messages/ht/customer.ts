import type { Messages } from "@/i18n/messages/en"

export const refunds: Messages["refunds"] = {
  title: "Ranbousman",
  reference: "Referans: {reference}",
  source: {
    store_cancellation: "Boutik la anile",
    store_return: "Atik ki retounen",
    house_return: "Atik C.L.A.G ki retounen",
    order_refund: "Ranbousman kòmand lan",
  },
  status: {
    requested: "Ranbousman mande",
    pending: "Ranbousman ap tann",
    completed: "Ranbousman fèt",
    void: "Pa gen ranbousman",
  },
  hint: {
    requested: "Nou poko resevwa ni verifye retou a.",
    pending: "Nou dwe w kòb la, nou poko ranbouse l.",
    completed: "Nou anrejistre ranbousman an kòm fèt.",
    void: "Nou pa dwe w anyen pou demann sa a.",
  },
}

export const returns: Messages["returns"] = {
  title: "Retou mwen yo",
  emptyTitle: "Pa gen okenn demann retou",
  emptyText: "Demann retou ou yo ap parèt la a.",
  detailMetaTitle: "Detay retou a",
  detailTitle: "Demann retou",
  status: {
    requested: "Mande",
    approved: "Aksepte",
    rejected: "Refize",
    received: "Resevwa",
    refunded: "Ranbouse",
  },
  quantity: "Kantite: {count}",
  reason: "Rezon: {reason}",
  comment: "Kòmantè:",
  request: "Mande yon retou",
  requestText: "Chwazi atik yo epi bay yon rezon.",
  quantityToReturn: "Kantite pou retounen",
  reasonPlaceholder: "Rezon retou a",
  commentLabel: "Kòmantè (si ou vle)",
  photoLabel: "Foto (si ou vle)",
  photoAdded: "Foto a ajoute.",
  send: "Voye demann lan",
  sent: "Nou voye demann retou a.",
  selectItem: "Chwazi omwen yon atik.",
  reasonForEach: "Bay yon rezon pou chak atik ou chwazi.",
  reasonRequired: "Bay yon rezon.",
  onlyDelivered: "Se sèlman yon kòmand ki livre ki ka retounen.",
  itemNotReturnable: "Gen yon atik nan demann lan ki pa ka retounen.",
}

export const wishlist: Messages["wishlist"] = {
  emptyTitle: "Lis favori ou vid",
  emptyText: "Ajoute pwodui nan katalòg la lè w klike sou kè a.",
}

export const sellerApply: Messages["sellerApply"] = {
  intro:
    "Mande pou yo louvri boutik ou. Kont kliyan ou rete menm jan an pandan tout pwosesis la.",
  mine: "Demann mwen yo",
  status: {
    pending: "Ap tann",
    approved: "Aksepte",
    rejected: "Refize",
  },
  statusText: {
    pending:
      "Ekip nou an ap egzamine demann ou. Ou ka voye yon lòt lè nou fin trete sa a.",
    approved: "Boutik ou louvri: jere katalòg ou ak stòk ou nan espas vandè a.",
    rejected: "Nou pa t aksepte demann ou.",
  },
  submittedOn: "Voye {date}",
  newApplication: "Nouvo demann",
  yourApplication: "Demann ou",
  yourStore: "Boutik ou",
  storeName: "Non boutik la",
  descriptionPlaceholder: "Sa w vann, konesans ou, zòn kote w travay…",
  mainCategory: "Kategori prensipal",
  chooseCategoryPlaceholder: "Chwazi yon kategori",
  chooseCategory: "Chwazi kategori prensipal la.",
  logo: "Logo (si ou vle)",
  logoHint: "JPEG, PNG, WebP oswa AVIF, 5 Mo pi plis.",
  businessContact: "Kowòdone biznis",
  legalName: "Non legal oswa non ou",
  businessEmail: "Imèl biznis",
  submit: "Voye demann mwen",
  sent: "Nou voye demann lan.",
  checkForm: "Tanpri verifye fòmilè a.",
  alreadyPending: "Ou gen yon demann ki ap egzamine deja.",
  saveFailed: "Nou pa t ka anrejistre demann lan. Eseye ankò.",
  nameTaken: "Gen yon lòt boutik ki pran non sa a deja.",
  nameInvalid: "Non boutik la pa bon.",
  categoryMissing: "Nou pa jwenn kategori a.",
}

export const compare: Messages["compare"] = {
  title: "Konparezon",
  emptyTitle: "Pa gen pwodui pou konpare",
  emptyText:
    "Ajoute pwodui nan konparezon an depi nan katalòg la pou w wè yo la a.",
  browse: "Gade pwodui yo",
  price: "Pri",
  sizes: "Gwosè",
  colors: "Koulè",
  availability: "Disponibilite",
}

export const content: Messages["content"] = {
  about: {
    menuTitle: "Sou nou",
    title: "Sou C.L.A.G",
    p1: "C.L.A.G se yon boutik sou entènèt ki chwazi avèk swen moso ki pa janm demode. Nou chwazi chak pwodui nan katalòg nou an pou bon jan fabrikasyon li, bon materyèl li ak jan li dire — lwen mòd ki pase vit.",
    p2: "Nou kwè yon bèl eksperyans acha pa sèlman nan pwodui a: li kontinye nan prezantasyon an, livrezon an ak sèvis apre vant lan. Se egzijans sa a ki gide chak desizyon nou pran, depi nan chwa founisè nou yo rive nan fason nou fè sit sa a.",
    p3: "Ekip nou an toujou la pou reponn nenpòt kesyon sou koleksyon nou yo, si yon atik disponib oswa pou swiv yon kòmand.",
  },
  contact: {
    title: "Kontak",
    p1: "Ekip nou an la pou reponn nenpòt kesyon sou kòmand ou, pwodui nou yo oswa kont ou.",
  },
  shippingReturns: {
    title: "Livrezon ak Retou",
    deliveryTitle: "Livrezon",
    deliveryText:
      "Lè w ap peye, gen de opsyon: vin chèche l nan boutik la gratis, oswa livrezon lakay pou yon pri fiks. Ou wè montan egzak chak opsyon anvan ou konfime kòmand ou.",
    returnsTitle: "Retou",
    returnsText:
      "Ou ka retounen atik ki pa t mete, nan anbalaj orijinal yo, nan 30 jou apre ou resevwa kòmand ou. Kontakte sèvis kliyan nou an pou kòmanse yon demann retou.",
    refundsTitle: "Ranbousman",
    refundsText:
      "Lè nou resevwa epi verifye retou a, nou voye ranbousman an sou menm fason ou te peye a nan kèk jou travay.",
  },
  faq: {
    title: "Kesyon moun poze souvan",
    q1: "Konbyen tan livrezon an pran?",
    a1: "Anjeneral nou voye kòmand yo nan 1 a 3 jou travay. Apre sa, tan livrezon an depann de opsyon ou chwazi lè w ap peye.",
    q2: "Èske m ka chanje oswa anile kòmand mwen?",
    a2: "Kontakte nou pi vit posib apre acha ou — toutotan nou poko voye kòmand lan, anjeneral nou ka chanje l oswa anile l.",
    q3: "Kijan pou m swiv kòmand mwen?",
    a3: "Ale nan « Kont mwen » epi nan « Kòmand mwen yo » pou w wè estati ak istorik chak kòmand.",
    q4: "Ki fason pou peye nou aksepte?",
    a4: "Nou aksepte peman ak kat bankè atravè yon sistèm peman ki an sekirite lè w ap peye.",
    q5: "Kijan pou m kontakte nou?",
    a5: "Ekip sèvis kliyan nou an disponib pa imèl — gade paj « Livrezon ak Retou » pou kesyon sou kòmand ou fin pase deja.",
  },
  legal: {
    metaTitle: "Vi prive ak Kondisyon",
    frenchOnly:
      "Paj sa a disponib an fransè sèlman pou kounye a. Nou montre l jan li te pibliye a.",
  },
}
