/**
 * Sprints 4-5.5 were presentation-only for these sections. Sprint 10A adds
 * real `banners` (hero slides) and `brands` collections in Firestore —
 * `heroSlides` below is now only the zero-configuration **fallback** used
 * when no active `homepageHero` banner exists yet (see
 * `services/firestore/banners.ts`), not the source of truth. `testimonials`
 * remains static demo copy — no backing collection was requested for it in
 * any sprint so far. `demoStores` (Sprint 13.1) are fictional placeholders:
 * no seller backend exists yet, and every card must stay labelled as a demo.
 */

export interface Testimonial {
  name: string
  country: string
  role: string
  quote: string
  avatarSeed: string
  rating: number
  verified: boolean
}

export const testimonials: Testimonial[] = [
  {
    name: "Camille",
    country: "France",
    role: "Cliente",
    quote:
      "Une expérience d'achat impeccable — la qualité des pièces est à la hauteur de la présentation du site.",
    avatarSeed: "camille",
    rating: 5,
    verified: true,
  },
  {
    name: "Alexandre",
    country: "Canada",
    role: "Client",
    quote:
      "Livraison rapide, emballage soigné, et un service client réactif. Je recommande sans hésiter.",
    avatarSeed: "alexandre",
    rating: 5,
    verified: true,
  },
  {
    name: "Sofia",
    country: "Belgique",
    role: "Cliente",
    quote:
      "Le genre de boutique où on prend plaisir à naviguer. Chaque collection est pensée dans les moindres détails.",
    avatarSeed: "sofia",
    rating: 4,
    verified: true,
  },
  {
    name: "Jean-Michel",
    country: "Haïti",
    role: "Client",
    quote:
      "Enfin une boutique en ligne qui prend le temps de bien présenter chaque produit. Ma montre est encore plus belle en vrai.",
    avatarSeed: "jean-michel",
    rating: 5,
    verified: true,
  },
  {
    name: "Nadège",
    country: "Guadeloupe",
    role: "Cliente",
    quote:
      "J'ai commandé un sac pour un cadeau — la finition est superbe et l'emballage donnait déjà envie de l'offrir.",
    avatarSeed: "nadege",
    rating: 5,
    verified: true,
  },
  {
    name: "Thomas",
    country: "Suisse",
    role: "Client",
    quote:
      "Service client très réactif quand j'ai eu une question sur une taille. Réponse en moins d'une heure.",
    avatarSeed: "thomas",
    rating: 4,
    verified: true,
  },
  {
    name: "Aïssatou",
    country: "Sénégal",
    role: "Cliente",
    quote:
      "La sélection de bijoux est vraiment raffinée, on sent que chaque pièce est choisie avec soin.",
    avatarSeed: "aissatou",
    rating: 5,
    verified: true,
  },
  {
    name: "Marc",
    country: "France",
    role: "Client",
    quote:
      "Deuxième commande cette année. Le costume que j'ai reçu est parfaitement coupé, très bonne surprise.",
    avatarSeed: "marc",
    rating: 5,
    verified: true,
  },
  {
    name: "Léa",
    country: "Martinique",
    role: "Cliente",
    quote:
      "Le site est agréable à parcourir et les descriptions sont honnêtes — le produit correspond exactement aux photos.",
    avatarSeed: "lea",
    rating: 4,
    verified: true,
  },
  {
    name: "Kevin",
    country: "Côte d'Ivoire",
    role: "Client",
    quote:
      "Bon rapport qualité-prix sur les chaussures, et la pointure correspondait parfaitement au guide des tailles.",
    avatarSeed: "kevin",
    rating: 4,
    verified: true,
  },
  {
    name: "Isabelle",
    country: "Canada",
    role: "Cliente",
    quote:
      "J'apprécie particulièrement la politique de retour claire — ça donne confiance pour commander en ligne.",
    avatarSeed: "isabelle",
    rating: 5,
    verified: true,
  },
  {
    name: "Fabrice",
    country: "France",
    role: "Client",
    quote:
      "La veste commandée est encore plus belle en vrai. Le tissu est de bonne qualité, on sent le soin apporté.",
    avatarSeed: "fabrice",
    rating: 5,
    verified: true,
  },
  {
    name: "Ruth",
    country: "Haïti",
    role: "Cliente",
    quote:
      "Ma robe est arrivée à temps pour l'occasion. La coupe est flatteuse et le tissu tombe très bien.",
    avatarSeed: "ruth",
    rating: 5,
    verified: true,
  },
  {
    name: "Antoine",
    country: "Belgique",
    role: "Client",
    quote:
      "J'ai hésité avant de commander une montre en ligne, mais la description était précise et le produit conforme.",
    avatarSeed: "antoine",
    rating: 4,
    verified: true,
  },
  {
    name: "Chantal",
    country: "France",
    role: "Cliente",
    quote:
      "Le foulard que j'ai acheté est devenu mon accessoire préféré. Matière agréable, jolies couleurs.",
    avatarSeed: "chantal",
    rating: 5,
    verified: true,
  },
  {
    name: "Steven",
    country: "États-Unis",
    role: "Client",
    quote:
      "Great communication about shipping delays, and the jacket quality exceeded what I expected for the price.",
    avatarSeed: "steven",
    rating: 4,
    verified: true,
  },
  {
    name: "Priscille",
    country: "Sénégal",
    role: "Cliente",
    quote:
      "Une boutique sérieuse, avec un vrai soin apporté aux détails. Je reviendrai pour les fêtes.",
    avatarSeed: "priscille",
    rating: 5,
    verified: false,
  },
  {
    name: "Grégoire",
    country: "France",
    role: "Client",
    quote:
      "Le pantalon tailleur commandé tombe parfaitement, sans retouche nécessaire. Rare en ligne.",
    avatarSeed: "gregoire",
    rating: 4,
    verified: true,
  },
  {
    name: "Vanessa",
    country: "Canada",
    role: "Cliente",
    quote:
      "J'ai trouvé la chemise en lin que je cherchais depuis longtemps. Coupe impeccable.",
    avatarSeed: "vanessa",
    rating: 5,
    verified: true,
  },
  {
    name: "Wilfrid",
    country: "Haïti",
    role: "Client",
    quote:
      "Le suivi de commande est clair du début à la fin. Livraison plus rapide que prévu.",
    avatarSeed: "wilfrid",
    rating: 5,
    verified: true,
  },
  {
    name: "Océane",
    country: "France",
    role: "Cliente",
    quote:
      "Bonne surprise sur la qualité des accessoires — la ceinture en cuir est mieux finie que je ne l'imaginais.",
    avatarSeed: "oceane",
    rating: 4,
    verified: true,
  },
  {
    name: "Emmanuel",
    country: "Côte d'Ivoire",
    role: "Client",
    quote:
      "Bonne expérience globale, même si j'aurais aimé plus de choix de tailles pour les vestes.",
    avatarSeed: "emmanuel",
    rating: 3,
    verified: true,
  },
  {
    name: "Sabrina",
    country: "Belgique",
    role: "Cliente",
    quote:
      "Le service après-vente a été très arrangeant quand j'ai voulu échanger une taille. Merci !",
    avatarSeed: "sabrina",
    rating: 5,
    verified: true,
  },
  {
    name: "David",
    country: "France",
    role: "Client",
    quote:
      "Bonnes promotions en période de soldes, et la qualité reste au rendez-vous même sur les articles réduits.",
    avatarSeed: "david",
    rating: 4,
    verified: false,
  },
]

