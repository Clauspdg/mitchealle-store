import type { Messages } from "@/i18n/messages/en"

export const refunds: Messages["refunds"] = {
  title: "Remboursements",
  reference: "Référence : {reference}",
  source: {
    store_cancellation: "Annulation par la boutique",
    store_return: "Retour d'articles",
    house_return: "Retour d'articles C.L.A.G",
    order_refund: "Remboursement de la commande",
  },
  status: {
    requested: "Remboursement demandé",
    pending: "Remboursement en attente",
    completed: "Remboursement effectué",
    void: "Aucun remboursement",
  },
  hint: {
    requested: "Le retour doit encore être réceptionné et vérifié.",
    pending: "Le montant vous est dû et n'a pas encore été remboursé.",
    completed: "Le remboursement a été enregistré comme effectué.",
    void: "Rien n'est dû au titre de cette demande.",
  },
}

export const returns: Messages["returns"] = {
  title: "Mes retours",
  emptyTitle: "Aucune demande de retour",
  emptyText: "Vos demandes de retour apparaîtront ici.",
  detailMetaTitle: "Détail du retour",
  detailTitle: "Demande de retour",
  status: {
    requested: "Demandé",
    approved: "Approuvé",
    rejected: "Refusé",
    received: "Reçu",
    refunded: "Remboursé",
  },
  quantity: "Quantité : {count}",
  reason: "Motif : {reason}",
  comment: "Commentaire :",
  request: "Demander un retour",
  requestText: "Sélectionnez les articles concernés et indiquez un motif.",
  quantityToReturn: "Quantité à retourner",
  reasonPlaceholder: "Motif du retour",
  commentLabel: "Commentaire (optionnel)",
  photoLabel: "Photo (optionnel)",
  photoAdded: "Photo ajoutée.",
  send: "Envoyer la demande",
  sent: "Demande de retour envoyée.",
  selectItem: "Sélectionnez au moins un article.",
  reasonForEach: "Indiquez un motif pour chaque article sélectionné.",
  reasonRequired: "Indiquez un motif.",
  onlyDelivered: "Seule une commande livrée peut faire l'objet d'un retour.",
  itemNotReturnable: "Un article de la demande ne peut pas être retourné.",
}

export const wishlist: Messages["wishlist"] = {
  emptyTitle: "Votre liste de souhaits est vide",
  emptyText:
    "Ajoutez des produits depuis le catalogue en cliquant sur le cœur.",
}

export const sellerApply: Messages["sellerApply"] = {
  intro:
    "Demandez l'ouverture de votre boutique. Votre compte client reste inchangé pendant toute la procédure.",
  mine: "Mes candidatures",
  status: {
    pending: "En attente",
    approved: "Approuvée",
    rejected: "Refusée",
  },
  statusText: {
    pending:
      "Notre équipe étudie votre candidature. Vous pourrez en déposer une nouvelle une fois celle-ci traitée.",
    approved:
      "Votre boutique est ouverte : gérez votre catalogue et votre stock depuis l'espace vendeur.",
    rejected: "Votre candidature n'a pas été retenue.",
  },
  submittedOn: "Déposée le {date}",
  newApplication: "Nouvelle candidature",
  yourApplication: "Votre candidature",
  yourStore: "Votre boutique",
  storeName: "Nom de la boutique",
  descriptionPlaceholder:
    "Ce que vous vendez, votre savoir-faire, votre zone d'activité…",
  mainCategory: "Catégorie principale",
  chooseCategoryPlaceholder: "Choisir une catégorie",
  chooseCategory: "Choisissez la catégorie principale.",
  logo: "Logo (facultatif)",
  logoHint: "JPEG, PNG, WebP ou AVIF, 5 Mo maximum.",
  businessContact: "Coordonnées professionnelles",
  legalName: "Raison sociale ou nom",
  businessEmail: "Email professionnel",
  submit: "Envoyer ma candidature",
  sent: "Candidature envoyée.",
  checkForm: "Vérifiez les informations du formulaire.",
  alreadyPending: "Vous avez déjà une candidature en cours d'examen.",
  saveFailed: "La candidature n'a pas pu être enregistrée. Réessayez.",
  nameTaken: "Ce nom de boutique est déjà utilisé.",
  nameInvalid: "Le nom de la boutique est invalide.",
  categoryMissing: "Catégorie introuvable.",
}

