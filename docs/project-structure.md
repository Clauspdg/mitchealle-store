# Architecture du projet — Mitchaella Store

Ce document décrit l'organisation du dépôt, le rôle de chaque dossier et les
conventions à suivre. Il sert de référence avant d'ajouter du code métier.

## Vue d'ensemble

Le projet est un monolithe Next.js (App Router) pour le front + API, avec un
sous-projet indépendant `functions/` pour les Cloud Functions. Firebase sert
de backend (Authentication, Firestore, Storage, Cloud Functions).

```
mitchaella-store/
├── app/            routes Next.js uniquement (pages, layouts, route handlers)
├── components/     UI réutilisable, transverse à plusieurs features
├── features/       modules métier, un dossier par domaine
├── lib/            utilitaires techniques transverses (env, cn, constants)
├── hooks/          hooks React globaux, non liés à une feature
├── services/       couche d'accès aux données (Firestore/Storage/Auth)
├── firebase/       initialisation des SDK Firebase (client + admin)
├── types/          types TypeScript partagés (miroir du modèle Firestore)
├── utils/          fonctions pures, sans dépendance React/Firebase
├── styles/         styles globaux additionnels
├── public/         assets statiques, manifest PWA, icônes
├── docs/           documentation technique
└── functions/      Cloud Functions (déploiement indépendant)
```

## Rôle détaillé de chaque dossier

### `app/`
Uniquement des fichiers de convention Next.js : `page.tsx`, `layout.tsx`,
`loading.tsx`, `error.tsx`, `route.ts`, `proxy.ts` (ex-`middleware.ts` depuis
Next 16). Aucune logique métier ici — une page importe et compose des
composants venant de `features/*` et `components/*`.

### `components/`
Composants UI réutilisables **sans logique métier propre à une feature**.
- `ui/` — primitives Shadcn UI (générées par la CLI, à ne pas éditer à la main
  sauf besoin ; préférer composer par-dessus).
- `layout/` — header, footer, navigation, shell de page.
- `product/`, `order/`, `checkout/`, `dashboard/` — composants de présentation
  partagés entre plusieurs pages d'un même domaine (ex. une `ProductCard`
  utilisée à la fois dans le catalogue et la wishlist).
- `shared/` — composants génériques cross-domaine (empty states, loaders,
  boîtes de dialogue de confirmation, etc.).

Règle : un composant ne va dans `components/` que s'il est utilisé par au
moins deux features, ou s'il est purement présentationnel (pas d'accès direct
à Firestore/Firebase).

### `features/`
Un dossier par domaine métier : `auth`, `catalog`, `cart`, `preorder`,
`payment`, `delivery`, `profile`, `wishlist`, `notifications`. Chaque feature
est un module quasi autonome et suit, une fois implémentée, une structure
interne homogène :

```
features/<name>/
├── components/   composants spécifiques à cette feature
├── hooks/        hooks spécifiques à cette feature
├── actions/      Server Actions (mutations)
├── schemas.ts    schémas de validation Zod (entrée utilisateur)
└── types.ts      types spécifiques à la feature (si non partagés globalement)
```

Une feature peut dépendre de `lib/`, `services/`, `types/`, `utils/`,
`components/`, mais **jamais l'inverse** (pas de dépendance d'un dossier
transverse vers une feature). Deux features ne doivent pas s'importer
directement l'une l'autre ; si un besoin de partage apparaît, l'élément
partagé remonte dans un dossier transverse.

### `lib/`
Utilitaires techniques transverses à toute l'application : validation des
variables d'environnement (`env.client.ts`, `env.server.ts`), helper `cn()`
(Tailwind), constantes globales, presets d'animation Framer Motion, etc.
Pas de règle métier ici.

### `hooks/`
Hooks React génériques, indépendants du domaine métier (`use-media-query`,
`use-debounce`, `use-mounted`, `use-local-storage`). Un hook lié à une seule
feature vit dans `features/<name>/hooks`, pas ici.