export interface Brand {
  name: string
  tagline: string
}

export const brands: Brand[] = [
  { name: "Atelier", tagline: "Le savoir-faire artisanal, réinventé." },
  { name: "Maison Noir", tagline: "Minimalisme sombre, exécution parfaite." },
  { name: "Origine", tagline: "Des matières nobles, une provenance assumée." },
  { name: "Velvet & Co", tagline: "Le luxe discret, saison après saison." },
  { name: "Lumen", tagline: "La lumière comme signature." },
  {
    name: "Noir Studio",
    tagline: "Créations audacieuses, finitions précises.",
  },
  { name: "Maison Élite", tagline: "L'excellence sans compromis." },
  { name: "Éclipse", tagline: "Une élégance qui ne passe jamais inaperçue." },
  { name: "Aurora", tagline: "L'éclat naturel, sublimé." },
  { name: "Prestige", tagline: "Le raffinement comme standard." },
]

export const brandNames: string[] = brands.map((brand) => brand.name)

export interface HeroSlide {
  id: string
  eyebrow: string
  title: string
  subtitle: string
  primaryButtonLabel: string
  primaryButtonHref: string
  secondaryButtonLabel: string
  secondaryButtonHref: string
}

export const heroSlides: HeroSlide[] = [
  {
    id: "local-marketplace",
    eyebrow: "Your Local Marketplace",
    title: "Vos commerces locaux, réunis au même endroit",
    subtitle:
      "Découvrez les produits de petits commerçants, de vendeurs indépendants et de boutiques de proximité.",
    primaryButtonLabel: "Explorer les produits",
    primaryButtonHref: "/products",
    secondaryButtonLabel: "Voir les catégories",
    secondaryButtonHref: "/categories",
  },
  {
    id: "small-sellers",
    eyebrow: "Petits vendeurs, grande visibilité",
    title: "Donnez à votre boutique la vitrine qu'elle mérite",
    subtitle:
      "C.L.A.G aide les boutiques locales à présenter leurs produits et à toucher de nouveaux clients.",
    primaryButtonLabel: "Devenir vendeur",
    primaryButtonHref: "/#devenir-vendeur",
    secondaryButtonLabel: "Boutiques en vedette",
    secondaryButtonHref: "/#boutiques",
  },
  {
    id: "good-deals",
    eyebrow: "Bonnes affaires",
    title: "Les promotions du moment, en un coup d'œil",
    subtitle:
      "Parcourez les offres en cours et trouvez le bon produit au bon prix.",
    primaryButtonLabel: "Voir les promotions",
    primaryButtonHref: "/products?onSale=1",
    secondaryButtonLabel: "Nouveautés",
    secondaryButtonHref: "/products?sort=createdAt_desc",
  },
]

export interface DemoStore {
  id: string
  name: string
  specialty: string
  description: string
  /** Key for `getCategoryIcon`. */
  icon: string
}

export const demoStores: DemoStore[] = [
  {
    id: "demo-mode",
    name: "Boutique démo Mode",
    specialty: "Vêtements",
    description: "Exemple de vitrine pour un vendeur de prêt-à-porter.",
    icon: "shirt",
  },
  {
    id: "demo-beaute",
    name: "Boutique démo Beauté",
    specialty: "Soins et cosmétiques",
    description: "Exemple de vitrine pour un commerce de beauté.",
    icon: "beauty",
  },
  {
    id: "demo-maison",
    name: "Boutique démo Maison",
    specialty: "Décoration",
    description: "Exemple de vitrine pour une boutique d'intérieur.",
    icon: "home",
  },
  {
    id: "demo-artisanat",
    name: "Boutique démo Artisanat",
    specialty: "Créations locales",
    description: "Exemple de vitrine pour un artisan indépendant.",
    icon: "art",
  },
]
