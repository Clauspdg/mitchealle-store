# Mitchaella Store

Boutique en ligne — Next.js (App Router) + TypeScript + Tailwind CSS +
Shadcn UI + Framer Motion, backend Firebase (Authentication, Firestore,
Storage, Cloud Functions).

> **Statut** : infrastructure en place, aucune fonctionnalité métier ni
> règle Firestore définitive n'est encore implémentée. Voir
> [`docs/technical-recommendations.md`](docs/technical-recommendations.md)
> pour les points en attente de validation.

## Stack

- [Next.js 16](https://nextjs.org/docs) (App Router, Turbopack)
- React 19.2, TypeScript strict
- Tailwind CSS v4
- [Shadcn UI](https://ui.shadcn.com) (style `base-nova`, sur `@base-ui/react`)
- Framer Motion
- Firebase (Authentication, Firestore, Storage, Cloud Functions)
- Zod (validation des variables d'environnement et, plus tard, des entrées
  utilisateur)

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs (voir Firebase Console)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

Voir [`.env.example`](.env.example) — chaque variable y est documentée
(source, où la trouver dans la Firebase Console, portée client/serveur).
L'app échoue au démarrage avec un message explicite si une variable requise
manque (`lib/env.client.ts`, `lib/env.server.ts`).

### Émulateurs Firebase (développement local sans toucher au projet réel)

```bash
firebase emulators:start
```

Puis mettre `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` dans `.env.local` pour
que le SDK client se connecte aux émulateurs plutôt qu'au projet Firebase
réel.

### Cloud Functions

```bash
cd functions
npm install
npm run build
```

`functions/` est un projet TypeScript indépendant (déploiement séparé via
`firebase deploy --only functions`) — voir
[`docs/project-structure.md`](docs/project-structure.md#functions).

## Scripts

| Commande            | Description |
| --------------------- | ------------- |
| `npm run dev`          | Serveur de développement (Turbopack) |
| `npm run build`        | Build de production |
| `npm run start`        | Démarre le build de production |
| `npm run lint`         | ESLint |

## Documentation

- [`docs/project-structure.md`](docs/project-structure.md) — organisation du
  dépôt, rôle de chaque dossier, conventions de nommage.
- [`docs/firestore-architecture.md`](docs/firestore-architecture.md) —
  modèle de données Firestore proposé (collections, champs, relations,
  index, stratégie de sécurité et de coût de lecture).
- [`docs/technical-recommendations.md`](docs/technical-recommendations.md) —
  recommandations techniques et liste des décisions Product Owner en
  attente.
