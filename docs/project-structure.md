# Architecture du projet — Mitchaella Store

Ce document décrit l'organisation du dépôt, le rôle de chaque dossier et les
conventions à suivre. Il sert de référence avant d'ajouter du code métier.

> **Mis à jour au Sprint 2B** (Inventory & Supply Chain Management) — ajoute
> `features/inventory/` et les services `inventory`/`suppliers`/
> `incoming-shipments`/`stock-movements`/`alerts`/`stock-dashboard`, et
> promeut `CursorPagination` de `features/catalog/` vers `components/shared/`
> (elle n'avait rien de spécifique aux produits — voir "Rôle détaillé"). Le
> Sprint 2A avait déjà ajouté les dossiers transverses du Sprint 1
> (`schemas/`, `validators/`, `config/`, `providers/`, `contexts/`) et
> `features/catalog/`.

## Vue d'ensemble

Le projet est un monolithe Next.js (App Router) pour le front + API, avec un
sous-projet indépendant `functions/` pour les Cloud Functions. Firebase sert
de backend (Authentication, Firestore, Storage, Cloud Functions).

```
mitchaella-store/
├── app/            routes Next.js uniquement (pages, layouts, route handlers)
├── components/     UI réutilisable, transverse à plusieurs features
├── features/       modules métier, un dossier par domaine
├── lib/            utilitaires techniques transverses (env, session, cn)
├── hooks/          hooks React globaux, non liés à une feature
├── services/       couche d'accès aux données (Firestore/Storage/Auth)
├── firebase/       initialisation des SDK Firebase (client + admin)
├── types/          types TypeScript partagés (miroir du modèle Firestore)
├── schemas/        schémas Zod partagés (validation d'entrée utilisateur)
├── validators/      fonctions de validation métier (au-delà du simple schéma)
├── config/         configuration statique de l'app (nav, site, constantes)
├── providers/       composants Provider (contexte React + effets de bord)
├── contexts/        définitions de contexte React (sans logique)
├── utils/          fonctions pures, sans dépendance React/Firebase
├── styles/         styles globaux additionnels
├── public/         assets statiques, manifest PWA, icônes
├── docs/           documentation technique
└── functions/      Cloud Functions (déploiement indépendant)
```

## Rôle détaillé de chaque dossier

### `app/`

Uniquement des fichiers de convention Next.js : `page.tsx`, `layout.tsx`,
`loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `proxy.ts`
(ex-`middleware.ts` depuis Next 16). Aucune logique métier ici — une page
importe et compose des composants venant de `features/*` et `components/*`,
et appelle `services/` directement pour charger les données d'un Server
Component (ex. `app/admin/products/list/page.tsx` appelle
`services/firestore/products.ts#listProducts`).

### `components/`

Composants UI réutilisables **sans logique métier propre à une feature**.

- `ui/` — primitives Shadcn UI (générées par la CLI, à ne pas éditer à la main
  sauf besoin ; préférer composer par-dessus).
- `layout/` — header, footer, sidebar admin, shell de page.
- `shared/` — composants génériques cross-domaine : `confirm-dialog.tsx`
  (confirmation destructive/non-destructive réutilisée par produits,
  catégories, collections), `money-input.tsx`, `tags-input.tsx`,
  `page-breadcrumb.tsx`, `mode-toggle.tsx`, `cursor-pagination.tsx`
  (pagination par curseur générique pilotée par les search params `cursor`/
  `history` — utilisée par produits, inventaire et arrivages ; promue
  depuis `features/catalog/` au Sprint 2B dès qu'un deuxième domaine en a
  eu besoin, sans rien de spécifique aux produits), etc.

Règle : un composant ne va dans `components/` que s'il est utilisé par au
moins deux features, ou s'il est purement présentationnel (pas d'accès direct
à Firestore/Firebase). `components/` ne dépend jamais de `features/`.

### `features/`

Un dossier par domaine métier : `auth`, `catalog` (implémenté — Produits,
Catégories, Collections), `inventory` (implémenté au Sprint 2B — Stock,
Fournisseurs, Arrivages, Journal des mouvements), `cart`, `preorder`,
`payment`, `delivery`, `profile`, `wishlist`, `notifications` (non
implémentés). Structure interne observée sur `features/auth`,
`features/catalog` et `features/inventory` :

```
features/<name>/
├── components/   composants spécifiques à cette feature
├── actions/      Server Actions ("use server") — create/update/transitions
├── lib/          mappers et helpers propres à la feature (ex.
│                 product-mappers.ts convertit Product <-> ProductFormInput,
│                 auth-error-messages.ts traduit les codes d'erreur Firebase)
└── hooks/        hooks spécifiques à cette feature (si besoin)
```

Écart avec le gabarit initial : les schémas Zod (`schemas.ts`) et les types
(`types.ts`) prévus _dans_ chaque feature vivent en pratique dans les
dossiers transverses `schemas/` et `types/` (ex. `schemas/product.schema.ts`,
`types/product.ts`), pas dans `features/catalog/`. Raison : plusieurs
consommateurs hors de la feature (Server Components de pages, autres
features) en ont besoin, et dupliquer aurait cassé la règle "une seule
source de vérité par type". Une feature peut dépendre de `lib/`, `services/`,
`types/`, `schemas/`, `validators/`, `config/`, `utils/`, `components/`, mais
**jamais l'inverse**. Deux features ne doivent pas s'importer directement
l'une l'autre.

### `lib/`

Utilitaires techniques transverses à toute l'application : validation des
variables d'environnement (`env.client.ts`, `env.server.ts`), session
serveur (`session.server.ts` — lecture/vérification du cookie de session,
`getSession()`/`requireSession()`), helper `cn()` (Tailwind). Pas de règle
métier ici.

> Précision (corrige une erreur de la révision précédente de ce document) :
> `lib/env.client.ts` **n'est pas** gardé par `"client-only"`, contrairement à
> `firebase/client.ts`. Les valeurs `NEXT_PUBLIC_*` sont sûres à lire aussi
> bien côté serveur (ex. `generateMetadata`) que client — seul
> `lib/env.server.ts` (vrais secrets) est gardé par `"server-only"`.

### `hooks/`

Hooks React génériques, indépendants du domaine métier : `use-auth.ts`,
`use-mounted.ts` (détection client-only sans effet, via
`useSyncExternalStore`), `use-local-storage.ts`, `use-debounced-callback.ts`.
Un hook lié à une seule feature vit dans `features/<name>/hooks`, pas ici.

### `services/`

Couche d'accès aux données : encapsule les appels Firestore/Storage/Auth
(requêtes, écritures) derrière des fonctions typées. Sous-dossiers :

- `firestore/` — un fichier par collection racine (`products.ts`,
  `categories.ts`, `collections.ts`, `users.ts`, `inventory.ts`,
  `suppliers.ts`, `incoming-shipments.ts`, `stock-movements.ts`), CRUD +
  requêtes de liste + transitions d'état (`publishProduct`,
  `archiveProduct`, ...). `alerts.ts` et `stock-dashboard.ts` (Sprint 2B)
  sont des services **de composition** : ils orchestrent plusieurs services
  mono-collection pour produire une vue agrégée (alertes, stats du
  dashboard) plutôt que de représenter une collection Firestore.
- `storage/` — upload/suppression de fichiers Firebase Storage
  (`images.ts` : `uploadImage(folder, file)`, utilisé par produits,
  catégories et collections).

Objectifs :

- centraliser les requêtes pour appliquer une stratégie de coût cohérente
  (voir `docs/firestore-architecture.md` §9) ;
- isoler le SDK Firebase du reste du code (facilite tests et migration) ;
- être l'unique point d'entrée utilisé par les Server Actions, les Route
  Handlers et les Server Components pour lire/écrire des données.

Les composants ne doivent jamais appeler `firebase/client.ts` ou
`firebase/admin.ts` directement — ils passent par `services/`. Toutes les
fonctions de `services/firestore/*` sont `"server-only"`.

### `firebase/`

Uniquement l'initialisation des SDK (singletons) :

- `client.ts` — SDK client (Auth, Firestore, Storage, App Check préparé),
  gardé par `"client-only"`, utilisé dans les Client Components.
- `admin.ts` — SDK Admin (server-only, via le package `server-only`), utilisé
  par `services/`, les Server Actions, les Route Handlers et `proxy.ts`.

Aucune requête métier ici — seulement le bootstrap des instances.

### `types/`

Types TypeScript partagés entre plusieurs features, en particulier le miroir
des entités Firestore décrites dans `docs/firestore-architecture.md` :
`Product`/`ProductDocument`, `Category`/`CategoryDocument`,
`Collection`/`CollectionDocument`, `Inventory`/`InventoryDocument`,
`Supplier`/`SupplierDocument`, `IncomingShipment`/`IncomingShipmentDocument`,
`StockMovement`/`StockMovementDocument` (Sprint 2B), `UserProfile`, `Role`,
`CursorPage<T>`, `ActionResult<T>`, `StockAlert` (calculé, jamais persisté —
voir `services/firestore/alerts.ts`), `FirestoreTimestamp` (interface
structurelle compatible avec `firebase/firestore` et
`firebase-admin/firestore`, pour rester SDK-agnostique). Convention :
`XDocument` = forme exacte du document Firestore (sans `id`) ; `X extends
XDocument { id: string }` = type utilisé partout ailleurs dans l'app. Types
purs, aucune logique — exception assumée : `types/inventory.ts` exporte
aussi `variantIdsOrDefault()`, une fonction pure liée de si près à
`DEFAULT_VARIANT_ID` qu'un fichier séparé aurait été un détour inutile.

### `schemas/`

Schémas Zod de validation d'entrée (formulaires, Server Actions), un fichier
par entité : `auth.schema.ts`, `product.schema.ts`, `category.schema.ts`,
`collection.schema.ts`. Convention importante : **pas de `.default(...)`**
sur un schéma consommé par `useForm<T>()` côté client — Zod fait alors
diverger son type d'entrée (`z.input`) et de sortie (`z.output`), ce qui
casse le typage de React Hook Form. Les valeurs par défaut vivent à un seul
endroit : le mapper `features/<name>/lib/<entity>-mappers.ts`
(`productToFormDefaults()`, etc.), qui fournit systématiquement tous les
champs.

### `validators/`

Fonctions de validation **métier**, au-delà de la forme d'un objet (déjà
couverte par `schemas/`) : `slug.validator.ts` (`generateUniqueSlug` — génère
un slug unique en interrogeant Firestore via une fonction `exists` injectée,
pour rester testable sans base de données), `role.validator.ts`
(`canAssignRole` — un acteur ne peut jamais assigner un rôle égal ou
supérieur au sien), `inventory.validator.ts` (**Sprint 2B**)
(`computeInventoryMutation` — cœur pur des règles métier d'inventaire :
stock disponible = physique − réservé, refus si le résultat serait négatif,
refus d'une réservation qui dépasse le disponible. Extrait de
`services/firestore/inventory.ts` précisément pour être testé sans
transaction Firestore — `services/firestore/inventory.ts` l'appelle
depuis l'intérieur d'un `runTransaction()` avec la valeur la plus fraîche).

### `config/`

Configuration statique, non sensible : `site.ts` (nom/description du site),
`nav.ts` (`mainNav`, `adminNav` avec rôle minimum par lien).

### `providers/` et `contexts/`

Séparation volontaire : `contexts/` ne contient que la définition du
contexte React (`createContext`, types), sans logique ni effet de bord ;
`providers/` contient le composant qui l'alimente (`auth-provider.tsx`,
`theme-provider.tsx`) et compose l'arbre de providers racine
(`app-providers.tsx`).

### `utils/`

Fonctions pures et testables unitairement, sans dépendance à React ni à
Firebase : `slug.ts` (slugify), `currency.ts` (formatage prix), `pagination.ts`
(encodage/décodage d'un curseur de pagination Firestore en jeton opaque
base64 URL-safe, via `TextEncoder`/`btoa` plutôt que `Buffer` pour rester
utilisable côté client comme serveur).

### `styles/`

Styles globaux additionnels si `app/globals.css` ne suffit pas. Avec
Tailwind v4, ce dossier reste minimal.

### `functions/`

Sous-projet Node/TypeScript indépendant (son propre `package.json`,
`tsconfig.json`) déployé séparément via `firebase deploy --only functions`,
et **exclu du lint/build de l'app Next.js** (`eslint.config.mjs` l'ignore
explicitement). Structure interne :

```
functions/src/
├── auth/        triggers Authentication (before-create claim, onCreate profil, onDelete cleanup)
├── firestore/   triggers Firestore (non implémenté — calculs, notifications, décrément stock)
├── http/        endpoints HTTPS / callable (health-check, setUserRole)
├── lib/         helpers internes (admin.ts, roles.ts — copie volontaire de types/roles.ts)
├── scheduled/   jobs planifiés (non implémenté)
└── index.ts     point d'entrée, ré-exporte les fonctions actives
```

Voir la section "Monorepo & partage de code" de
`docs/technical-recommendations.md` pour la question du partage de types
entre `functions/` et l'app Next.js — `functions/src/lib/roles.ts` est un
exemple concret de duplication assumée.

## Conventions de nommage

| Élément                   | Convention                           | Exemple                                    |
| ------------------------- | ------------------------------------ | ------------------------------------------ |
| Dossiers                  | `kebab-case`                         | `features/preorder`                        |
| Fichiers composants       | `kebab-case.tsx`                     | `product-form.tsx`                         |
| Export de composant       | `PascalCase`                         | `export function ProductForm`              |
| Hooks                     | `use-kebab-case.ts` / `useCamelCase` | `use-local-storage.ts` → `useLocalStorage` |
| Fonctions utilitaires     | `camelCase`                          | `formatPriceMinor()`                       |
| Types / interfaces        | `PascalCase`                         | `type ProductStatus`                       |
| Variables d'environnement | `SCREAMING_SNAKE_CASE`               | `NEXT_PUBLIC_APP_URL`                      |

Les conventions Firestore (collections, champs, sous-collections) sont
définies séparément dans `docs/firestore-architecture.md`.

## Principes transverses

- **Typage strict** : `strict: true` dans tous les `tsconfig.json` (app et
  functions). Pas de `any` implicite ; préférer un type explicite ou
  `unknown` + validation Zod aux frontières (entrée utilisateur, réponses
  externes, retour de Server Action).
- **Séparation des responsabilités** : UI (`components/`, `features/*/components`)
  ne parle jamais directement au SDK Firebase ; elle passe par `services/`.
  Aucun composant n'importe `firebase/admin.ts` ni `firebase/client.ts`
  directement.
- **Boundary client/serveur** : `firebase/client.ts` importe `"client-only"` ;
  `firebase/admin.ts`, `lib/env.server.ts`, `lib/session.server.ts` et tous
  les fichiers de `services/firestore/` et `services/storage/` importent
  `"server-only"`. Toute tentative de les importer du mauvais côté échoue au
  build, par construction.
- **Server Actions** : toujours `"use server"` en tête de fichier, et
  **chaque export doit être une fonction `async` déclarée** (`export async
function foo()`), pas une constante fléchée même si elle retourne une
  Promise (`export const foo = () => bar()` casse silencieusement la
  génération de la référence client par Next.js — piège rencontré et corrigé
  au Sprint 2A). Chaque action revérifie systématiquement la session/le rôle
  côté serveur via `requireSession()` — jamais de confiance dans un rôle
  transmis par le client.
- **Suppression logique uniquement** : aucune route n'expose de suppression
  physique pour `products`/`collections` — voir
  `docs/firestore-architecture.md` §5.1. `inventory`/`stockMovements`
  n'exposent même pas la notion d'archivage : `stockMovements` est un
  registre append-only pur (Sprint 2B), aucune Server Action d'`update`/
  `delete` n'existe pour cette collection.
- **Écritures d'inventaire toujours transactionnelles** (Sprint 2B) :
  `services/firestore/inventory.ts` fait passer _tout_ mouvement de stock
  (ajustement, réservation, libération, entrée, sortie, réception
  d'arrivage) par une unique fonction (`applyMovement`) qui lit et écrit
  dans un `adminDb.runTransaction()` — jamais un `update()` simple sur un
  champ quantité. Voir `docs/firestore-architecture.md` §5.2.
- **PWA-ready** : `public/manifest.webmanifest`, les icônes
  (`public/icons/`, `public/apple-touch-icon.png`) et les métadonnées
  `app/layout.tsx` sont en place ; `public/sw.js` est un service worker
  minimal (installabilité uniquement, pas de cache offline).
