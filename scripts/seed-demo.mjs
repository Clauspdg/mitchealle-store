/**
 * Fictional demo dataset for functional tests: no real customer, order or
 * address is copied. Fixed IDs make it safe to re-run.
 *
 * Emulators:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *              SEED_PROJECT_ID=mictchealla-store SEED_DEMO_PASSWORD=... npm run seed:demo
 * DEV project: SEED_PROJECT_ID=<dev-project-id> SEED_DEMO_PASSWORD=... npm run seed:demo
 *              (with Application Default Credentials for that project)
 */
import { applicationDefault, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

const PRODUCTION_PROJECT_ID = "mictchealla-store"

const projectId = process.env.SEED_PROJECT_ID
const password = process.env.SEED_DEMO_PASSWORD
const usesEmulators = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST
)

if (!projectId || !password) {
  console.error("SEED_PROJECT_ID et SEED_DEMO_PASSWORD sont requis.")
  process.exit(1)
}
if (projectId === PRODUCTION_PROJECT_ID && !usesEmulators) {
  console.error(
    "Refusé : ce script n'écrit jamais dans le projet de production."
  )
  process.exit(1)
}

const app = initializeApp(
  usesEmulators
    ? { projectId }
    : { projectId, credential: applicationDefault() }
)
const db = getFirestore(app)
const auth = getAuth(app)
const now = Timestamp.now()

const DEMO_USERS = [
  { uid: "demo-admin", email: "admin@demo.clag.test", role: "admin" },
  { uid: "demo-staff", email: "staff@demo.clag.test", role: "staff" },
  { uid: "demo-client", email: "client@demo.clag.test", role: "customer" },
  { uid: "demo-vendeur", email: "vendeur@demo.clag.test", role: "customer" },
  // Two shoppers with no store, for the multi-vendor order tests.
  {
    uid: "demo-acheteur-1",
    email: "acheteur1@demo.clag.test",
    role: "customer",
  },
  {
    uid: "demo-acheteur-2",
    email: "acheteur2@demo.clag.test",
    role: "customer",
  },
]

// Store roles are memberships, not platform roles: `demo-client` stays a
// customer while belonging to two stores with a different role in each.
const HOUSE_SELLER_ID = "clag-house"
const SELLERS = [
  { id: HOUSE_SELLER_ID, name: "C.L.A.G", slug: "clag" },
  {
    id: "demo-boutique-mode",
    name: "Boutique démo Mode",
    slug: "boutique-demo-mode",
  },
  {
    id: "demo-boutique-maison",
    name: "Boutique démo Maison",
    slug: "boutique-demo-maison",
  },
]
const MEMBERS = [
  ["demo-boutique-mode", "demo-client", "owner"],
  ["demo-boutique-maison", "demo-client", "staff"],
  ["demo-boutique-maison", "demo-vendeur", "owner"],
  ["demo-boutique-mode", "demo-vendeur", "manager"],
]

const CATEGORIES = [
  ["Mode", "shirt"],
  ["Beauté", "beauty"],
  ["Maison", "home"],
  ["Artisanat", "art"],
  ["Électronique", "electronics"],
  ["Enfants", "kids"],
  ["Accessoires", "accessories"],
  ["Cadeaux", "gift"],
]

async function seedUsers() {
  for (const { uid, email, role } of DEMO_USERS) {
    const exists = await auth.getUser(uid).catch(() => null)
    if (!exists) {
      await auth.createUser({
        uid,
        email,
        password,
        displayName: `Démo ${role}`,
        emailVerified: true,
      })
    }
    await auth.setCustomUserClaims(uid, { role })
    await db
      .collection("users")
      .doc(uid)
      .set({
        uid,
        email,
        displayName: `Démo ${role}`,
        role,
        createdAt: now,
        updatedAt: now,
      })
  }
}

async function seedCategories() {
  const batch = db.batch()
  CATEGORIES.forEach(([name, icon], position) => {
    const slug = `demo-${position + 1}`
    batch.set(db.collection("categories").doc(slug), {
      name,
      nameLower: name.toLowerCase(),
      slug,
      description: `Catégorie de démonstration : ${name}.`,
      icon,
      color: null,
      parentId: null,
      imageUrl: null,
      bannerImageUrl: null,
      position,
      isActive: true,
      seo: { title: name, description: "" },
      createdAt: now,
      updatedAt: now,
    })
  })
  await batch.commit()
}