export const compare: Messages["compare"] = {
  title: "Comparateur",
  emptyTitle: "Aucun produit à comparer",
  emptyText:
    "Ajoutez des produits au comparateur depuis le catalogue pour les voir apparaître ici.",
  browse: "Parcourir les produits",
  price: "Prix",
  sizes: "Tailles",
  colors: "Couleurs",
  availability: "Disponibilité",
}

// Word for word the text these pages always shipped with.
export const content: Messages["content"] = {
  about: {
    menuTitle: "À propos",
    title: "À propos de C.L.A.G",
    p1: "C.L.A.G est une boutique en ligne dédiée à une sélection exigeante de pièces intemporelles. Chaque produit de notre catalogue est choisi pour sa qualité de fabrication, ses matières nobles et sa durabilité — loin des tendances éphémères.",
    p2: "Nous croyons qu'une expérience d'achat haut de gamme ne se limite pas au produit : elle se prolonge dans la présentation, la livraison et le service après-vente. C'est cette exigence qui guide chacune de nos décisions, du choix de nos fournisseurs à la conception de ce site.",
    p3: "Notre équipe reste disponible pour répondre à toute question sur nos collections, la disponibilité d'un article ou le suivi d'une commande.",
  },
  contact: {
    title: "Contact",
    p1: "Notre équipe est disponible pour répondre à toute question sur vos commandes, nos produits ou votre compte.",
  },
  shippingReturns: {
    title: "Livraison & Retours",
    deliveryTitle: "Livraison",
    deliveryText:
      "Deux options sont proposées au moment du paiement : retrait en boutique, sans frais, ou livraison à domicile à tarif fixe. Le montant exact de chaque option est indiqué avant la confirmation de votre commande.",
    returnsTitle: "Retours",
    returnsText:
      "Les articles non portés et dans leur emballage d'origine peuvent être retournés dans les 30 jours suivant la réception de votre commande. Contactez notre service client pour lancer une demande de retour.",
    refundsTitle: "Remboursements",
    refundsText:
      "Une fois le retour reçu et vérifié, le remboursement est émis sur le mode de paiement original sous quelques jours ouvrés.",
  },
  faq: {
    title: "Questions fréquentes",
    q1: "Quels sont les délais de livraison ?",
    a1: "Les commandes sont généralement expédiées sous 1 à 3 jours ouvrés. Le délai de livraison varie ensuite selon l'option choisie au moment du paiement.",
    q2: "Puis-je modifier ou annuler ma commande ?",
    a2: "Contactez-nous le plus tôt possible après votre achat — tant que la commande n'a pas été expédiée, nous pouvons généralement la modifier ou l'annuler.",
    q3: "Comment suivre ma commande ?",
    a3: "Rendez-vous dans votre espace « Mon compte » puis « Mes commandes » pour consulter le statut et l'historique de chaque commande.",
    q4: "Quels moyens de paiement acceptez-vous ?",
    a4: "Les paiements par carte bancaire sont acceptés via une passerelle de paiement sécurisée au moment du passage en caisse.",
    q5: "Comment vous contacter ?",
    a5: "Notre équipe de service client est disponible par e-mail — consultez la page « Livraison & Retours » pour les questions liées aux commandes déjà passées.",
  },
  legal: {
    metaTitle: "Confidentialité & Conditions",
    frenchOnly: "Cette page n'existe qu'en français pour le moment.",
  },
}
