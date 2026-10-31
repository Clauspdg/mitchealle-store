# Sprint 13.2 — Isolation de l'environnement DEV

État au 31 octobre 2026.

## Conclusion

**DEV n'est pas isolé de PROD.** `clag-dev` et `mitchealle-store` ne sont séparés
que par leur backend App Hosting et leur configuration d'URL et d'indexation.
Tant que le projet DEV n'existe pas, aucun test d'écriture ne doit être fait sur
`clag-dev`.

## Audit

| Ressource                      | DEV (`clag-dev`)                                              | PROD (`mitchealle-store`)             | Isolé ?                                    |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| App Hosting                    | Backend distinct, déploiement manuel                          | Déploiement automatique depuis `main` | Oui                                        |
| Projet Firebase                | `mictchealla-store`                                           | `mictchealla-store`                   | **Non**                                    |
| Firestore                      | Base `(default)`                                              | Même base                             | **Non**                                    |
| Authentication                 | Mêmes comptes                                                 | Mêmes comptes                         | **Non**                                    |
| Storage                        | Même bucket                                                   | Même bucket                           | **Non**                                    |
| Functions                      | `setUserRole`, `healthCheck`, `onUserDeleted`, `beforeCreate` | Mêmes fonctions                       | **Non**                                    |
| Blocking function              | `beforeCreate` s'exécute à chaque inscription                 | Idem                                  | **Non**                                    |
| Compte de service et clé Admin | `firebase-app-hosting-compute`                                | Même compte, mêmes secrets            | **Non**                                    |
| Clés API web                   | Valeurs de `apphosting.yaml`                                  | Mêmes valeurs                         | **Non** (restrictions non lisibles)        |
| Stripe                         | Clé `sk_test_` de type placeholder                            | Même secret                           | **Non**, mais aucun paiement réel possible |
| PayPal et Resend               | Absents de `apphosting.yaml`                                  | Absents                               | Sans objet                                 |

Données réelles exposées à DEV : 2 utilisateurs, 6 commandes, 5 paniers, 94 produits,
501 avis.

## Autres risques constatés

- **Sauvegardes PROD :** aucune sauvegarde planifiée, restauration à un instant T
  désactivée, protection contre la suppression désactivée.
- **Poste local :** `.env.local` contient une clé Admin qui accède à la base réelle.
  `npm run dev` lit et écrit donc les données réelles.
- **Paiement :** la clé Stripe étant un placeholder, le paiement Stripe ne peut pas
  aboutir, y compris sur PROD.

## Séparation proposée

Créer un projet Firebase distinct, `clag-dev`, avec sa propre base, son Auth, son
bucket, ses Functions, ses secrets et sa clé Stripe de test. Le backend App Hosting
DEV actuel serait remplacé par un backend dans ce projet.

1. Vous autorisez la création du projet et son rattachement à un compte de
   facturation (App Hosting exige le forfait Blaze).
2. Création de Firestore, Auth, Storage et de l'application web.
3. Déploiement des règles, des index et des Functions sur ce seul projet. Aucune
   commande ne doit cibler `mictchealla-store`.
4. Création des secrets DEV : nouvelle clé Admin et clé Stripe de test.
5. Remplacement des valeurs Firebase dans `apphosting.dev.yaml`.
6. Chargement du jeu fictif avec `npm run seed:demo` : aucune donnée réelle copiée.
7. Vérification de la séparation, puis autorisation du domaine et de Google sur le
   seul Auth DEV.
8. Suppression du backend `clag-dev` de `mictchealla-store`, sur votre accord.

## Coût potentiel

Tarifs relevés le 31 octobre 2026 ; à reconfirmer sur les pages officielles, car
certaines pages consultées étaient anciennes.

| Poste              | Inclus sans frais                                    | Au-delà                   |
| ------------------ | ---------------------------------------------------- | ------------------------- |
| Sortie App Hosting | 10 Gio par mois                                      | 0,15 $ à 0,20 $ par Gio   |
| Cloud Run          | 180 000 vCPU-s, 360 000 Gio-s, 2 M requêtes par mois | Selon usage               |
| Cloud Build        | 2 500 minutes (page App Hosting)                     | 0,006 $ par minute        |
| Artifact Registry  | 0,5 Go                                               | 0,10 $ par Go et par mois |

Le projet et Blaze n'ont pas de frais fixes. Avec `minInstances: 0` et un usage de
test, le coût attendu est faible, de l'ordre de 0 à quelques dollars par mois. Cette
estimation n'est pas garantie : Firestore, Storage et Secret Manager restent à
confirmer. Une alerte budgétaire est recommandée, mais elle ne plafonne pas la
dépense.

Sources : [coûts App Hosting](https://firebase.google.com/docs/app-hosting/costs),
[tarifs Firebase](https://firebase.google.com/pricing),
[tarifs Firestore](https://cloud.google.com/firestore/pricing).

## Jeu de démonstration

`npm run seed:demo` charge 3 comptes fictifs (`@demo.clag.test`), 8 catégories et
24 produits. Le script exige `SEED_PROJECT_ID` et `SEED_DEMO_PASSWORD`, et il refuse
le projet de production hors émulateurs.
