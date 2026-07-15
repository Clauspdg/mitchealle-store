# Sprint 1 — Core Foundation — Rapport

> Périmètre respecté : aucun module Produits, Catalogue, Commandes,
> Paiements ou Livraison n'a été développé. Ce sprint couvre uniquement les
> fondations techniques.

## 1. Résumé

Toutes les sections du brief Sprint 1 ont été livrées et vérifiées
(compilation, lint, types, tests). Le détail par section suit ; les
limitations rencontrées (réseau du bac à sable, choix techniques) sont
documentées en §3 et §4.

## 2. Réalisé

### 2.1 Firebase

| Élément           | Statut                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | ✅ SDK client + Admin configurés (`firebase/client.ts`, `firebase/admin.ts`)                                               |
| Firestore         | ✅ SDK configurés ; règles toujours en deny-all (voir `firestore.rules`)                                                   |
| Storage           | ✅ SDK configurés ; règles toujours en deny-all (voir `storage.rules`)                                                     |
| Cloud Functions   | ✅ Projet `functions/` — triggers auth + callable `setUserRole` implémentés                                                |
| Firebase Emulator | ✅ `firebase.json` configure auth/firestore/storage/functions/UI ; activable via `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` |
| App Check         | ✅ Préparé (`firebase/client.ts`, variables d'env dédiées) — **non activé** : nécessite une vraie clé reCAPTCHA (voir §4)  |

### 2.2 Authentification

Toutes les briques demandées sont en place, dans `features/auth/` :

- Connexion / Inscription / Mot de passe oublié / Connexion Google
  (`login-form.tsx`, `register-form.tsx`, `forgot-password-form.tsx`,
  `google-sign-in-button.tsx`), validés par Zod (`schemas/auth.schema.ts`).
- Gestion de session : `providers/auth-provider.tsx` synchronise le SDK
  client avec un cookie de session httpOnly via `app/api/auth/session/route.ts`
  (`adminAuth.createSessionCookie` / `verifySessionCookie`), lisible par les
  Server Components, Server Actions et `proxy.ts`.
- Déconnexion : `sign-out-button.tsx`.
- Pages protégées : `/account` (client) et `/admin` (staff+), toutes deux en
  Server Components qui appellent `requireSession()`.
- Guards : `lib/session.server.ts` (`getSession`, `requireSession`) —
  l'autorité finale, appelée dans chaque page protégée.
- Middleware : `proxy.ts` (nom imposé par Next.js 16, ex-`middleware.ts`) —
  redirection rapide avant même le rendu de la page, en complément des
  guards (défense en profondeur, pas un remplacement).

### 2.3 Rôles

- 4 rôles : `customer`, `staff`, `admin`, `superAdmin`
  (`types/roles.ts`) — voir §4 pour un écart à synchroniser avec le document
  d'architecture Firestore.
- Attribution par **custom claims** Firebase Auth, jamais par un champ
  Firestore modifiable côté client :
  - `functions/src/auth/before-create.ts` (blocking function `beforeUserCreated`) :
    attache `role: "customer"` dès la création du compte, avant même la
    première émission de token.
  - `functions/src/http/set-user-role.ts` (callable `setUserRole`) : seul
    chemin pour changer un rôle, avec vérification de hiérarchie
    (`validators/role.validator.ts` / `functions/src/lib/roles.ts` —
    duplication documentée, voir §4).
- Vérification **toujours côté serveur** : `lib/session.server.ts` lit les
  claims du cookie de session vérifié par l'Admin SDK ; `proxy.ts` fait de
  même. Aucune élévation de privilège n'est possible côté client.

### 2.4 Layout

`components/layout/` : `header.tsx` (nav desktop + `Sheet` mobile),
`footer.tsx`, `admin-sidebar.tsx` (filtrée par rôle). `components/shared/` :
`page-breadcrumb.tsx`, `mode-toggle.tsx`. Fichiers de convention Next.js :
`app/not-found.tsx` (404), `app/loading.tsx`, `app/error.tsx` +
`app/global-error.tsx` (error boundary route-level et root-level).

### 2.5 Design system

Composants Shadcn UI (style `base-nova`, sur `@base-ui/react`) : Button,
Card, Input, Textarea, Badge, Avatar, Dialog, Drawer, Dropdown, Alert,
Sonner (Toast), Skeleton, Table, Pagination, Tabs, Calendar + Date Picker,
Select, Checkbox, Switch, Tooltip, Popover, Sheet, Breadcrumb — tous dans
`components/ui/`, réutilisables. Deux composants (`pagination.tsx`,
`date-picker.tsx`) ont dû être écrits à la main : le registre `base-nova`
ne les publie pas encore (voir §4).

### 2.6 Thèmes

`providers/theme-provider.tsx` (next-themes, stratégie `class`,
`defaultTheme="system"`). Dark mode **préparé et fonctionnel** (jeu complet
de variables CSS `.dark` généré par Shadcn dans `app/globals.css`), avec un
sélecteur (`ModeToggle`) dans le header pour le démontrer.

### 2.7 PWA

`public/manifest.webmanifest` (icônes 192/512 + SVG, `display: standalone`),
métadonnées `appleWebApp` + `mobile-web-app-capable` dans `app/layout.tsx`,
icônes Android/iOS (`public/icons/`, `public/apple-touch-icon.png`),
`public/sw.js` enregistré uniquement en production
(`components/shared/register-service-worker.tsx`) — **sans stratégie de
cache offline**, conformément à la demande.

### 2.8 Structure

Tous les dossiers demandés existent et sont peuplés de façon cohérente avec
`docs/project-structure.md` : `components/`, `features/`, `services/`,
`hooks/`, `firebase/`, `types/`, `utils/`, `providers/`, `contexts/`,
`validators/`, `schemas/`, `config/`. `docs/project-structure.md` documente
déjà le rôle de chacun ; aucune mise à jour n'était nécessaire pour les
nouveaux dossiers (`providers`, `contexts`, `validators`, `schemas`,
`config`), leur usage réel suit la même logique de séparation des
responsabilités déjà écrite.

### 2.9 TypeScript

`strict: true` partout (app + functions). Types globaux dans `types/`
(`roles.ts`, `user.ts`, `session.ts`, `firestore.ts` — ce dernier abstrait
le type `Timestamp` pour ne dépendre d'aucun SDK précis). Validation Zod à
chaque frontière utilisateur (`schemas/auth.schema.ts`, `functions/src/http/set-user-role.ts`).
Aucun `any` dans le code applicatif.

### 2.10 Qualité

ESLint (déjà en place), **Prettier** (+ `prettier-plugin-tailwindcss`),
**Husky** (`pre-commit` → `lint-staged`, `commit-msg` → commitlint),
**lint-staged** (ESLint + Prettier sur les fichiers stagés),
**Conventional Commits** (`commitlint.config.mjs`, testé avec un message
valide et un invalide — voir §5).

### 2.11 Tests

- **Vitest** + **React Testing Library** (`vitest.config.ts`,
  `vitest.setup.ts`) : 4 fichiers, 18 tests, tous passants — logique de
  rôles (`types/roles.test.ts`), règle métier d'attribution de rôle
  (`validators/role.validator.test.ts`), schémas Zod
  (`schemas/auth.schema.test.ts`), rendu d'un composant du design system
  (`components/ui/button.test.tsx`).
- **Playwright** configuré (`playwright.config.ts`,
  `tests/e2e/smoke.spec.ts` : accueil, page de connexion, 404, redirection
  `/account` → `/login` si non connecté) — **binaires navigateur non
  installés** dans ce bac à sable (voir §4).

### 2.12 Documentation

Ce document (`docs/sprint-1-report.md`).

## 3. Ce qu'il reste à faire

- **Modules métier** : Produits, Catalogue, Commandes, Paiements, Livraison
  — volontairement hors périmètre, à démarrer sur validation d'un Sprint 2.
- **Projet Firebase réel** : ce sprint a été vérifié avec des identifiants
  factices (`.env.local`, non commité) ; un vrai projet Firebase doit être
  créé/connecté avant toute donnée réelle.
- **Identity Platform** : `beforeUserCreated` (blocking function) nécessite
  l'upgrade "Identity Platform" du projet Firebase (gratuit dans la même
  tranche, mais c'est une action GCP à faire, pas seulement du code).
- **Icônes/branding réels** : `public/icon.svg`, `public/icons/*.png` et
  `apple-touch-icon.png` sont des **placeholders** (carré uni + monogramme
  "M") générés programmatiquement, en l'absence d'assets de design — à
  remplacer dès que la charte graphique est fournie.
- **Playwright** : configuration et premier scénario écrits, mais les
  binaires Chromium n'ont pas pu être téléchargés dans ce bac à sable
  (réseau restreint) — lancer `npx playwright install` dans un
  environnement avec accès réseau complet avant `npm run test:e2e`.
- **Tests Cloud Functions** : aucun test automatisé pour `functions/` —
  nécessite l'émulateur Firebase ou le Firebase Test SDK, jugé disproportionné
  tant qu'il n'y a que des triggers d'auth.
- **`audit_logs`** : documenté dans l'architecture Firestore, mais pas
  encore alimenté (ex. `setUserRole` ne journalise pas encore) — prévu
  quand le panneau d'administration sera construit.
- **`settings/{domain}`** : collection documentée, aucun document créé —
  attend un écran d'administration pour être renseignée.

## 4. Problèmes rencontrés

- **Réseau instable du bac à sable** : plusieurs appels à `npx shadcn add`
  ont échoué de façon intermittente (`ENOTFOUND ui.shadcn.com`) puis réussi
  au retry. Le composant `pagination` et un essai sur `sidebar` ont
  finalement été écrits à la main (mêmes conventions que les composants
  générés) plutôt que de dépendre du réseau.
- **`@vitejs/plugin-react` v6** exige `@babel/core` v8 (encore en RC), en
  conflit avec `@babel/core` v7 requis par `shadcn`. Résolu en épinglant
  `@vitejs/plugin-react@^4`, stable et compatible.
- **Zod v4** : l'API des messages d'erreur personnalisés a changé
  (`{ error: "..." }` au lieu de `{ message: "..." }` sur certains
  validateurs) ; `z.literal(true, {...})` infère un type littéral `true` qui
  ne s'accorde pas avec un `<Checkbox>` contrôlé — remplacé par
  `z.boolean().refine(...)`.
- **Base UI (`@base-ui/react`)**, utilisé par le style Shadcn `base-nova`,
  n'a pas d'équivalent `asChild` (Radix) — la composition se fait via une
  prop `render={<Composant />}`, utilisée dans `Header`, `PageBreadcrumb`,
  `DatePicker`, `ModeToggle`, etc.
- **Règle ESLint `react-hooks/set-state-in-effect`** (React Compiler) a
  rejeté le classique pattern `useEffect(() => setMounted(true), [])` dans
  `ModeToggle` — remplacé par un hook `useMounted()` basé sur
  `useSyncExternalStore` (`hooks/use-mounted.ts`), maintenant réutilisable.
- **Dépôt Git inexistant** : `mitchaella-store` n'était pas un dépôt Git,
  ce qui bloquait Husky (les hooks doivent s'attacher à `.git/`). Sur votre
  confirmation, le dépôt a été initialisé et un commit initial créé.
- **Build Next.js** échouait pendant `next build` car des Server Components
  (`(auth)/layout.tsx` notamment) appellent `getSession()` → Admin SDK dès
  la collecte des pages, ce qui exige des identifiants Firebase valides
  même pour un build structurel. Un `.env.local` avec des valeurs factices
  (clé RSA générée localement, jamais commitée) a permis de vérifier que le
  build réussit — à refaire avec de vraies valeurs pour un déploiement réel.

## 5. Vérifications effectuées

| Commande                       | Résultat                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `npx tsc --noEmit` (app)       | ✅ Aucune erreur                                             |
| `npx tsc --noEmit` (functions) | ✅ Aucune erreur                                             |
| `npm run lint`                 | ✅ Aucune erreur, aucun warning                              |
| `npm run build`                | ✅ Compile, toutes les routes attendues présentes            |
| `npx vitest run`               | ✅ 4 fichiers, 18 tests passants                             |
| `commitlint`                   | ✅ Rejette un message non conventionnel, accepte `feat: ...` |

## 6. Recommandations avant Sprint 2

1. Créer le vrai projet Firebase (ou confirmer celui existant), activer
   Identity Platform, générer les vraies clés (Admin SDK + Client SDK) et
   les déposer dans `.env.local` / le secret manager de l'hébergeur choisi.
2. Fournir les assets de marque (logo, icônes) pour remplacer les
   placeholders PWA.
3. Confirmer la région GCP des Cloud Functions (actuellement
   `europe-west1`, à valider — voir `docs/technical-recommendations.md`).
4. Lancer `npx playwright install` dans un environnement avec accès réseau
   complet pour activer les tests e2e.
5. Une fois ces points validés, le Sprint 2 peut démarrer sur le premier
   module métier (probablement `catalog`, socle des autres) — en attendant
   votre validation explicite, aucun code métier ne sera ajouté.
