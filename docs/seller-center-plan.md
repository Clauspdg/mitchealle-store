# Plan technique — Seller Center et multi-vendeurs

Statut : proposition, aucune implémentation. Base de code : branche
`feat/multi-vendor-foundation`, issue de `feat/sprint-13.3-firebase-dev-isolation`.

## Cadre

- `mictchealla-store` reste la production de C.L.A.G.
- Développement et tests uniquement sur les émulateurs `demo-clag`.
- `clag-marketplace-dev` reste sans facturation. Le backend `clag-dev` ne reçoit aucune écriture.
- Aucune fusion dans `main`, aucun déploiement en production sans autorisation explicite.
- Changements additifs seulement : aucun champ supprimé ou renommé, aucune migration destructive.

## Constats dans le code actuel

| Constat                                                                                              | Conséquence                                                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Toutes les lectures et écritures passent par l'Admin SDK, qui ignore les règles Firestore            | L'isolation entre vendeurs doit être appliquée dans les services serveur. Les règles restent une seconde barrière.                    |
| Les services (`getOrder`, `updateProduct`, etc.) ne sont filtrés ni par propriétaire ni par boutique | Les Server Actions admin ne doivent jamais être réutilisées telles quelles par un vendeur.                                            |
| `setUserRole` écrase toutes les custom claims                                                        | Un `sellerId` en claim serait effacé à chaque changement de rôle. Le rattachement vendeur ne doit pas reposer sur les claims.         |
| `ROLES` est une hiérarchie linéaire `customer` à `superAdmin`                                        | Un vendeur n'y a pas sa place : ce n'est pas un niveau de personnel. Placé au-dessus de `customer`, il hériterait d'accès non voulus. |
| `users/{uid}` est modifiable par son propriétaire, sauf `role`                                       | Aucune donnée de confiance vendeur ne doit y être stockée.                                                                            |
| `OrderItem`, `CartItem`, `InventoryDocument` et `Product` n'ont pas de vendeur                       | Ajouts nécessaires, avec une valeur par défaut pour l'existant.                                                                       |
| `refundOrder` rembourse la commande entière et remet tout le stock                                   | Le remboursement partiel par vendeur doit être créé.                                                                                  |
| Une commande a un seul statut et un seul suivi de livraison                                          | Il faut une couche de sous-commandes par vendeur.                                                                                     |
| `coupons` et `settings/shipping` sont globaux                                                        | Maintenus au niveau de la plateforme en V1.                                                                                           |
| Stripe : clé placeholder, encaissement simple sans Connect                                           | Aucun reversement vendeur n'existe. Stripe ne peut pas encaisser aujourd'hui.                                                         |
| `storage.rules` refuse tout accès client                                                             | Les envois restent côté serveur, avec un contrôle du chemin par boutique.                                                             |

## Modèle de données

Nouvelles collections :

| Collection                           | Rôle                                                                                          | Lecture client          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------- |
| `sellers/{sellerId}`                 | Boutique publique : nom, slug, logo, description, statut, `commissionBps`                     | Si `status == "active"` |
| `sellers/{sellerId}/private/profile` | Contact, identité légale, coordonnées de reversement                                          | Aucune                  |
| `sellerMembers/{sellerId}_{uid}`     | Rattachement utilisateur-boutique (`owner`, `manager` ou `staff`), source de vérité des accès | Aucune                  |
| `sellerApplications/{id}`            | Candidatures et décision                                                                      | Aucune                  |
| `sellerOrders/{orderId}_{sellerId}`  | Part vendeur d'une commande : lignes, statut, suivi, montants                                 | Aucune                  |
| `sellerLedger/{id}`                  | Journal comptable immuable : vente, commission, remboursement, reversement                    | Aucune                  |
| `payouts/{id}`                       | Reversements et preuves                                                                       | Aucune                  |

Champs ajoutés, tous optionnels :

- `Product` : `sellerId`, `sellerName`, `moderation` (`pending`, `approved`, `rejected`) et `moderationNote`.
- `OrderItem` : `sellerId`, `sellerName`, `commissionBpsSnapshot`.
- `CartItem` et `InventoryDocument` : `sellerId`.
- `CouponDocument` : `sellerId`, `null` en V1.

La boutique maison `HOUSE_SELLER_ID` représente C.L.A.G. Un document sans `sellerId` lui est
rattaché à la lecture, sans réécriture : les 94 produits et les 6 commandes restent intacts.
`status: "published"` n'est pas modifié ; un produit vendeur est publié seulement après
approbation.

## Contrôle d'accès

- Le vendeur est une **relation**, pas un rôle : un compte reste `customer` et devient membre
  d'une boutique. `ROLES` et les claims ne changent pas.
- Une seule porte d'entrée : `requireSellerAccess(sellerId, role?)` dans `lib/seller-session.server.ts`.
  Elle lit `sellerMembers` à chaque action et refuse si la boutique n'est pas active.
- Services dédiés dans `services/firestore/seller/*`, qui reçoivent toujours le `sellerId`
  provenant de la session, jamais du client.
- Écritures contrôlées par une liste de champs : prix, stock, description. Jamais `moderation`,
  `status: "published"`, `sellerId` ni la commission.
- `/seller` ajouté à `PROTECTED_ROUTES` dans `proxy.ts`, avec contrôle autoritaire dans chaque page.
- Nouvelles permissions admin `sellers` et `payouts`, attribuées à `admin` puis à `manager` si
  vous le souhaitez.

