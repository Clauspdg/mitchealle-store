# Recommandations techniques & décisions Product Owner

Ce document accompagne `docs/project-structure.md` et
`docs/firestore-architecture.md`. Il liste ce qui a été mis en place, ce qui
est recommandé pour la suite, et — surtout — ce qui **doit être tranché par
le Product Owner** avant d'implémenter les fonctionnalités métier.

## 1. État de l'infrastructure

Fait, vérifié, fonctionnel :

- Next.js 16 (App Router), React 19.2, TypeScript strict, Tailwind CSS v4.
- Shadcn UI initialisé (style `base-nova`, sur `@base-ui/react` — le
  successeur de Radix utilisé par les dernières versions de Shadcn), avec un
  premier lot de composants (`button`, `input`, `label`, `card`, `dialog`,
  `dropdown-menu`, `avatar`, `badge`, `separator`, `skeleton`, `sonner`).
- Framer Motion (`framer-motion`) installé, prêt à l'emploi.
- `react-hook-form` + `@hookform/resolvers` installés en prévision des
  formulaires (auth, checkout, profil) — le composant `form` du registre
  Shadcn actuel ne fournit pas de fichier pour ce style ; la composition se
  fera manuellement avec `react-hook-form` + les primitives `input`/`label`.
- SDK Firebase client (`firebase/client.ts`) et Admin (`firebase/admin.ts`),
  chacun protégé par `client-only` / `server-only` pour empêcher les fuites
  de secrets ou de code serveur vers le bundle navigateur.
- Validation stricte des variables d'environnement via Zod
  (`lib/env.client.ts`, `lib/env.server.ts`) — l'application refuse de
  démarrer si une variable requise est absente ou mal formée.
- `.env.example` documenté, sans secret.
- Scaffold Cloud Functions (`functions/`) : projet TypeScript indépendant,
  une fonction `healthCheck` de smoke-test, dossiers `auth/`, `firestore/`,
  `http/`, `scheduled/` prêts à recevoir les triggers métier.
- `firebase.json` (Firestore, Storage, Functions, émulateurs), `firestore.rules`
  et `storage.rules` en **deny-all** temporaire, `firestore.indexes.json` vide.
- Arborescence modulaire documentée (`docs/project-structure.md`).

## 2. Recommandations techniques

### 2.1 Monorepo & partage de code avec `functions/`
`functions/` est un package npm séparé (nécessaire pour un déploiement
indépendant), ce qui veut dire que les types de `types/` et les schémas Zod
de l'app Next.js **ne sont pas partagés automatiquement** avec les Cloud
Functions aujourd'hui. Deux options pour plus tard :
- Dupliquer les types nécessaires dans `functions/src/types.ts` (simple,
  mais duplication à maintenir) ;
- Passer à un vrai monorepo (npm/pnpm workspaces) avec un package
  `packages/shared` contenant les types et schémas communs.
Recommandation : rester simple (option 1) tant que peu de types sont
partagés ; migrer vers un workspace si la duplication devient un problème
réel.

### 2.2 PWA
`app/layout.tsx` référence un manifest (`public/manifest.webmanifest`) et
les métadonnées de base sont en place pour qu'une installation "Ajouter à
l'écran d'accueil" fonctionne. La mise en cache offline (service worker)
n'est **pas** implémentée : c'est un choix de stratégie (voir §3) plutôt
qu'un défaut d'infrastructure — un mauvais cache offline sur un catalogue
e-commerce peut afficher des prix/stocks périmés si mal configuré.

### 2.3 Qualité de code
- TypeScript `strict: true` partout (app + functions).
- Limites client/serveur imposées au build via `server-only` / `client-only`
  plutôt que par convention orale.
- ESLint flat config (héritée de `eslint-config-next`) ; `next lint` est
  supprimé depuis Next.js 16, le script `lint` utilise directement l'ESLint
  CLI (déjà en place dans `package.json`).
- Prochaine étape recommandée : Prettier + un hook pre-commit (lint-staged)
  pour uniformiser le formatage avant le premier commit de code métier.

### 2.4 Observabilité
Non mise en place à ce stade (hors périmètre "infrastructure"). À prévoir
avant la mise en production : logs structurés Cloud Functions, alerting sur
échecs de paiement/livraison, et un outil de suivi d'erreurs front (ex.
Sentry) — dépend du budget/outillage choisi par le Product Owner.

## 3. Décisions à prendre par le Product Owner

Ces points bloquent ou orientent fortement l'implémentation métier à venir.

| # | Décision | Impact si non tranché |
| - | --------- | ----------------------- |
| 1 | **Devise(s)** supportée(s) — HTG, USD, ou les deux avec taux de change ? | Impacte `products.currency`, l'affichage prix, et le calcul des totaux de commande. |
| 2 | **Pré-commandes** : variante du modèle `orders` (recommandé) ou collection `preorders` séparée ? | Impacte le schéma, les règles de sécurité, et les Cloud Functions de suivi. |
| 3 | **Fournisseur(s) de paiement** (MonCash, Stripe, virement/dépôt manuel, autre) — un seul ou plusieurs simultanés ? | Impacte `orders/payments`, les webhooks Cloud Functions, et les variables d'environnement à ajouter à `.env.example`. |
| 4 | **Livraison** : coursier interne, transporteur tiers avec tracking API, retrait en boutique uniquement, ou combinaison ? | Impacte `orders.delivery` et une éventuelle intégration API tierce. |
| 5 | **Avis produits (reviews)** : fonctionnalité prévue à court terme ? | Impacte l'ajout d'une sous-collection `products/{id}/reviews` et des champs `ratingAverage`/`ratingCount`. |
| 6 | **Profondeur des catégories** : 2 niveaux suffisent-ils, ou faut-il une hiérarchie arbitraire ? | Impacte `categories.parentId` vs un modèle d'arbre plus général. |
| 7 | **Hébergement** de l'app Next.js : Vercel, Firebase App Hosting, ou Cloud Run ? | `firebase.json` ne configure pas de section `hosting` pour l'instant — à ajouter selon la cible retenue. |
| 8 | **Région GCP** des Cloud Functions et de Firestore (actuellement `europe-west1` dans `healthCheck`, à confirmer) | Impacte la latence pour les utilisateurs cibles et les coûts. |
| 9 | **Notifications** : email, SMS, WhatsApp, push navigateur, ou combinaison ? | Impacte les intégrations tierces à ajouter dans `functions/src/http` et les variables d'environnement associées. |
| 10 | **Rôles au-delà de `customer`/`staff`/`admin`** : granularité nécessaire (ex. gestion des stocks vs gestion des commandes) ? | Impacte le modèle de permissions dans les règles de sécurité définitives. |

Tant que ces points ne sont pas validés, aucune règle de sécurité définitive
ni logique métier (Cloud Functions de traitement de commande, formulaires de
checkout, etc.) ne sera implémentée — conformément au périmètre de cette
étape.

## 4. Prochaines étapes suggérées (après validation PO)

1. Valider ou amender le modèle de `docs/firestore-architecture.md` avec les
   réponses du tableau ci-dessus.
2. Écrire les `firestore.rules` / `storage.rules` définitives à partir du
   tableau de permissions §5 du document d'architecture.
3. Générer les types TypeScript miroir dans `types/`.
4. Implémenter `services/firestore/*` (couche d'accès aux données) au-dessus
   de ces types.
5. Démarrer les features dans l'ordre de dépendance naturel : `auth` →
   `catalog` → `cart` → `checkout`/`payment` → `preorder` → `delivery` →
   `profile`/`wishlist`/`notifications`.