### `services/`
Couche d'accès aux données : encapsule les appels Firestore/Storage/Auth
(requêtes, écritures) derrière des fonctions typées, ex.
`services/firestore/products.ts`. Objectifs :
- centraliser les requêtes pour appliquer une stratégie de coût cohérente
  (voir `docs/firestore-architecture.md`) ;
- isoler le SDK Firebase du reste du code (facilite tests et migration) ;
- être l'unique point d'entrée utilisé par les Server Actions et les Route
  Handlers pour lire/écrire des données.

Les composants ne doivent jamais appeler `firebase/client.ts` ou
`firebase/admin.ts` directement — ils passent par `services/`.

### `firebase/`
Uniquement l'initialisation des SDK (singletons) :
- `client.ts` — SDK client (Auth, Firestore, Storage), utilisé dans les
  Client Components et par `services/` côté client si nécessaire.
- `admin.ts` — SDK Admin (server-only, via le package `server-only`), utilisé
  par `services/` côté serveur, les Server Actions et les Route Handlers.

Aucune requête métier ici — seulement le bootstrap des instances.

### `types/`
Types TypeScript partagés entre plusieurs features, en particulier le miroir
des entités Firestore décrites dans `docs/firestore-architecture.md`
(`Product`, `Order`, `UserProfile`, etc.). Types purs, aucune logique.

### `utils/`
Fonctions pures et testables unitairement, sans dépendance à React ni à
Firebase (formatage de devise/date, slugify, calculs de totaux, etc.).

### `styles/`
Styles globaux additionnels si `app/globals.css` ne suffit pas (ex. styles
d'impression de facture). Avec Tailwind v4, ce dossier reste minimal.

### `functions/`
Sous-projet Node/TypeScript indépendant (son propre `package.json`,
`tsconfig.json`) déployé séparément via `firebase deploy --only functions`.
Structure interne :
```
functions/src/
├── auth/        triggers Authentication (onCreate, onDelete)
├── firestore/   triggers Firestore (calculs, notifications, décrément stock)
├── http/        endpoints HTTPS / callable (webhooks paiement, actions admin)
├── scheduled/   jobs planifiés (nettoyage, expiration de pré-commandes)
└── index.ts     point d'entrée, ré-exporte les fonctions actives
```
Voir la section "Monorepo & partage de code" de
`docs/technical-recommendations.md` pour la question du partage de types
entre `functions/` et l'app Next.js.

## Conventions de nommage

| Élément                        | Convention                          | Exemple                    |
| ------------------------------ | ------------------------------------ | --------------------------- |
| Dossiers                       | `kebab-case`                         | `features/preorder`         |
| Fichiers composants             | `kebab-case.tsx`                     | `product-card.tsx`          |
| Export de composant             | `PascalCase`                         | `export function ProductCard` |
| Hooks                            | `use-kebab-case.ts` / `useCamelCase` | `use-media-query.ts` → `useMediaQuery` |
| Fonctions utilitaires            | `camelCase`                          | `formatCurrency()`          |
| Types / interfaces               | `PascalCase`                         | `type OrderStatus`          |
| Variables d'environnement        | `SCREAMING_SNAKE_CASE`               | `NEXT_PUBLIC_APP_URL`       |

Les conventions Firestore (collections, champs, sous-collections) sont
définies séparément dans `docs/firestore-architecture.md`.

## Principes transverses

- **Typage strict** : `strict: true` dans tous les `tsconfig.json` (app et
  functions). Pas de `any` implicite ; préférer un type explicite ou
  `unknown` + validation Zod aux frontières (entrée utilisateur, réponses
  externes).
- **Séparation des responsabilités** : UI (`components/`, `features/*/components`)
  ne parle jamais directement au SDK Firebase ; elle passe par `services/`.
- **Boundary client/serveur** : `firebase/client.ts` et `lib/env.client.ts`
  importent `"client-only"` ; `firebase/admin.ts` et `lib/env.server.ts`
  importent `"server-only"`. Toute tentative de les importer du mauvais côté
  échoue au build, par construction.
- **PWA-ready** : `public/manifest.webmanifest` et les métadonnées
  `app/layout.tsx` sont en place ; la stratégie de service worker / cache
  offline reste à valider (voir recommandations).