async function seedProducts() {
  const batch = db.batch()
  for (let index = 1; index <= 24; index++) {
    const id = `demo-produit-${index}`
    const [categoryName] = CATEGORIES[index % CATEGORIES.length]
    const name = `${categoryName} démo ${index}`
    const basePriceMinor = 150000 + index * 12500
    const variantId = `${id}-standard`
    // Products without `sellerId` stand for the historical house catalog.
    const seller = index % 3 === 0 ? null : SELLERS[index % 3]
    batch.set(db.collection("products").doc(id), {
      name,
      nameLower: name.toLowerCase(),
      slug: id,
      shortDescription: "Produit fictif pour les tests.",
      description: "Produit fictif créé pour les tests de la marketplace.",
      sku: `DEMO-${index}`,
      brand: "Marque démo",
      brandId: null,
      upc: null,
      costMinor: null,
      categoryId: `demo-${(index % CATEGORIES.length) + 1}`,
      collectionIds: [],
      images: [
        {
          url: `https://picsum.photos/seed/clag-demo-${index}/900/1125`,
          alt: name,
          position: 0,
        },
      ],
      basePriceMinor,
      salePriceMinor: index % 3 === 0 ? Math.round(basePriceMinor * 0.8) : null,
      currency: "HTG",
      variants: [
        {
          id: variantId,
          sku: `DEMO-${index}-STD`,
          size: null,
          color: null,
          priceMinor: null,
          // A few low-stock and sold-out cases for the badges.
          stock: index % 11 === 0 ? 0 : index % 7 === 0 ? 3 : 25,
          isDefault: true,
          imageUrl: null,
        },
      ],
      material: null,
      weightGrams: null,
      dimensionsCm: null,
      tags: index % 5 === 0 ? ["bestseller"] : [],
      status: "published",
      isComingSoon: false,
      isPreorderable: false,
      preorderWindow: null,
      preorderMessage: null,
      availableFrom: null,
      seo: { title: name, description: "", keywords: [] },
      ratingAverage: 3.5 + (index % 3) / 2,
      ratingCount: index * 2,
      createdAt: now,
      updatedAt: now,
      createdBy: "demo-admin",
      ...(seller
        ? {
            sellerId: seller.id,
            sellerName: seller.name,
            moderation: "approved",
          }
        : {}),
    })
  }
  await batch.commit()
}

async function seedSellers() {
  const batch = db.batch()
  for (const seller of SELLERS) {
    batch.set(db.collection("sellers").doc(seller.id), {
      name: seller.name,
      slug: seller.slug,
      description: `Boutique de démonstration : ${seller.name}.`,
      logoUrl: null,
      bannerUrl: null,
      status: "active",
      commissionBps: seller.id === HOUSE_SELLER_ID ? 0 : 1000,
      createdBy: "demo-admin",
      createdAt: now,
      updatedAt: now,
    })
    batch.set(
      db
        .collection("sellers")
        .doc(seller.id)
        .collection("private")
        .doc("profile"),
      {
        legalName: seller.name,
        contactEmail: `contact@${seller.slug}.demo.clag.test`,
        contactPhone: "",
        updatedAt: now,
      }
    )
  }
  for (const [sellerId, uid, role] of MEMBERS) {
    batch.set(db.collection("sellerMembers").doc(`${sellerId}_${uid}`), {
      sellerId,
      uid,
      role,
      status: "active",
      invitedBy: "demo-admin",
      createdAt: now,
      updatedAt: now,
    })
  }
  // Store names are unique: the approval flow reserves them here.
  for (const seller of SELLERS) {
    batch.set(db.collection("sellerSlugs").doc(seller.slug), {
      sellerId: seller.id,
      createdAt: now,
    })
  }
  await batch.commit()
}