## Seller Center

Routes `app/seller/*` : tableau de bord, produits, stock, commandes, retours, finances, boutique.
La navigation mobile et le rail marketplace sont masqués comme pour `/admin`.

| À réutiliser                                                     | Adaptation                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `product-form`, `products-table`, `import-products-dialog`       | Masquer `costMinor`, marque globale et réglages admin, via une prop de contexte |
| `orders-table`, `order-status-control`, `order-timeline`         | Brancher sur `sellerOrders`, statuts limités                                    |
| `inventory-table`, `adjust-inventory-dialog`                     | Filtrer par `sellerId` ; `stockMovements` reste le journal                      |
| `return-status-control`, `returns-table`                         | Limités aux lignes du vendeur                                                   |
| `stat-tile`, graphiques analytics                                | Agrégats par boutique                                                           |
| `media-uploader`, `services/storage`                             | Chemin `sellers/{sellerId}/`                                                    |
| `AdminSidebar`, `adminNav`, `dispatch`, `logActivity`            | `sellerNav`, nouveaux événements, `sellerId` dans le contexte                   |
| `SellerCard`, `FeaturedStores`, `sellerName` de la carte produit | Remplacer les démos par les vraies boutiques                                    |

Non partagés avec les vendeurs : fournisseurs, arrivages, catégories, bannières, menus, clients.

## Commandes et argent

**À la création :** `createOrderFromCart` reste le point d'entrée et ajoute `sellerId` sur chaque
ligne. Une commande reste payée en une fois.

**À la confirmation du paiement :** `confirmOrderPayment` crée de façon idempotente les
`sellerOrders` et les écritures `sellerLedger`. Le webhook peut être rejoué sans doublon.

**Statut parent :** dérivé des sous-commandes. Les commandes sans sous-commande gardent le
comportement actuel.

**Calcul :** montants entiers en unités mineures. La remise est répartie au prorata, et les
arrondis restants sur la dernière ligne. Le total des parts doit égaler le total de la commande,
ce qui sera testé. Commission en points de base, figée à la commande.

**Remboursement :** `refundOrderLines` est ajouté, avec remise en stock partielle et écriture de
contrepassation. `refundOrder` reste inchangé pour l'admin.

**Reversements :** solde libéré après un délai de retour, puis reversement manuel enregistré par
un admin. Aucun virement automatique en V1.

## Phases

Chaque phase a sa branche, ses tests sur émulateurs et votre validation avant la suivante.

| Phase | Branche                  | Contenu                                                                             | Écran visible     |
| ----- | ------------------------ | ----------------------------------------------------------------------------------- | ----------------- |
| 1     | `feat/seller-foundation` | Types, schémas, règles, `requireSellerAccess`, boutique maison, seed multi-vendeurs | Non               |
| 2     | `feat/seller-onboarding` | Candidature, module admin Vendeurs, approbation                                     | Admin, formulaire |
| 3     | `feat/seller-catalog`    | Seller Center : produits, images, stock, modération                                 | Seller Center     |
| 4     | `feat/seller-orders`     | Lignes vendeur, `sellerOrders`, expédition, retours                                 | Seller Center     |
| 5     | `feat/seller-finance`    | Grand livre, commissions, remboursement partiel, reversements manuels               | Finances          |
| 6     | `feat/seller-storefront` | Pages `/boutiques`, nom du vendeur, retrait des démos                               | Site public       |

## Tests obligatoires

- Tests négatifs à chaque phase : un vendeur A tente de lire et de modifier les données de B.
- Injection de `sellerId`, `moderation` ou `commissionBps` dans une requête vendeur : refusée.
- Règles Firestore testées sur émulateur avec `@firebase/rules-unit-testing`, à ajouter en dépendance de développement.
- Non-régression : commande mono-vendeur, commande sans `sellerId`, parcours admin existants.
- Commande à plusieurs vendeurs avec coupon : somme des parts égale au total, à l'unité mineure près.
- Rejeu du webhook sans doublon comptable.

## Mise en production future

Rien ci-dessous ne sera fait sans autorisation explicite :

1. Sauvegarde de la base de production, aujourd'hui inexistante.
2. Déploiement des nouveaux index, puis des règles.
3. Déploiement de l'application avec le Seller Center désactivé par un indicateur.
4. Création de la boutique maison, seule écriture additive.
5. Ouverture à des vendeurs pilotes.

## Décisions attendues

| Sujet                         | Recommandation                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Qui encaisse                  | C.L.A.G comme vendeur de référence en V1, à valider avec un conseil juridique et fiscal                                |
| Moyens de paiement            | À trancher : la clé Stripe est un placeholder, et Haïti n'a pas pu être confirmé pour Stripe Connect ou Global Payouts |
| Devise                        | Une seule en V1. Les produits sont en HTG alors que `settings/store` indique USD                                       |
| Commission                    | Taux unique par défaut, modifiable par boutique                                                                        |
| Modération                    | Approbation de chaque nouveau produit                                                                                  |
| Livraison                     | Frais C.L.A.G uniques en V1, sans frais par vendeur                                                                    |
| Coupons                       | Plateforme uniquement en V1, financés par C.L.A.G                                                                      |
| Délai de libération des fonds | Délai de retour plus une marge                                                                                         |
| Reversements                  | Manuels : MonCash ou virement                                                                                          |
| Avis et clients               | Le vendeur ne voit que le nécessaire à l'expédition                                                                    |
