import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { siteConfig } from "@/config/site"
import type {
  ContentPage,
  ContentPageDocument,
  ContentPageKey,
  ContentSection,
  FaqItem,
  FaqPage,
  FaqPageDocument,
} from "@/types/content-page"

const CONTENT_COLLECTION = "content"

/** Real `Timestamp` instance — see the identical comment in
 * `services/firestore/settings.ts` for why this matters (this file's
 * `getContentPage`/`getFaqPage` fallbacks are passed directly to Client
 * Components in `app/admin/content/page.tsx`, so this one is a live fix,
 * not just defensive). */
function nowTimestamp() {
  return Timestamp.now()
}

/** Today's exact copy, lifted verbatim from the pre-Sprint-10A static pages —
 * used only when no `content/{key}` document exists yet. */
const DEFAULT_PAGES: Record<
  Exclude<ContentPageKey, "contact">,
  { title: string; sections: ContentSection[] }
> = {
  about: {
    title: `À propos de ${siteConfig.name}`,
    sections: [
      {
        heading: "",
        body: `${siteConfig.name} est une boutique en ligne dédiée à une sélection exigeante de pièces intemporelles. Chaque produit de notre catalogue est choisi pour sa qualité de fabrication, ses matières nobles et sa durabilité — loin des tendances éphémères.`,
      },
      {
        heading: "",
        body: "Nous croyons qu'une expérience d'achat haut de gamme ne se limite pas au produit : elle se prolonge dans la présentation, la livraison et le service après-vente. C'est cette exigence qui guide chacune de nos décisions, du choix de nos fournisseurs à la conception de ce site.",
      },
      {
        heading: "",
        body: "Notre équipe reste disponible pour répondre à toute question sur nos collections, la disponibilité d'un article ou le suivi d'une commande.",
      },
    ],
  },
  legal: {
    title: "Confidentialité & Conditions",
    sections: [
      {
        heading: "Politique de confidentialité",
        body: `${siteConfig.name} collecte uniquement les informations nécessaires au traitement de vos commandes (nom, adresse, coordonnées de contact) et ne les partage avec des tiers que dans la mesure requise pour la livraison et le paiement. Vous pouvez à tout moment demander la consultation ou la suppression de vos données personnelles.`,
      },
      {
        heading: "Conditions générales de vente",
        body: "En passant commande sur ce site, vous acceptez nos conditions de vente : les prix affichés sont en vigueur au moment de la commande, la disponibilité des produits est confirmée à l'étape du paiement, et toute commande peut être annulée avant son expédition en contactant notre service client.",
      },
    ],
  },
  "shipping-returns": {
    title: "Livraison & Retours",
    sections: [
      {
        heading: "Livraison",
        body: "Deux options sont proposées au moment du paiement : retrait en boutique, sans frais, ou livraison à domicile à tarif fixe. Le montant exact de chaque option est indiqué avant la confirmation de votre commande.",
      },
      {
        heading: "Retours",
        body: "Les articles non portés et dans leur emballage d'origine peuvent être retournés dans les 30 jours suivant la réception de votre commande. Contactez notre service client pour lancer une demande de retour.",
      },
      {
        heading: "Remboursements",
        body: "Une fois le retour reçu et vérifié, le remboursement est émis sur le mode de paiement original sous quelques jours ouvrés.",
      },
    ],
  },
}

const DEFAULT_CONTACT: { title: string; sections: ContentSection[] } = {
  title: "Contact",
  sections: [
    {
      heading: "",
      body: "Notre équipe est disponible pour répondre à toute question sur vos commandes, nos produits ou votre compte.",
    },
  ],
}

const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Quels sont les délais de livraison ?",
    answer:
      "Les commandes sont généralement expédiées sous 1 à 3 jours ouvrés. Le délai de livraison varie ensuite selon l'option choisie au moment du paiement.",
  },
  {
    question: "Puis-je modifier ou annuler ma commande ?",
    answer:
      "Contactez-nous le plus tôt possible après votre achat — tant que la commande n'a pas été expédiée, nous pouvons généralement la modifier ou l'annuler.",
  },
  {
    question: "Comment suivre ma commande ?",
    answer:
      "Rendez-vous dans votre espace « Mon compte » puis « Mes commandes » pour consulter le statut et l'historique de chaque commande.",
  },
  {
    question: "Quels moyens de paiement acceptez-vous ?",
    answer:
      "Les paiements par carte bancaire sont acceptés via une passerelle de paiement sécurisée au moment du passage en caisse.",
  },
  {
    question: "Comment vous contacter ?",
    answer:
      "Notre équipe de service client est disponible par e-mail — consultez la page « Livraison & Retours » pour les questions liées aux commandes déjà passées.",
  },
]

export async function getContentPage(
  key: ContentPageKey
): Promise<ContentPage> {
  const doc = await adminDb.collection(CONTENT_COLLECTION).doc(key).get()
  if (!doc.exists) {
    const fallback = key === "contact" ? DEFAULT_CONTACT : DEFAULT_PAGES[key]
    return {
      id: key,
      title: fallback.title,
      sections: fallback.sections,
      updatedAt: nowTimestamp(),
      updatedBy: null,
    }
  }
  return { id: key, ...(doc.data() as ContentPageDocument) }
}

export async function updateContentPage(
  key: ContentPageKey,
  input: { title: string; sections: ContentSection[] },
  actorUid: string
): Promise<ContentPage> {
  await adminDb.collection(CONTENT_COLLECTION).doc(key).set(
    {
      title: input.title,
      sections: input.sections,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    },
    { merge: true }
  )
  return getContentPage(key)
}

export async function getFaqPage(): Promise<FaqPage> {
  const doc = await adminDb.collection(CONTENT_COLLECTION).doc("faq").get()
  if (!doc.exists) {
    return {
      id: "faq",
      title: "Questions fréquentes",
      items: DEFAULT_FAQ_ITEMS,
      updatedAt: nowTimestamp(),
      updatedBy: null,
    }
  }
  return { id: "faq", ...(doc.data() as FaqPageDocument) }
}

export async function updateFaqPage(
  input: { title: string; items: FaqItem[] },
  actorUid: string
): Promise<FaqPage> {
  await adminDb.collection(CONTENT_COLLECTION).doc("faq").set(
    {
      title: input.title,
      items: input.items,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    },
    { merge: true }
  )
  return getFaqPage()
}