// One pending application for the admin "Vendeurs" module.
async function seedApplication() {
  const id = "demo-candidature-staff"
  const existing = await db.collection("sellerApplications").doc(id).get()
  if (existing.exists) return

  const batch = db.batch()
  batch.set(db.collection("sellerApplications").doc(id), {
    applicantUid: "demo-staff",
    applicantEmail: "staff@demo.clag.test",
    storeName: "Atelier démo",
    slug: "atelier-demo",
    description: "Candidature fictive : créations artisanales faites main.",
    categoryId: "demo-4",
    logoUrl: null,
    contact: {
      legalName: "Atelier démo",
      contactEmail: "atelier@demo.clag.test",
      contactPhone: "+509 3700 0000",
      city: "Jacmel",
    },
    status: "pending",
    rejectionReason: null,
    sellerId: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(db.collection("sellerApplicants").doc("demo-staff"), {
    pendingApplicationId: id,
    updatedAt: now,
  })
  batch.set(db.collection("sellerDecisions").doc(`${id}-submitted`), {
    type: "application_submitted",
    applicationId: id,
    sellerId: null,
    storeName: "Atelier démo",
    reason: null,
    actorUid: "demo-staff",
    actorEmail: "staff@demo.clag.test",
    createdAt: now,
  })
  await batch.commit()
}

// Two store products past the approved catalog: one waiting for moderation
// (offline) and one refused with its reason, for the Seller Center and the
// admin moderation queue.
async function seedModeration() {
  const cases = [
    {
      id: "demo-moderation-attente",
      sellerId: "demo-boutique-mode",
      name: "Chemise lin démo",
      moderation: "pending",
      moderationNote: null,
    },
    {
      id: "demo-moderation-refuse",
      sellerId: "demo-boutique-maison",
      name: "Lampe démo",
      moderation: "rejected",
      moderationNote: "Photos floues : ajoutez une vue nette du produit.",
    },
  ]
  const batch = db.batch()
  for (const item of cases) {
    const seller = SELLERS.find((s) => s.id === item.sellerId)
    batch.set(db.collection("products").doc(item.id), {
      name: item.name,
      nameLower: item.name.toLowerCase(),
      slug: item.id,
      shortDescription: "Produit fictif en cours de modération.",
      description: "Produit fictif créé pour tester la modération.",
      sku: item.id.toUpperCase(),
      brand: null,
      brandId: null,
      upc: null,
      costMinor: null,
      categoryId: item.sellerId === "demo-boutique-mode" ? "demo-1" : "demo-3",
      collectionIds: [],
      images: [
        {
          url: `https://picsum.photos/seed/${item.id}/900/1125`,
          alt: item.name,
          position: 0,
        },
      ],
      basePriceMinor: 250000,
      salePriceMinor: null,
      currency: "HTG",
      variants: [
        {
          id: `${item.id}-standard`,
          sku: `${item.id.toUpperCase()}-STD`,
          size: null,
          color: null,
          priceMinor: null,
          stock: 12,
          isDefault: true,
          imageUrl: null,
        },
      ],
      material: null,
      weightGrams: null,
      dimensionsCm: null,
      tags: [],
      status: "draft",
      isComingSoon: false,
      isPreorderable: false,
      preorderWindow: null,
      preorderMessage: null,
      availableFrom: null,
      seo: { title: item.name, description: "", keywords: [] },
      ratingAverage: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "demo-vendeur",
      sellerId: item.sellerId,
      sellerName: seller.name,
      moderation: item.moderation,
      moderationNote: item.moderationNote,
      moderationRevision: 1,
      moderatedBy: item.moderation === "rejected" ? "demo-admin" : null,
    })
    batch.set(db.collection("sellerDecisions").doc(`${item.id}-submitted`), {
      type: "product_submitted",
      applicationId: null,
      sellerId: item.sellerId,
      storeName: seller.name,
      productId: item.id,
      productName: item.name,
      reason: null,
      actorUid: "demo-vendeur",
      actorEmail: null,
      createdAt: now,
    })
    if (item.moderation === "rejected") {
      batch.set(db.collection("sellerDecisions").doc(`${item.id}-rejected`), {
        type: "product_rejected",
        applicationId: null,
        sellerId: item.sellerId,
        storeName: seller.name,
        productId: item.id,
        productName: item.name,
        reason: item.moderationNote,
        actorUid: "demo-admin",
        actorEmail: "admin@demo.clag.test",
        createdAt: Timestamp.fromMillis(now.toMillis() + 60_000),
      })
    }
  }
  await batch.commit()
}

await seedUsers()
await seedCategories()
await seedSellers()
await seedApplication()
await seedProducts()
await seedModeration()
console.log(
  `Jeu de démonstration chargé sur ${projectId}${usesEmulators ? " (émulateurs)" : ""}.`
)
process.exit(0)
