# Architecture Firestore — Mitchaella Store

> Statut : **proposition technique, en attente de validation Product Owner.**
> Aucune collection n'est créée à partir de ce document et aucune règle
> Firestore définitive n'est écrite — voir `docs/technical-recommendations.md`
> pour la liste des points à trancher avant implémentation.

## 0. Journal des modifications

**Révision 4** (Sprint 2B — Inventory & Supply Chain Management) :

- **Résolution de l'incohérence de nommage signalée en révision 2** (§8,
  point 7, sans réponse PO à ce jour) : `incoming_shipments` →
  `incomingShipments`, `audit_logs` → `auditLogs`. Aucune des deux
  collections n'a de document réel en base à ce stade (la première est
  implémentée pour la première fois ce sprint, la seconde ne l'est toujours
  pas) — renommage sans coût de migration. Décision prise par défaut vers
  la convention `camelCase` déjà universelle partout ailleurs, en l'absence
  de préférence PO explicite ; reste modifiable sans risque tant qu'aucune
  donnée n'existe sous l'ancien nom.
- `inventory` : ajout de `quantityInTransit` et `quantityDamaged` (la
  brief Sprint 2B distingue 4 quantités traçées séparément, pas seulement 2) ; `warehouseLocation` passe de `string | null` à `string` (résolution
  de la décision PO §8 point 8 : un entrepôt unique par défaut
  `"main"`, multi-entrepôt réel différé — voir note §2.9) ; clarification
  du cas des produits simples sans variante (`variantId = "default"`, voir
  §2.9).
- `suppliers` : ajout de `company`, `country`, `currency`,
  `paymentTerms`, `averageLeadTimeDays`.
- `incomingShipments` : statut étendu de 4 à 8 valeurs (`planned`,
  `preparing`, `shipped`, `inTransit`, `arrived`, `partiallyReceived`,
  `received`, `cancelled`) ; ajout de `reference`, `trackingNumber`,
  `carrier`.
- **Nouvelle collection** `stockMovements` (§2.19) : registre append-only
  de tout mouvement de stock (ajustement, réservation, libération, entrée,
  sortie, réception d'arrivage) — aucune suppression/modification possible
  après création, même règle que `auditLogs`.
- Nouvelles règles métier documentées en §5.2 : stock disponible =
  physique − réservé ; une réservation ne peut jamais rendre le
  disponible négatif ; réception d'arrivage = mise à jour atomique de
  l'inventaire ; ajustement manuel toujours justifié (`reason` requis) ;
  toute écriture qui touche plusieurs quantités passe par une transaction
  Firestore (`runTransaction`), jamais par des écritures séparées.
- Nouveaux index composites (§6) pour le tableau de bord Stock et le
  registre des mouvements.
- **Centre d'alertes intelligentes** (nouvelle demande PO, intégrée ce
  sprint) : documenté en §11. Deux des cinq types d'alerte demandés
  reposent sur des données qui n'existent pas encore dans ce projet
  (compteur de précommandes par produit, signal de demande réelle) —
  voir §11 pour le détail de ce qui est réellement calculé vs. différé.

**Révision 3** (Sprint 2A — Product Management System) :

- `products` : ajout de `shortDescription`, `sku` (SKU produit, distinct des SKU
  de variantes), `brand`, `salePriceMinor` (prix promotionnel), `collectionIds`
  (dénormalisation many-to-many avec `collections.productIds`), `isComingSoon`,
  `availableFrom`, `preorderMessage`, `seo` (`title`/`description`/`keywords`),
  `nameLower` (recherche).
- `categories` : ajout de `description` (absente par erreur en révision 1),
  `icon`, `seo`, `nameLower`.
- `collections` : `imageUrl` renommé `coverImageUrl` ; ajout de
  `bannerImageUrl`, `primaryColor`, `startAt`, `endAt`, `nameLower` ;
  remplacement de `isActive: boolean` par `status: 'draft' | 'active' | 'archived'`
  pour permettre un archivage réversible cohérent avec `products.status`.
- Nouvelle convention : champ `nameLower` dénormalisé sur `products`,
  `categories` et `collections` pour la recherche préfixe côté Firestore
  (voir §4 et §9).
- **Suppression physique interdite** sur `products` et `collections` :
  l'état `archived` fait office de suppression logique, toujours réversible
  via `restore`. Précisé en §5.
- Nouveaux index composites (§6) pour la recherche, le tri et le filtrage
  du tableau de bord Produits.

**Révision 2** (intègre les décisions d'architecture suivantes) :

- Ajout de 10 collections : `inventory`, `suppliers`, `incoming_shipments`,
  `collections` (regroupements marchands), `promotions`, `coupons`,
  `banners`, `homepage`, `analytics`, `audit_logs`.
- Remplacement de `settings/general` (document unique) par sept documents
  dédiés : `settings/store`, `settings/payment`, `settings/shipping`,
  `settings/seo`, `settings/email`, `settings/notifications`,
  `settings/security`.
- `products.variants[].stock` devient une copie dénormalisée en lecture
  seule ; la source de vérité du stock est désormais `inventory` (§2.9).
- Ajout de `orders.appliedCouponCode` et `orders.appliedPromotionIds` pour
  tracer les remises appliquées à une commande.
- Nouveaux index composites, nouvelles entrées dans le tableau de règles de
  sécurité, et nouveaux points de décision PO (§8) liés à ces ajouts.
- **Toujours aucune collection ni règle Firestore définitive créée** — cette
  révision reste un document de travail soumis à validation.

## 1. Vue d'ensemble des collections

| Collection          | Portée                                                            | Clé de document                           |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `users`             | Profil des comptes (clients, staff, admin)                        | `uid` (Firebase Auth UID)                 |
| `categories`        | Taxonomie de navigation du catalogue                              | ID auto                                   |
| `products`          | Produits du catalogue                                             | ID auto (ou slug, voir §6)                |
| `carts`             | Panier courant, un par utilisateur                                | `uid`                                     |
| `orders`            | Commandes (standard **et** pré-commandes)                         | ID auto                                   |
| `wishlists`         | Liste de souhaits (racine par utilisateur)                        | `uid`                                     |
| `notifications`     | Notifications reçues par un utilisateur (racine par utilisateur)  | `uid`                                     |
| `settings`          | Configuration de la boutique, un document par domaine (voir §2.8) | slug du domaine (`store`, `payment`, ...) |
| `inventory`         | Stock par variante produit (source de vérité)                     | `{productId}_{variantId}`                 |
| `suppliers`         | Fournisseurs / fabricants                                         | ID auto                                   |
| `incomingShipments` | Réceptions de marchandise attendues/reçues                        | ID auto                                   |
| `stockMovements`    | Registre append-only de tout mouvement de stock                   | ID auto                                   |
| `collections`       | Regroupements marchands de produits (éditorial/marketing)         | ID auto                                   |
| `promotions`        | Remises automatiques (sans code)                                  | ID auto                                   |
| `coupons`           | Codes promo saisis par le client                                  | code normalisé (voir §2.14)               |
| `banners`           | Bannières promotionnelles/visuelles                               | ID auto                                   |
| `homepage`          | Sections composant la page d'accueil                              | ID auto                                   |
| `analytics`         | Agrégats de mesure (rollups périodiques)                          | `{period}_{date}` (voir §2.17)            |
| `auditLogs`         | Journal d'audit des actions sensibles                             | ID auto                                   |

> **Note de vocabulaire** : la collection `collections` désigne un
> regroupement **marchand/éditorial** de produits (ex. « Nouveautés »,
> « Édition Été 2026 »), au sens où Shopify utilise "Collections" — à ne pas
> confondre avec le terme technique _collection_ de Firestore. Elle est
> complémentaire à `categories` : une catégorie est une taxonomie
> structurelle (un produit appartient à **une** catégorie, utilisée pour la
> navigation principale) ; une collection est un regroupement éditorial (un
> produit peut appartenir à **plusieurs** collections, utilisées pour la mise
> en avant marketing).
>
> **Note de vocabulaire** : `settings/notifications` (configuration des
> canaux de notification de la boutique) et la collection racine
> `notifications` (messages reçus par chaque utilisateur) sont deux choses
> différentes — voir §2.8 et §2.7.

Sous-collections :

| Sous-collection                         | Parent          | Contenu                                                |
| --------------------------------------- | --------------- | ------------------------------------------------------ |
| `users/{uid}/addresses/{addressId}`     | `users`         | Carnet d'adresses de livraison                         |
| `orders/{orderId}/payments/{paymentId}` | `orders`        | Transactions de paiement (dépôt, solde, remboursement) |
| `wishlists/{uid}/items/{productId}`     | `wishlists`     | Un item de wishlist par produit                        |
| `notifications/{uid}/items/{notifId}`   | `notifications` | Une notification                                       |

Aucune nouvelle sous-collection n'est introduite dans cette révision : les
dix nouvelles collections listées ci-dessus sont toutes des collections
racine (justification au cas par cas en §7).

## 2. Modèle de données détaillé

### 2.1 `users/{uid}`

| Champ              | Type                               | Description                                                                                        |
| ------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `uid`              | `string`                           | Dupliqué depuis l'ID de doc pour faciliter les requêtes de groupe (`collectionGroup`) et l'export. |
| `email`            | `string`                           | Depuis Firebase Auth.                                                                              |
| `displayName`      | `string`                           |                                                                                                    |
| `phone`            | `string \| null`                   | Format E.164.                                                                                      |
| `photoURL`         | `string \| null`                   |                                                                                                    |
| `role`             | `'customer' \| 'staff' \| 'admin'` | Défaut `'customer'`. Modifiable uniquement côté serveur (voir §5).                                 |
| `locale`           | `string`                           | Ex. `"fr-HT"`.                                                                                     |
| `defaultAddressId` | `string \| null`                   | Référence vers `addresses/{addressId}`.                                                            |
| `marketingOptIn`   | `boolean`                          | Défaut `false`.                                                                                    |
| `createdAt`        | `Timestamp`                        |                                                                                                    |
| `updatedAt`        | `Timestamp`                        |                                                                                                    |

**Sous-collection `addresses/{addressId}`**

| Champ             | Type             |
| ----------------- | ---------------- |
| `label`           | `string`         | Ex. "Maison", "Bureau".  |
| `recipientName`   | `string`         |
| `phone`           | `string`         |
| `line1` / `line2` | `string`         |
| `city` / `region` | `string`         |
| `postalCode`      | `string \| null` |
| `country`         | `string`         | Code ISO 3166-1 alpha-2. |
| `isDefault`       | `boolean`        |

### 2.2 `categories/{categoryId}`

| Champ                     | Type                                     | Description                                                                                                                |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `name`                    | `string`                                 |                                                                                                                            |
| `nameLower`               | `string`                                 | **Ajout révision 3.** `name.toLowerCase()`, dénormalisé pour la recherche préfixe (voir §9).                               |
| `slug`                    | `string`                                 | Unique, utilisé dans les URLs.                                                                                             |
| `description`             | `string`                                 | **Ajout révision 3** (absente par erreur en révision 1).                                                                   |
| `icon`                    | `string \| null`                         | **Ajout révision 3.** Nom d'icône (ex. `"shirt"`, clé Lucide) pour affichage dans les menus/nav sans dépendre d'une image. |
| `parentId`                | `string \| null`                         | Support d'une hiérarchie à 2 niveaux max (voir §8, décision PO).                                                           |
| `imageUrl`                | `string \| null`                         |                                                                                                                            |
| `position`                | `number`                                 | Ordre d'affichage.                                                                                                         |
| `isActive`                | `boolean`                                |                                                                                                                            |
| `seo`                     | `{ title: string; description: string }` | **Ajout révision 3.**                                                                                                      |
| `createdAt` / `updatedAt` | `Timestamp`                              | **Ajout révision 3.**                                                                                                      |

### 2.3 `products/{productId}`

| Champ                     | Type                                                         | Description                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                    | `string`                                                     |                                                                                                                                                                                                                                                                    |
| `nameLower`               | `string`                                                     | **Ajout révision 3.** `name.toLowerCase()`, dénormalisé pour la recherche préfixe (voir §9).                                                                                                                                                                       |
| `slug`                    | `string`                                                     | Unique, généré automatiquement depuis `name` (voir §4).                                                                                                                                                                                                            |
| `shortDescription`        | `string`                                                     | **Ajout révision 3.** Résumé court pour les cartes produit / listes.                                                                                                                                                                                               |
| `description`             | `string`                                                     | Description complète (fiche produit).                                                                                                                                                                                                                              |
| `sku`                     | `string`                                                     | **Ajout révision 3.** SKU produit (parent), distinct des `sku` de chaque variante — requis même si le produit n'a qu'une variante par défaut.                                                                                                                      |
| `brand`                   | `string \| null`                                             | **Ajout révision 3.**                                                                                                                                                                                                                                              |
| `categoryId`              | `string`                                                     | Référence `categories/{categoryId}`.                                                                                                                                                                                                                               |
| `collectionIds`           | `string[]`                                                   | **Ajout révision 3.** Dénormalisation de l'appartenance à `collections/{id}`. La source de vérité reste `collections.productIds` ; ce tableau est maintenu en synchronisation par `services/firestore/products.ts` / `collections.ts` (écriture groupée, voir §9). |
| `images`                  | `Array<{ url: string; alt: string; position: number }>`      | La première image (`position: 0`) sert d'image principale.                                                                                                                                                                                                         |
| `basePriceMinor`          | `number` (entier)                                            | Prix normal, en unité mineure de devise (centimes) pour éviter les erreurs flottantes.                                                                                                                                                                             |
| `salePriceMinor`          | `number \| null`                                             | **Ajout révision 3.** Prix promotionnel ; doit être `< basePriceMinor` si défini (validé par Zod, pas par Firestore).                                                                                                                                              |
| `currency`                | `string`                                                     | Code ISO 4217 (ex. `"USD"`, `"HTG"`) — voir décision PO §8.                                                                                                                                                                                                        |
| `variants`                | `Array<ProductVariant>`                                      | Voir sous-type ci-dessous.                                                                                                                                                                                                                                         |
| `tags`                    | `string[]`                                                   | Pour recherche/filtrage facultatif.                                                                                                                                                                                                                                |
| `status`                  | `'draft' \| 'published' \| 'archived'`                       | Seuls les produits `published` sont lisibles publiquement. Machine à états en §5 — `archived` est la **seule** forme de suppression, toujours réversible (`restore`), aucune suppression physique.                                                                 |
| `isComingSoon`            | `boolean`                                                    | **Ajout révision 3.** Produit annoncé mais pas encore en vente (distinct de la pré-commande).                                                                                                                                                                      |
| `isPreorderable`          | `boolean`                                                    |                                                                                                                                                                                                                                                                    |
| `preorderWindow`          | `{ startAt: Timestamp; endAt: Timestamp } \| null`           | Rempli si une campagne de précommande à fenêtre fermée est nécessaire (non exposé dans le formulaire Sprint 2A — voir note ci-dessous).                                                                                                                            |
| `preorderMessage`         | `string \| null`                                             | **Ajout révision 3.** Message libre affiché au client sur une fiche en précommande (ex. "Expédition prévue mi-août").                                                                                                                                              |
| `availableFrom`           | `Timestamp \| null`                                          | **Ajout révision 3.** Date de mise en vente/disponibilité prévue — sert à la fois pour "Produit à venir" (`isComingSoon`) et comme "date estimée" affichée pour une précommande (`isPreorderable`), pour éviter un champ dupliqué.                                 |
| `seo`                     | `{ title: string; description: string; keywords: string[] }` | **Ajout révision 3.** `keywords` : mots-clés libres saisis par le staff, sans effet garanti sur le référencement (la plupart des moteurs l'ignorent aujourd'hui) — conservé à titre interne/historique, comme demandé par le formulaire produit.                   |
| `ratingAverage`           | `number`                                                     | Dénormalisé, mis à jour par Cloud Function (si avis activés plus tard).                                                                                                                                                                                            |
| `ratingCount`             | `number`                                                     |                                                                                                                                                                                                                                                                    |
| `createdAt` / `updatedAt` | `Timestamp`                                                  |                                                                                                                                                                                                                                                                    |
| `createdBy`               | `string`                                                     | `uid` staff/admin.                                                                                                                                                                                                                                                 |

> **Note (formulaire Sprint 2A)** : le formulaire d'édition produit expose
> uniquement `isPreorderable` (case "Activée"), `availableFrom` (libellé
> "Date estimée") et `preorderMessage` (libellé "Message client") pour la
> section Précommande — plus simple que la fenêtre `preorderWindow`
> complète, qui reste dans le modèle de données pour une campagne à date de
> fin stricte future (non gérée par ce formulaire ; toujours écrite comme
> `null` à la création et jamais modifiée par la mise à jour standard).

`ProductVariant` (objet embarqué, pas de sous-collection — voir §7) :

| Champ        | Type             | Description                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`         | Identifiant stable (ex. `"S-black"`).                                                                                                                                                                                                                                                                                                                                                                         |
| `sku`        | `string`         |                                                                                                                                                                                                                                                                                                                                                                                                               |
| `size`       | `string \| null` |                                                                                                                                                                                                                                                                                                                                                                                                               |
| `color`      | `string \| null` |                                                                                                                                                                                                                                                                                                                                                                                                               |
| `priceMinor` | `number \| null` | Surcharge de `basePriceMinor` si différent.                                                                                                                                                                                                                                                                                                                                                                   |
| `stock`      | `number`         | **Copie dénormalisée** de `inventory.{productId}_{variantId}.quantityAvailable`. **Précision révision 4** : maintenue par `services/firestore/inventory.ts` dans la même transaction que chaque mouvement de stock (pas par une Cloud Function asynchrone — évite une fenêtre où `products.variants[].stock` serait momentanément désynchronisé). La source de vérité reste la collection `inventory` (§2.9). |
| `isDefault`  | `boolean`        |                                                                                                                                                                                                                                                                                                                                                                                                               |

### 2.4 `carts/{uid}`

| Champ       | Type              | Description     |
| ----------- | ----------------- | --------------- |
| `items`     | `Array<CartItem>` | Voir sous-type. |
| `updatedAt` | `Timestamp`       |                 |

`CartItem` :

| Champ                    | Type        |
| ------------------------ | ----------- |
| `productId`              | `string`    |
| `variantId`              | `string`    |
| `quantity`               | `number`    |
| `unitPriceMinorSnapshot` | `number`    | Prix au moment de l'ajout, réconcilié à l'affichage si le prix produit a changé. |
| `addedAt`                | `Timestamp` |

### 2.5 `orders/{orderId}`

Couvre **à la fois** les commandes standard et les pré-commandes via le champ
`type` (voir §8 pour la décision d'unifier vs séparer en deux collections).

| Champ                     | Type                                                                                                                                                                | Description                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orderNumber`             | `string`                                                                                                                                                            | Identifiant lisible (ex. `MS-2026-000123`), généré via compteur transactionnel — voir §9.                                                                                  |
| `userId`                  | `string`                                                                                                                                                            | Référence `users/{uid}`.                                                                                                                                                   |
| `type`                    | `'standard' \| 'preorder'`                                                                                                                                          |                                                                                                                                                                            |
| `status`                  | `'pending' \| 'confirmed' \| 'processing' \| 'ready' \| 'shipped' \| 'delivered' \| 'cancelled' \| 'refunded'`                                                      | Machine à états, transitions validées côté serveur uniquement.                                                                                                             |
| `items`                   | `Array<OrderItem>`                                                                                                                                                  | Snapshot immuable au moment de la commande (nom, image, prix) — ne dépend plus du doc `products` après création.                                                           |
| `subtotalMinor`           | `number`                                                                                                                                                            |                                                                                                                                                                            |
| `shippingFeeMinor`        | `number`                                                                                                                                                            |                                                                                                                                                                            |
| `discountMinor`           | `number`                                                                                                                                                            | Cumul des réductions issues d'un coupon (`appliedCouponCode`) et/ou de promotions automatiques (`appliedPromotionIds`).                                                    |
| `appliedCouponCode`       | `string \| null`                                                                                                                                                    | **Ajout révision 2.** Référence `coupons/{code}` si un coupon a été appliqué.                                                                                              |
| `appliedPromotionIds`     | `string[]`                                                                                                                                                          | **Ajout révision 2.** Référence `promotions/{promotionId}` pour chaque promotion automatique appliquée. Détail de la remise par article non modélisé à ce stade (voir §8). |
| `totalMinor`              | `number`                                                                                                                                                            |                                                                                                                                                                            |
| `currency`                | `string`                                                                                                                                                            |                                                                                                                                                                            |
| `statusHistory`           | `Array<{ status: string; at: Timestamp; by: string; note?: string }>`                                                                                               | Journal d'audit embarqué (peu d'entrées, pas besoin de sous-collection).                                                                                                   |
| `delivery`                | `{ method: 'pickup' \| 'delivery'; addressSnapshot: Address \| null; trackingNumber: string \| null; estimatedAt: Timestamp \| null; status: string }`              | Adresse dénormalisée au moment de la commande.                                                                                                                             |
| `preorder`                | `{ depositMinor: number; depositPaidAt: Timestamp \| null; balanceDueMinor: number; balanceDueAt: Timestamp \| null; estimatedReadyAt: Timestamp \| null } \| null` | Rempli uniquement si `type === 'preorder'`.                                                                                                                                |
| `notes`                   | `string \| null`                                                                                                                                                    |                                                                                                                                                                            |
| `createdAt` / `updatedAt` | `Timestamp`                                                                                                                                                         |                                                                                                                                                                            |

`OrderItem` :

| Champ            | Type     |
| ---------------- | -------- |
| `productId`      | `string` |
| `variantId`      | `string` |
| `nameSnapshot`   | `string` |
| `imageSnapshot`  | `string` |
| `unitPriceMinor` | `number` |
| `quantity`       | `number` |
| `lineTotalMinor` | `number` |

**Sous-collection `payments/{paymentId}`**

| Champ         | Type                                           | Description                                       |
| ------------- | ---------------------------------------------- | ------------------------------------------------- |
| `type`        | `'deposit' \| 'balance' \| 'full' \| 'refund'` |                                                   |
| `provider`    | `string`                                       | Ex. `"moncash"`, `"stripe"` — dépend du choix PO. |
| `method`      | `string`                                       |                                                   |
| `amountMinor` | `number`                                       |                                                   |
| `currency`    | `string`                                       |                                                   |
| `status`      | `'pending' \| 'succeeded' \| 'failed'`         |                                                   |
| `providerRef` | `string \| null`                               | ID de transaction externe.                        |
| `createdAt`   | `Timestamp`                                    |                                                   |

### 2.6 `wishlists/{uid}/items/{productId}`

| Champ       | Type             |
| ----------- | ---------------- |
| `variantId` | `string \| null` |
| `addedAt`   | `Timestamp`      |

### 2.7 `notifications/{uid}/items/{notificationId}`

| Champ       | Type                     |
| ----------- | ------------------------ |
| `type`      | `string`                 | Ex. `"order_status_changed"`, `"preorder_ready"`.             |
| `title`     | `string`                 |
| `body`      | `string`                 |
| `data`      | `Record<string, string>` | Payload libre (ex. `{ orderId }`) pour la navigation au clic. |
| `read`      | `boolean`                |
| `createdAt` | `Timestamp`              |

### 2.8 `settings/{domain}` — **remplace `settings/general`**

Sept documents singletons, un par domaine de configuration, au lieu d'un
document unique `general`. Objectif : limiter la portée de lecture (le
storefront public n'a besoin que de `store`/`shipping`/`seo`, pas de
`payment`/`email`/`security`) et éviter qu'une modification mineure d'un
domaine ne déclenche une invalidation de cache sur tous les autres.

**`settings/store`**

| Champ                 | Type                     |
| --------------------- | ------------------------ |
| `storeName`           | `string`                 |
| `legalName`           | `string \| null`         |
| `currency`            | `string`                 | Devise principale, ISO 4217.                                   |
| `supportedCurrencies` | `string[]`               | Vide/1 élément tant que le multi-devise n'est pas validé (§8). |
| `contactEmail`        | `string`                 |
| `contactPhone`        | `string`                 |
| `address`             | `Address`                | Même forme que `users/addresses`.                              |
| `socialLinks`         | `Record<string, string>` | Ex. `{ instagram: "https://..." }`.                            |
| `maintenanceMode`     | `boolean`                |
| `updatedAt`           | `Timestamp`              |

**`settings/payment`**

| Champ                       | Type             | Description                                                |
| --------------------------- | ---------------- | ---------------------------------------------------------- |
| `enabledProviders`          | `string[]`       | Ex. `["moncash", "manual"]` — dépend de la décision PO §8. |
| `defaultProvider`           | `string`         |                                                            |
| `manualPaymentInstructions` | `string \| null` | Instructions affichées pour virement/dépôt manuel.         |
| `preorderDepositPercentage` | `number`         |                                                            |
| `updatedAt`                 | `Timestamp`      |                                                            |

> **Important** : ce document ne contient **aucun secret** (pas de clé API,
> pas de token). Les identifiants de connexion aux fournisseurs de paiement
> restent en variables d'environnement / secret manager, jamais en
> Firestore — cohérent avec `.env.example`.

**`settings/shipping`**

| Champ                        | Type                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `feesByRegionMinor`          | `Record<string, number>`                                |
| `freeShippingThresholdMinor` | `number \| null`                                        |
| `pickupLocations`            | `Array<{ id: string; name: string; address: Address }>` |
| `deliveryMethods`            | `string[]`                                              | Ex. `["pickup", "delivery"]`. |
| `updatedAt`                  | `Timestamp`                                             |

**`settings/seo`**

| Champ                | Type             |
| -------------------- | ---------------- |
| `defaultTitle`       | `string`         |
| `defaultDescription` | `string`         |
| `defaultOgImageUrl`  | `string \| null` |
| `robotsIndexable`    | `boolean`        |
| `updatedAt`          | `Timestamp`      |

**`settings/email`**

| Champ         | Type                                                    | Description                                                                                                               |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `senderName`  | `string`                                                |                                                                                                                           |
| `senderEmail` | `string`                                                |                                                                                                                           |
| `templates`   | `Record<string, { subject: string; enabled: boolean }>` | Config par template (ex. `orderConfirmation`, `preorderReady`) — le contenu HTML/les identifiants SMTP ne vivent pas ici. |
| `updatedAt`   | `Timestamp`                                             |                                                                                                                           |

**`settings/notifications`**

Configuration des **canaux** de notification de la boutique (à ne pas
confondre avec la collection `notifications`, qui contient les messages
effectivement envoyés à chaque utilisateur — voir §2.7).

| Champ                      | Type                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `channelsEnabled`          | `{ email: boolean; sms: boolean; whatsapp: boolean; push: boolean }` |
| `adminAlertEmails`         | `string[]`                                                           | Destinataires internes (nouvelle commande, stock bas, etc.).                |
| `lowStockThresholdDefault` | `number`                                                             | Utilisé si `inventory.reorderThreshold` n'est pas défini pour une variante. |
| `updatedAt`                | `Timestamp`                                                          |

**`settings/security`**

| Champ                   | Type               |
| ----------------------- | ------------------ |
| `allowedAdminIpRanges`  | `string[] \| null` | Optionnel — restriction d'accès à l'admin par IP. |
| `sessionTimeoutMinutes` | `number`           |
| `require2faForAdmin`    | `boolean`          |
| `updatedAt`             | `Timestamp`        |

### 2.9 `inventory/{productId}_{variantId}`

**Nouvelle collection — source de vérité du stock.** Séparée de `products`
pour ne pas réécrire tout le document produit à chaque mouvement de stock
(réception, vente, ajustement manuel), et pour permettre des écritures
concurrentes fréquentes sans contention sur le document produit.

| Champ               | Type                | Description                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productId`         | `string`            | Référence `products/{productId}`.                                                                                                                                                                                                                                                                                                                                                |
| `variantId`         | `string`            | Référence à `products.variants[].id`. **Précision révision 4** : un produit "simple" (`products.variants` vide, voir Sprint 2A) n'a par définition aucun `id` de variante — dans ce cas `variantId` vaut la constante `"default"` (`DEFAULT_VARIANT_ID`, `types/inventory.ts`), qui représente le produit lui-même comme sa propre variante implicite pour les besoins du stock. |
| `sku`               | `string`            | Dénormalisé depuis le variant pour lookup rapide.                                                                                                                                                                                                                                                                                                                                |
| `warehouseLocation` | `string`            | **Révision 4** : `string \| null` → `string`, résolution de la décision PO §8 point 8. Un seul entrepôt logique pour l'instant, valeur constante `"main"` — le champ reste une chaîne libre (pas de collection `warehouses` séparée) pour permettre un vrai multi-entrepôt plus tard sans migration de schéma, uniquement en introduisant d'autres valeurs.                      |
| `quantityOnHand`    | `number`            | Stock physique total présent en entrepôt (vendable).                                                                                                                                                                                                                                                                                                                             |
| `quantityReserved`  | `number`            | Réservé par des commandes/paniers non encore décomptés définitivement.                                                                                                                                                                                                                                                                                                           |
| `quantityInTransit` | `number`            | **Ajout révision 4.** Quantité commandée à un fournisseur (`incomingShipments`) mais pas encore réceptionnée — visibilité anticipée avant réception effective.                                                                                                                                                                                                                   |
| `quantityDamaged`   | `number`            | **Ajout révision 4.** Stock physiquement présent mais non vendable (avarié, retourné défectueux). Exclu de `quantityAvailable`.                                                                                                                                                                                                                                                  |
| `quantityAvailable` | `number`            | Dénormalisé = `quantityOnHand - quantityReserved` (règle métier §5.2) — recalculé à chaque écriture, dans la même transaction. Copié vers `products.variants[].stock`.                                                                                                                                                                                                           |
| `reorderThreshold`  | `number`            | Seuil déclenchant une alerte de réassort.                                                                                                                                                                                                                                                                                                                                        |
| `isLowStock`        | `boolean`           | Dénormalisé = `quantityAvailable <= reorderThreshold`, recalculé à chaque écriture (Firestore ne permet pas de comparer deux champs dans une requête — voir §6).                                                                                                                                                                                                                 |
| `lastRestockedAt`   | `Timestamp \| null` |                                                                                                                                                                                                                                                                                                                                                                                  |
| `updatedAt`         | `Timestamp`         |                                                                                                                                                                                                                                                                                                                                                                                  |

### 2.10 `suppliers/{supplierId}`

| Champ                     | Type              | Description                                                                                                                                                                   |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                    | `string`          | Nom commercial / d'usage du fournisseur.                                                                                                                                      |
| `company`                 | `string \| null`  | **Ajout révision 4.** Raison sociale légale, si différente de `name`.                                                                                                         |
| `contactName`             | `string \| null`  | Contact principal chez le fournisseur.                                                                                                                                        |
| `email`                   | `string \| null`  |                                                                                                                                                                               |
| `phone`                   | `string \| null`  |                                                                                                                                                                               |
| `country`                 | `string \| null`  | **Ajout révision 4.** Code ISO 3166-1 alpha-2, dupliqué de `address.country` pour filtrer/trier sans lire l'adresse complète.                                                 |
| `address`                 | `Address \| null` | Même forme que `users/addresses`.                                                                                                                                             |
| `currency`                | `string`          | **Ajout révision 4.** Devise de facturation du fournisseur (ISO 4217) — peut différer de la devise boutique.                                                                  |
| `paymentTerms`            | `string \| null`  | **Ajout révision 4.** Texte libre (ex. `"Net 30"`, `"50% dépôt, solde à la livraison"`) — trop variable d'un fournisseur à l'autre pour une énumération fermée.               |
| `averageLeadTimeDays`     | `number \| null`  | **Ajout révision 4.** Délai moyen observé/annoncé, en jours — sert à pré-remplir l'ETA d'un nouvel arrivage.                                                                  |
| `isActive`                | `boolean`         | Binaire (pas de statut à 3 états) : un fournisseur avec qui on ne travaille plus est désactivé, pas archivé — pas de fiche produit associée à faire disparaître/réapparaître. |
| `notes`                   | `string \| null`  |                                                                                                                                                                               |
| `createdAt` / `updatedAt` | `Timestamp`       |                                                                                                                                                                               |

Une fiche détaillée (`/admin/suppliers/{id}`) affiche ces champs plus la
liste de ses `incomingShipments` (via `supplierId`) — pas de dénormalisation
supplémentaire nécessaire, requête directe filtrée.

### 2.11 `incomingShipments/{shipmentId}`

**Renommé en révision 4** (était `incoming_shipments`, voir §0). Suit les
commandes passées auprès des fournisseurs, de la commande à la réception en
stock.

| Champ                     | Type                                                                                                                        | Description                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supplierId`              | `string`                                                                                                                    | Référence `suppliers/{supplierId}`.                                                                                                               |
| `reference`               | `string`                                                                                                                    | **Ajout révision 4.** Référence lisible (ex. `"PO-2026-0042"`), générée via compteur transactionnel — même pattern que `orders.orderNumber` (§9). |
| `status`                  | `'planned' \| 'preparing' \| 'shipped' \| 'inTransit' \| 'arrived' \| 'partiallyReceived' \| 'received' \| 'cancelled'`     | **Étendu révision 4** (était 4 valeurs) — voir machine à états §5.2.                                                                              |
| `trackingNumber`          | `string \| null`                                                                                                            | **Ajout révision 4.**                                                                                                                             |
| `carrier`                 | `string \| null`                                                                                                            | **Ajout révision 4.** Ex. `"DHL"`, `"UPS"`, `"Transporteur local"`.                                                                               |
| `items`                   | `Array<{ productId: string; variantId: string; quantityOrdered: number; quantityReceived: number; unitCostMinor: number }>` |                                                                                                                                                   |
| `currency`                | `string`                                                                                                                    |                                                                                                                                                   |
| `totalCostMinor`          | `number`                                                                                                                    |                                                                                                                                                   |
| `orderedAt`               | `Timestamp`                                                                                                                 |                                                                                                                                                   |
| `expectedAt`              | `Timestamp \| null`                                                                                                         | ETA. Comparé à `now()` pour détecter un retard — voir alertes §11.                                                                                |
| `receivedAt`              | `Timestamp \| null`                                                                                                         |                                                                                                                                                   |
| `notes`                   | `string \| null`                                                                                                            |                                                                                                                                                   |
| `createdBy`               | `string`                                                                                                                    | `uid` staff/admin.                                                                                                                                |
| `createdAt` / `updatedAt` | `Timestamp`                                                                                                                 |                                                                                                                                                   |

Quand `status` passe à `received` ou `partiallyReceived`, la Server Action
de réception incrémente `inventory.quantityOnHand` (et décrémente
`quantityInTransit`) pour chaque `item` effectivement reçu, dans une
transaction Firestore, et écrit un `stockMovements` de type
`shipmentReceived` par ligne — voir §5.2 et §9.

### 2.12 `collections/{collectionId}`

**Nouvelle collection** (regroupement marchand — voir note de vocabulaire §1).

| Champ                     | Type                                                                | Description                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                    | `string`                                                            |                                                                                                                                                                                |
| `nameLower`               | `string`                                                            | **Ajout révision 3.** `name.toLowerCase()`, dénormalisé pour la recherche préfixe (voir §9).                                                                                   |
| `slug`                    | `string`                                                            | Unique, utilisé dans les URLs.                                                                                                                                                 |
| `description`             | `string \| null`                                                    |                                                                                                                                                                                |
| `coverImageUrl`           | `string \| null`                                                    | **Renommé révision 3** (était `imageUrl`) — image de couverture (carte/liste).                                                                                                 |
| `bannerImageUrl`          | `string \| null`                                                    | **Ajout révision 3.** Bannière large (en-tête de la page collection).                                                                                                          |
| `primaryColor`            | `string \| null`                                                    | **Ajout révision 3.** Couleur hex (ex. `"#0f172a"`), utilisée pour thématiser la page de la collection.                                                                        |
| `type`                    | `'manual' \| 'automatic'`                                           |                                                                                                                                                                                |
| `productIds`              | `string[] \| null`                                                  | Rempli si `type === 'manual'`. Tableau embarqué — voir seuil de taille en §7.                                                                                                  |
| `rules`                   | `Array<{ field: string; operator: string; value: string }> \| null` | Rempli si `type === 'automatic'` (ex. `tags contains "summer"`). Moteur de règles à définir — voir décision PO §8.                                                             |
| `startAt`                 | `Timestamp \| null`                                                 | **Ajout révision 3.** Ex. début d'une campagne "Black Friday".                                                                                                                 |
| `endAt`                   | `Timestamp \| null`                                                 | **Ajout révision 3.**                                                                                                                                                          |
| `status`                  | `'draft' \| 'active' \| 'archived'`                                 | **Remplace `isActive: boolean` (révision 3)**, pour rester cohérent avec `products.status` : `archived` est réversible (`restore`), jamais une suppression physique (voir §5). |
| `position`                | `number`                                                            | Ordre d'affichage (ex. menu "Shop by collection").                                                                                                                             |
| `createdBy`               | `string`                                                            | `uid` staff/admin.                                                                                                                                                             |
| `createdAt` / `updatedAt` | `Timestamp`                                                         |                                                                                                                                                                                |

### 2.13 `promotions/{promotionId}`

**Nouvelle collection.** Remises **automatiques**, appliquées sans saisie
d'un code par le client (par opposition à `coupons`, §2.14).

| Champ                     | Type                                                                                        | Description                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `name`                    | `string`                                                                                    | Libellé interne.                                                                   |
| `description`             | `string \| null`                                                                            |                                                                                    |
| `type`                    | `'percentageOff' \| 'fixedAmountOff' \| 'buyXGetY' \| 'freeShipping'`                       | Extensible — voir décision PO §8.                                                  |
| `value`                   | `number \| null`                                                                            | Pourcentage (0–100) ou `amountMinor` selon `type`.                                 |
| `appliesTo`               | `{ scope: 'allProducts' \| 'category' \| 'collection' \| 'products'; targetIds: string[] }` | Référence polymorphe vers `categories`, `collections` ou `products` selon `scope`. |
| `startAt` / `endAt`       | `Timestamp`                                                                                 | Fenêtre de validité.                                                               |
| `isActive`                | `boolean`                                                                                   |                                                                                    |
| `combinable`              | `boolean`                                                                                   | Peut être cumulée avec un coupon ou une autre promotion.                           |
| `priority`                | `number`                                                                                    | Ordre de résolution si plusieurs promotions s'appliquent.                          |
| `createdBy`               | `string`                                                                                    | `uid` staff/admin.                                                                 |
| `createdAt` / `updatedAt` | `Timestamp`                                                                                 |                                                                                    |

### 2.14 `coupons/{code}`

**Nouvelle collection.** L'ID de document est le **code normalisé**
(majuscules, sans espace, ex. `WELCOME10`) — garantit l'unicité du code sans
requête supplémentaire, même idiome que `users/{uid}`.

| Champ                     | Type                                             | Description                                               |
| ------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `code`                    | `string`                                         | Dupliqué depuis l'ID de doc (export/lecture).             |
| `description`             | `string \| null`                                 |                                                           |
| `discountType`            | `'percentageOff' \| 'fixedAmountOff'`            |                                                           |
| `discountValue`           | `number`                                         |                                                           |
| `minPurchaseMinor`        | `number \| null`                                 |                                                           |
| `maxDiscountMinor`        | `number \| null`                                 | Plafond pour une remise en pourcentage.                   |
| `usageLimit`              | `number \| null`                                 | Nombre total d'utilisations autorisées.                   |
| `usageCount`              | `number`                                         | Incrémenté **transactionnellement** à chaque utilisation. |
| `perUserLimit`            | `number \| null`                                 |                                                           |
| `appliesTo`               | même forme que `promotions.appliesTo`, optionnel |                                                           |
| `startAt` / `endAt`       | `Timestamp`                                      |                                                           |
| `isActive`                | `boolean`                                        |                                                           |
| `createdAt` / `updatedAt` | `Timestamp`                                      |                                                           |

### 2.15 `banners/{bannerId}`

**Nouvelle collection.**

| Champ                     | Type                                                                         | Description                                                  |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `title`                   | `string`                                                                     |                                                              |
| `imageUrl`                | `string`                                                                     |                                                              |
| `linkUrl`                 | `string \| null`                                                             | URL interne ou externe, non contrainte en référence stricte. |
| `placement`               | `'homepageHero' \| 'homepageSecondary' \| 'catalogTop' \| 'checkoutSidebar'` | Extensible.                                                  |
| `startAt` / `endAt`       | `Timestamp \| null`                                                          | Fenêtre d'affichage optionnelle.                             |
| `isActive`                | `boolean`                                                                    |                                                              |
| `position`                | `number`                                                                     | Ordre au sein d'un `placement`.                              |
| `createdBy`               | `string`                                                                     | `uid` staff/admin.                                           |
| `createdAt` / `updatedAt` | `Timestamp`                                                                  |                                                              |

### 2.16 `homepage/{sectionId}`

**Nouvelle collection.** Modélise la page d'accueil comme une liste ordonnée
de sections (mini-CMS), pour permettre à l'équipe boutique de la recomposer
sans déploiement de code.

| Champ       | Type                                                                                                    | Description        |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `type`      | `'heroBanner' \| 'featuredCollection' \| 'featuredProducts' \| 'promotionBanner' \| 'newsletterSignup'` |                    |
| `position`  | `number`                                                                                                | Ordre d'affichage. |
| `isActive`  | `boolean`                                                                                               |                    |
| `config`    | forme dépendante de `type` (référence polymorphe, voir détail ci-dessous)                               |                    |
| `updatedBy` | `string`                                                                                                | `uid` staff/admin. |
| `updatedAt` | `Timestamp`                                                                                             |                    |

Formes de `config` selon `type` :

| `type`               | Forme de `config`                         |
| -------------------- | ----------------------------------------- |
| `heroBanner`         | `{ bannerId: string }`                    |
| `featuredCollection` | `{ collectionId: string; title: string }` |
| `featuredProducts`   | `{ productIds: string[]; title: string }` |
| `promotionBanner`    | `{ promotionId: string }`                 |
| `newsletterSignup`   | `{ headline: string }`                    |

### 2.17 `analytics/{period}_{date}`

**Nouvelle collection.** Contient uniquement des **agrégats périodiques**
pré-calculés par une Cloud Function planifiée — **pas** d'événements bruts
(page vues, clics), qui doivent aller vers un outil dédié (GA4/BigQuery,
voir décision PO §8) pour rester dans l'esprit de la stratégie de coût de
lecture (§9).

| Champ         | Type                                                                                                                                     | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `period`      | `'daily' \| 'monthly'`                                                                                                                   |                                                                              |
| `date`        | `string`                                                                                                                                 | `"2026-07-12"` (daily) ou `"2026-07"` (monthly) — cohérent avec l'ID de doc. |
| `metrics`     | `{ visits: number; orders: number; revenueMinor: number; newCustomers: number; conversionRate: number; averageOrderValueMinor: number }` |                                                                              |
| `topProducts` | `Array<{ productId: string; unitsSold: number }>`                                                                                        | Top N (ex. 10) — liste bornée, pas un classement complet.                    |
| `generatedAt` | `Timestamp`                                                                                                                              | Horodatage du calcul.                                                        |
| `source`      | `'cloudFunctionRollup'`                                                                                                                  | Marque le document comme généré, jamais saisi manuellement.                  |

### 2.18 `auditLogs/{logId}`

**Renommé en révision 4** (était `audit_logs`, voir §0). Journal
**append-only** des actions sensibles (changement de rôle, modification de
prix, override de statut de commande, création de coupon, etc.). Aucune
modification ni suppression n'est permise une fois un log écrit (voir §5).

| Champ        | Type                              | Description                                                                                      |
| ------------ | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `actorId`    | `string`                          | `uid` de l'auteur de l'action.                                                                   |
| `actorRole`  | `'staff' \| 'admin' \| 'system'`  | `'system'` pour les changements initiés par une Cloud Function.                                  |
| `action`     | `string`                          | Ex. `"order.statusChanged"`, `"product.priceUpdated"`, `"user.roleChanged"`, `"coupon.created"`. |
| `targetType` | `string`                          | Ex. `"order"`, `"product"`, `"user"`, `"coupon"`.                                                |
| `targetId`   | `string`                          |                                                                                                  |
| `before`     | `Record<string, unknown> \| null` | Valeurs avant modification (champs modifiés uniquement).                                         |
| `after`      | `Record<string, unknown> \| null` | Valeurs après modification.                                                                      |
| `ip`         | `string \| null`                  | Optionnel, si capturé côté serveur.                                                              |
| `createdAt`  | `Timestamp`                       |                                                                                                  |

### 2.19 `stockMovements/{movementId}`

**Nouvelle collection (Sprint 2B).** Registre **append-only** de tout
mouvement affectant une quantité de `inventory` — aucune Server Action
d'`update`/`delete` n'existe pour cette collection, à l'image d'`auditLogs`.
Chaque enregistrement documente **un seul champ quantité** modifié sur
**un seul** document `inventory`, ce qui rend `quantityBefore`/`quantityAfter`
non ambigus (le brief demande "Avant/Après" sans préciser laquelle des 4
quantités suivies — ce choix de modélisation lève l'ambiguïté et renforce
la traçabilité demandée).

| Champ               | Type                                                                                          | Description                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`              | `'adjustment' \| 'reservation' \| 'release' \| 'stockIn' \| 'stockOut' \| 'shipmentReceived'` | Nature du mouvement.                                                                                                                                  |
| `productId`         | `string`                                                                                      | Référence `products/{productId}`.                                                                                                                     |
| `variantId`         | `string`                                                                                      | Référence à `products.variants[].id`.                                                                                                                 |
| `warehouseLocation` | `string`                                                                                      | Même valeur que `inventory.warehouseLocation` au moment du mouvement.                                                                                 |
| `field`             | `'quantityOnHand' \| 'quantityReserved' \| 'quantityInTransit' \| 'quantityDamaged'`          | Quelle quantité de `inventory` a été modifiée par ce mouvement.                                                                                       |
| `quantityBefore`    | `number`                                                                                      | Valeur de `field` avant le mouvement.                                                                                                                 |
| `quantityAfter`     | `number`                                                                                      | Valeur de `field` après le mouvement.                                                                                                                 |
| `delta`             | `number`                                                                                      | `= quantityAfter - quantityBefore`, dénormalisé pour agrégation rapide (ex. somme des entrées sur une période).                                       |
| `reason`            | `string \| null`                                                                              | **Obligatoire** (non `null`) si `type === 'adjustment'` — validé par Zod, voir §5.2. Libre pour les autres types.                                     |
| `reference`         | `string \| null`                                                                              | Ex. `incomingShipments/{id}` pour `shipmentReceived`, ou une référence de commande une fois le module Commandes construit.                            |
| `actorId`           | `string`                                                                                      | `uid` de l'auteur — même une réception d'arrivage est déclenchée par un membre du staff qui valide la réception, jamais un acteur `"system"` anonyme. |
| `createdAt`         | `Timestamp`                                                                                   |                                                                                                                                                       |

## 3. Relations entre collections

```
users (1) ──< addresses (N)
users (1) ── carts (1)                [même uid, relation 1:1 par convention de clé]
users (1) ──< orders (N)               via orders.userId
users (1) ──< wishlists.items (N)      via wishlists/{uid}/items
users (1) ──< notifications.items (N)  via notifications/{uid}/items
users(staff/admin) (1) ──< auditLogs (N)  via auditLogs.actorId

categories (1) ──< products (N)        via products.categoryId
categories (N) ──< promotions (N)      relation polymorphe optionnelle, via appliesTo.scope == 'category'

products (1) ──< orders.items (N)      dénormalisé (snapshot), pas de FK vive
products (1) ──< wishlists.items (N)   via l'ID de doc de la sous-collection
products (1) ──< inventory (N)         via inventory.productId (+ variantId), un doc inventory par variante
products (1) ──< stockMovements (N)    via stockMovements.productId (+ variantId), révision 4
products (N) ──< collections.productIds (N)  many-to-many, tableau d'IDs embarqué (ou sous-collection si volumineux — voir §7) ; dénormalisé en retour sur products.collectionIds (révision 3, synchronisé en WriteBatch, voir §9)
products (N) ──< promotions/coupons (N) relation polymorphe optionnelle, via appliesTo.scope == 'products'
products (N) ──< incomingShipments.items (N) via incomingShipments.items[].productId

orders (1) ──< payments (N)            sous-collection
orders (N) ──> coupons (0..1)          via orders.appliedCouponCode
orders (N) ──> promotions (0..N)       via orders.appliedPromotionIds

suppliers (1) ──< incomingShipments (N)  via incomingShipments.supplierId
incomingShipments (1) ──▷ inventory (N)  pas de FK stricte : réception (status='received'/'partiallyReceived') incrémente inventory.quantityOnHand via Server Action transactionnelle (services/firestore/inventory.ts)
incomingShipments (1) ──< stockMovements (N)  via stockMovements.reference (révision 4)

banners (0..1) ──< homepage.config (N)      référence optionnelle selon homepage.type == 'heroBanner'/'promotionBanner'
collections (0..1) ──< homepage.config (N)  référence optionnelle selon homepage.type == 'featuredCollection'
promotions (0..1) ──< homepage.config (N)   référence optionnelle selon homepage.type == 'promotionBanner'
```

Aucune relation n'est appliquée par Firestore lui-même (pas de contraintes de
clé étrangère) : l'intégrité est garantie par la couche `services/` et les
Cloud Functions (ex. refuser un `orders.items[].productId` qui ne correspond
à aucun produit publié, ou un `orders.appliedCouponCode` qui ne correspond à
aucun coupon actif).

## 4. Conventions de nommage

- **Collections** : pluriel, `camelCase` si composé (`notifications`, pas
  `Notification`).
- **Champs** : `camelCase`, jamais de `snake_case` ni de tirets.
- **Montants** : toujours en unité mineure de devise, suffixe `Minor`
  (`totalMinor`), type `number` (entier).
- **Dates** : type Firestore `Timestamp`, suffixe `At` (`createdAt`,
  `deliveredAt`), jamais de chaîne ISO stockée manuellement — exception
  volontaire : `analytics.date`, stocké en `string` pour rester lisible et
  trier lexicographiquement dans l'ID de document (§2.17).
- **Références** : suffixe `Id` (`categoryId`, `userId`).
- **Références polymorphes** : forme `{ scope: string; targetIds: string[] }`
  (voir `promotions.appliesTo`, `coupons.appliesTo`) — le champ `scope`
  indique quelle collection cible `targetIds` référence.
- **Enums** : chaînes littérales en `camelCase` ou minuscule simple
  (`'pending'`), listées dans `types/` comme union TypeScript — pas de
  magic strings dispersées dans le code.
- **IDs de document** : ID auto Firestore par défaut ; clé métier (`uid`,
  `slug`, code) uniquement quand une relation 1:1 stricte ou un besoin de
  lookup direct le justifie (`users`, `carts`, `wishlists`, `notifications`,
  `settings/{domain}`, `inventory/{productId}_{variantId}`, `coupons/{code}`,
  `analytics/{period}_{date}`).
- **Configuration** : depuis cette révision, `settings` n'est plus un
  document unique mais une collection de documents singletons, un par
  domaine fonctionnel (§2.8) — permet des permissions de lecture différentes
  par domaine (ex. `store` public, `security` admin uniquement).

> ✅ **Résolu en révision 4** (voir décision PO §8, point 7 — sans réponse à
> ce jour) : les noms `incoming_shipments` et `audit_logs`, fournis en
> `snake_case` en révision 2, ont été renommés `incomingShipments` et
> `auditLogs` pour rester cohérents avec le `camelCase` universel du reste
> du schéma. Aucune donnée n'existait sous l'ancien nom — renommage sans
> coût de migration. Reste réversible sur simple demande.

## 5. Règles de sécurité proposées (stratégie, pas la version finale)

Principe général : **deny-by-default**, écritures sensibles réservées au
serveur (Admin SDK / Cloud Functions), le client Firestore n'ayant que des
permissions étroites et explicites. Pour toutes les collections listées
« Interdit (Admin SDK / staff) », **aucun rôle n'obtient de droit d'écriture
direct côté client** — même un compte `staff`/`admin` passe par une Server
Action ou une Cloud Function qui vérifie le rôle côté serveur avant
d'écrire avec l'Admin SDK (qui, lui, contourne les règles Firestore).

| Collection / sous-collection   | Lecture client                                                                                                                                                                                   | Écriture client                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users/{uid}`                  | Propriétaire uniquement                                                                                                                                                                          | Propriétaire, **sauf** le champ `role` (modifiable seulement via Admin SDK)                                                                                                                                                                            |
| `users/{uid}/addresses/**`     | Propriétaire uniquement                                                                                                                                                                          | Propriétaire                                                                                                                                                                                                                                           |
| `categories/**`                | Public, **si** `isActive == true` (staff/admin voient tout via Admin SDK)                                                                                                                        | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `products/**`                  | Public, **si** `status == 'published'`                                                                                                                                                           | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `carts/{uid}`                  | Propriétaire uniquement                                                                                                                                                                          | Propriétaire                                                                                                                                                                                                                                           |
| `orders/{orderId}`             | Propriétaire (`resource.data.userId == uid`) ou staff/admin                                                                                                                                      | **Interdit** — création et changements de statut uniquement via Server Action / Cloud Function                                                                                                                                                         |
| `orders/{orderId}/payments/**` | Propriétaire (lecture reçu) ou staff/admin                                                                                                                                                       | Interdit — écrit uniquement par le webhook de paiement (Cloud Function)                                                                                                                                                                                |
| `wishlists/{uid}/items/**`     | Propriétaire uniquement                                                                                                                                                                          | Propriétaire                                                                                                                                                                                                                                           |
| `notifications/{uid}/items/**` | Propriétaire uniquement                                                                                                                                                                          | Propriétaire, **seulement** le champ `read` — création serveur uniquement                                                                                                                                                                              |
| `settings/store`               | Public                                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/shipping`            | Public                                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/seo`                 | Public                                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/payment`             | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/email`               | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/notifications`       | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `settings/security`            | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `inventory/**`                 | Staff/admin uniquement (niveaux de stock exacts et coûts non publics)                                                                                                                            | Interdit (Admin SDK / Cloud Function)                                                                                                                                                                                                                  |
| `suppliers/**`                 | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `incomingShipments/**`         | Staff/admin uniquement                                                                                                                                                                           | Interdit (Admin SDK)                                                                                                                                                                                                                                   |
| `collections/**`               | Public, **si** `status == 'active'`                                                                                                                                                              | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `promotions/**`                | Public, **si** `isActive == true`                                                                                                                                                                | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `coupons/{code}`               | **Interdit** — un code n'est jamais lu/listé directement par le client ; validation via Cloud Function `validateCoupon` qui ne renvoie que le résultat (valide/montant), jamais le document brut | Interdit (Admin SDK) — `usageCount` incrémenté transactionnellement côté serveur                                                                                                                                                                       |
| `banners/**`                   | Public, **si** `isActive == true`                                                                                                                                                                | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `homepage/**`                  | Public, **si** `isActive == true`                                                                                                                                                                | Interdit (Admin SDK / staff)                                                                                                                                                                                                                           |
| `analytics/**`                 | Staff/admin uniquement                                                                                                                                                                           | Interdit — écrit uniquement par la Cloud Function planifiée                                                                                                                                                                                            |
| `auditLogs/**`                 | **Admin uniquement** (plus restreint que staff)                                                                                                                                                  | **Interdit en toutes circonstances côté client** — écrit uniquement par le serveur/Cloud Functions ; aucune règle d'`update`/`delete`, même côté Admin SDK applicatif (log immuable)                                                                   |
| `stockMovements/**`            | Staff/admin uniquement                                                                                                                                                                           | **Interdit en toutes circonstances côté client** — écrit uniquement par les Server Actions d'inventaire (Admin SDK), dans la même transaction que la mise à jour `inventory` ; aucune règle d'`update`/`delete` (registre immuable, comme `auditLogs`) |

Ce tableau sera traduit en règles `firestore.rules` réelles une fois validé ;
le fichier actuel refuse tout accès client (voir `firestore.rules`).

### 5.1 Suppression logique uniquement — `products` et `collections`

**Ajout révision 3.** Aucune route applicative ne supprime physiquement un
document `products` ou `collections` (pas de `delete()` exposé, ni via
Server Action, ni via règle Firestore). `status: 'archived'` en fait office,
et reste réversible via `restore`. Machines à états :

```
products.status    : draft ⇄ published → archived → (restore) → draft
collections.status : draft ⇄ active    → archived → (restore) → draft
```

Chaque transition est réalisée par une Server Action dédiée
(`publish`/`unpublish`/`archive`/`restore`), jamais par une écriture
générique de `status` — voir `docs/project-structure.md` pour l'emplacement
de ces actions.

### 5.2 Règles métier — Inventaire (ajout révision 4)

- **Stock disponible** : `quantityAvailable = quantityOnHand -
quantityReserved` en toutes circonstances. Jamais stocké de façon
  indépendante ni modifié directement — toujours recalculé dans la même
  écriture que `quantityOnHand`/`quantityReserved`.
- **Pas de survente** : une réservation (`reserveInventory`) est refusée si
  `quantity > quantityAvailable` **au moment de la transaction**. Vérifiée
  par une lecture fraîche à l'intérieur d'un `runTransaction` (jamais une
  lecture préalable hors transaction, qui pourrait être périmée en cas de
  réservations concurrentes) — `quantityReserved` ne peut donc jamais
  dépasser `quantityOnHand`.
- **Réception d'arrivage** : passer un `incomingShipments` à `received` ou
  `partiallyReceived` **doit** dans la même transaction : (1) incrémenter
  `inventory.quantityOnHand` de la quantité reçue, (2) décrémenter
  `inventory.quantityInTransit` d'autant, (3) mettre à jour
  `items[].quantityReceived` sur le document `incomingShipments`, (4) écrire
  un `stockMovements` de type `shipmentReceived` par ligne reçue. Aucune de
  ces quatre écritures n'est jamais faite isolément.
- **Ajustement justifié** : `adjustInventory()` exige `reason` non vide
  (validé par Zod côté Server Action **et** revérifié côté service avant
  écriture) — un ajustement sans motif est rejeté avant toute transaction
  Firestore.
- **Transactions obligatoires** : `reserveInventory`, `releaseInventory`,
  `stockIn`, `stockOut`, `adjustInventory` et la réception d'arrivage
  utilisent tous `adminDb.runTransaction()` — jamais de `update()` simple
  sur un champ quantité, pour éliminer les conditions de course entre
  écritures concurrentes (ex. deux réservations simultanées sur le dernier
  exemplaire en stock).
- **Aucune suppression** de document `inventory` ou `stockMovements` n'est
  jamais exposée — cohérent avec le principe de suppression logique déjà
  appliqué à `products`/`collections` (§5.1), étendu ici à l'immuabilité
  totale du registre de mouvements.

## 6. Index composites recommandés

| Collection                  | Champs indexés                                   | Requête servie                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`                  | `status ASC, categoryId ASC, createdAt DESC`     | Catalogue par catégorie, plus récents en premier                                                                                                                                                                 |
| `products`                  | `status ASC, isPreorderable ASC, createdAt DESC` | Liste des produits en pré-commande                                                                                                                                                                               |
| `products`                  | `status ASC, nameLower ASC`                      | **Ajout révision 3.** Recherche préfixe par nom, dans un statut donné (dashboard admin)                                                                                                                          |
| `products`                  | `collectionIds ARRAY_CONTAINS, createdAt DESC`   | **Ajout révision 3.** Produits d'une collection, plus récents en premier (page collection + admin)                                                                                                               |
| `products`                  | `status ASC, basePriceMinor ASC`                 | **Ajout révision 3.** Tri par prix dans le tableau de bord admin                                                                                                                                                 |
| `categories`                | `isActive ASC, position ASC`                     | **Ajout révision 3.** Catégories actives, triées pour la navigation                                                                                                                                              |
| `orders`                    | `userId ASC, createdAt DESC`                     | "Mes commandes"                                                                                                                                                                                                  |
| `orders`                    | `status ASC, createdAt DESC`                     | File d'attente admin par statut                                                                                                                                                                                  |
| `orders`                    | `type ASC, status ASC, createdAt DESC`           | File d'attente pré-commandes admin                                                                                                                                                                               |
| `notifications/{uid}/items` | `read ASC, createdAt DESC`                       | Notifications non lues d'un utilisateur, triées                                                                                                                                                                  |
| `inventory`                 | `isLowStock ASC, updatedAt DESC`                 | Tableau de bord "stock bas" — Firestore ne pouvant pas comparer deux champs (`quantityAvailable <= reorderThreshold`) dans une requête, `isLowStock` est dénormalisé et recalculé à chaque écriture (voir §2.9). |
| `inventory`                 | `warehouseLocation ASC, isLowStock ASC`          | **Ajout révision 4.** Stock bas par entrepôt (utile dès qu'un 2ᵉ entrepôt existera).                                                                                                                             |
| `incomingShipments`         | `supplierId ASC, status ASC, expectedAt ASC`     | Réceptions attendues par fournisseur                                                                                                                                                                             |
| `incomingShipments`         | `status ASC, expectedAt ASC`                     | File d'attente globale des réceptions + détection des arrivages en retard (`expectedAt < now`, statut actif) — voir alertes §11.                                                                                 |
| `incomingShipments`         | `status ASC, receivedAt DESC`                    | **Ajout révision 4.** Arrivages "reçus récemment" (alerte 🟢, §11).                                                                                                                                              |
| `incomingShipments`         | `supplierId ASC, orderedAt DESC`                 | **Ajout révision 4.** Historique des arrivages d'un fournisseur (fiche fournisseur, §2.10).                                                                                                                      |
| `stockMovements`            | `productId ASC, variantId ASC, createdAt DESC`   | **Ajout révision 4.** Historique des mouvements d'une variante précise.                                                                                                                                          |
| `stockMovements`            | `type ASC, createdAt DESC`                       | **Ajout révision 4.** Filtrage du registre par type de mouvement (dashboard Stock).                                                                                                                              |
| `collections`               | `status ASC, position ASC`                       | Liste des collections actives, triées pour affichage (**`isActive` → `status` en révision 3**)                                                                                                                   |
| `collections`               | `status ASC, nameLower ASC`                      | **Ajout révision 3.** Recherche préfixe par nom dans le dashboard admin                                                                                                                                          |
| `promotions`                | `isActive ASC, endAt ASC`                        | Promotions actives non expirées (à croiser côté serveur avec `startAt` — volume faible, filtrage en mémoire recommandé en alternative, voir §9)                                                                  |
| `coupons`                   | `isActive ASC, endAt DESC`                       | Liste admin des coupons actifs                                                                                                                                                                                   |
| `banners`                   | `placement ASC, isActive ASC, position ASC`      | Bannières actives d'un emplacement donné, triées                                                                                                                                                                 |
| `homepage`                  | `isActive ASC, position ASC`                     | Composition ordonnée de la page d'accueil                                                                                                                                                                        |
| `analytics`                 | `period ASC, date ASC`                           | Séries temporelles pour les graphiques du tableau de bord                                                                                                                                                        |
| `auditLogs`                 | `targetType ASC, targetId ASC, createdAt DESC`   | Historique des actions sur une entité donnée                                                                                                                                                                     |
| `auditLogs`                 | `actorId ASC, createdAt DESC`                    | Historique des actions d'un membre du staff/admin                                                                                                                                                                |

Les index simple-champ sont automatiques ; seuls les index composites
ci-dessus doivent être déclarés dans `firestore.indexes.json`. **Révision 4** :
le fichier n'est plus vide — il contient désormais les index réellement
exercés par le code livré (`products`, `categories`, `collections`,
`inventory`, `incomingShipments`, `stockMovements`), à déployer via
`firebase deploy --only firestore:indexes`. Toutes les combinaisons
possibles ne sont pas couvertes (voir §9, "Alertes = requêtes bornées") —
une combinaison de filtres non anticipée déclenche une erreur Firestore
explicite avec un lien direct pour créer l'index manquant, comportement
normal, pas un bug. Les documents `settings/{domain}`, `coupons/{code}`
(lecture serveur) et `inventory/{productId}_{variantId}` sont conçus pour
être lus par `get()` direct sur un ID connu — aucun index n'est requis pour
ces accès.

## 7. Choix racine vs sous-collection vs tableau embarqué

| Donnée                                                         | Choix                                                        | Justification                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variantes produit                                              | Tableau embarqué dans `products`                             | Nombre borné (quelques tailles/couleurs), toujours lu avec le produit — pas de gain à séparer.                                                                                                                                                                                                           |
| Items du panier                                                | Tableau embarqué dans `carts`                                | Nombre borné (~dizaine max), lecture/écriture toujours globale au panier.                                                                                                                                                                                                                                |
| Historique de statut commande                                  | Tableau embarqué dans `orders`                               | Peu d'entrées (quelques transitions), toujours affiché avec la commande.                                                                                                                                                                                                                                 |
| Adresses utilisateur                                           | Sous-collection                                              | Nombre variable, CRUD indépendant (ajout/suppression d'une adresse ne doit pas réécrire tout le profil).                                                                                                                                                                                                 |
| Paiements de commande                                          | Sous-collection                                              | Écrit par un webhook externe de manière asynchrone et indépendante du doc `orders` — évite les conflits d'écriture concurrente.                                                                                                                                                                          |
| Items de wishlist                                              | Sous-collection                                              | Ajout/suppression unitaire fréquent ; éviter les limites de taille de tableau et les conflits d'écriture concurrente sur un même document.                                                                                                                                                               |
| Notifications                                                  | Sous-collection                                              | Volume non borné dans le temps, écriture serveur fréquente, lecture paginée — inadapté à un tableau embarqué.                                                                                                                                                                                            |
| Stock (`inventory`)                                            | Collection racine                                            | Écritures fréquentes et concurrentes (vente, réception, ajustement) — isolé de `products` pour éviter la contention sur le document produit.                                                                                                                                                             |
| Réceptions fournisseur (`incomingShipments`)                   | Collection racine                                            | Cycle de vie indépendant du produit et du fournisseur, plusieurs `items` par réception — un tableau embarqué dans `suppliers` ou `products` serait mal placé (relation N:M).                                                                                                                             |
| Produits d'une collection marchande (`collections.productIds`) | Tableau embarqué                                             | Nombre borné en pratique (quelques dizaines à ~500 produits). **Seuil indicatif** : au-delà de ~500 IDs ou si un besoin de métadonnée par association apparaît (ex. position spécifique dans la collection), migrer vers une sous-collection `collections/{id}/products/{productId}`.                    |
| Logs d'audit (`auditLogs`)                                     | Collection racine (jamais imbriquée sous l'entité concernée) | `targetType` varie (order, product, user, coupon...) — une collection unique permet à la fois "historique d'une entité" et "actions d'un acteur" sans dupliquer les logs dans plusieurs sous-collections.                                                                                                |
| Agrégats analytics (`analytics`)                               | Collection racine, un document par période                   | Peu de documents (365/an en daily), toujours accédés par plage de dates, jamais imbriqués sous une autre entité.                                                                                                                                                                                         |
| Mouvements de stock (`stockMovements`)                         | Collection racine (jamais imbriquée sous `inventory`)        | **Ajout révision 4.** Volume non borné dans le temps (un mouvement par vente/ajustement/réception) ; une collection unique permet à la fois "historique d'une variante" et "tous les mouvements récents" (dashboard) sans dupliquer dans chaque document `inventory`. Même raisonnement que `auditLogs`. |

## 8. Points nécessitant une décision Product Owner

Ces choix impactent directement le schéma ci-dessus — voir le détail et les
options dans `docs/technical-recommendations.md` (§ "Décisions à prendre") :

1. Devise(s) supportée(s) (`HTG`, `USD`, les deux ?) et affichage multi-devise
   (impacte `settings/store.supportedCurrencies`).
2. Pré-commandes : `orders` unifié avec champ `type`, ou collection séparée
   `preorders` si les règles métier divergent fortement.
3. Fournisseur(s) de paiement à intégrer (MonCash, Stripe, virement manuel,
   autre) — impacte `settings/payment.enabledProviders`, le champ
   `payments.provider` et les webhooks Cloud Functions.
4. Profondeur de la hiérarchie de catégories (2 niveaux supposés ici).
5. Avis produits (reviews) : fonctionnalité prévue ou non — impacte
   `ratingAverage`/`ratingCount` et une éventuelle sous-collection `reviews`.
6. Mode de livraison : coursier interne, transporteur tiers, retrait en
   boutique uniquement — impacte `delivery.method`,
   `settings/shipping.deliveryMethods` et l'intégration tracking.
7. ~~**Convention de nommage**~~ — **résolu en révision 4** : renommés
   `incomingShipments`/`auditLogs` par défaut (camelCase), en l'absence de
   réponse. Signalez si un autre nom était voulu — aucune donnée existante
   à migrer.
8. ~~**Multi-entrepôt**~~ — **résolu en révision 4** : un seul entrepôt
   logique (`"main"`) pour le lancement. `warehouseLocation` reste une
   chaîne libre (pas de collection `warehouses` dédiée), pour absorber un
   vrai multi-entrepôt plus tard sans migration de schéma.
9. **Moteur de règles des collections automatiques** (`collections.rules`) :
   quels critères doivent être supportés (tag, catégorie, plage de prix,
   combinaison) ?
10. **Types de promotions à supporter en priorité** (`promotions.type`) et
    règles de cumul avec les coupons (`combinable`).
11. **Portée de l'analytics** : les rollups agrégés dans Firestore
    (`analytics`) suffisent-ils pour le tableau de bord interne, ou une
    intégration GA4/BigQuery est-elle nécessaire pour l'analyse détaillée
    (entonnoir, comportement utilisateur) ?
12. **Politique de rétention des `auditLogs`** : durée de conservation,
    purge automatique ou archivage — impacte une éventuelle Cloud Function
    planifiée de nettoyage (à concevoir séparément, un log étant
    normalement immuable une fois écrit).
13. **Sécurité admin** (`settings/security`) : IP allowlisting et 2FA
    obligatoire pour les comptes admin dès le lancement, ou fonctionnalité
    différée ?
14. **Heuristique "forte demande"** (alerte 🟣, §11) : en l'absence de
    données de vente réelles (module Commandes non construit), l'alerte
    utilise un indicateur de pression sur les réservations
    (`quantityReserved` élevé relativement à `quantityOnHand`, combiné à un
    stock disponible sous le seuil). À valider ou remplacer par un vrai
    calcul de vélocité des ventes une fois le module Commandes livré.
15. **Alerte "précommandes dépassant le stock attendu"** (🔵, §11) : **non
    implémentable maintenant** — nécessite un compteur de précommandes par
    produit, qui n'existe dans aucune collection tant que Commandes/Panier
    ne sont pas construits (hors périmètre Sprint 2B). Prévu au moment où
    ce module sera livré.
16. **Motif d'ajustement** (`stockMovements.reason` pour `type ===
'adjustment'`) : texte libre pour l'instant. Une liste fermée de motifs
    (`"comptage"`, `"casse"`, `"vol"`, `"retour fournisseur"`, ...)
    faciliterait le reporting — à trancher si le volume d'ajustements le
    justifie.

Tant que ces points ne sont pas validés, aucune règle de sécurité définitive
ni logique métier (Cloud Functions de traitement de commande, formulaires de
checkout, etc.) ne sera implémentée — conformément au périmètre de cette
étape.

## 9. Stratégies de requêtes pour limiter les coûts de lecture

- **Snapshots au lieu de jointures** : `orders.items` copie les données
  produit nécessaires à l'affichage (nom, image, prix) — afficher une
  commande ne coûte jamais de lecture supplémentaire sur `products`.
- **Pagination par curseur**, jamais par offset : `limit()` +
  `startAfter(lastVisibleDoc)` sur les listes (catalogue, commandes admin,
  notifications, `auditLogs`).
- **Agrégations côté serveur** : utiliser `getCountFromServer()` /
  `getAggregateFromServer()` pour les compteurs de tableau de bord (nombre de
  commandes en attente, etc.) plutôt que lire tous les documents pour les
  compter.
- **Écouteurs temps réel ciblés** : `onSnapshot` uniquement sur un document
  précis (panier de l'utilisateur courant, statut de sa commande en cours),
  jamais sur une collection entière côté client.
- **Cache des données peu volatiles** : `categories`, `settings/*`,
  `collections`, `banners` et `homepage` changent rarement — les mettre en
  cache côté serveur (`unstable_cache` / revalidation Next.js) ou côté
  client (staleTime long) plutôt que de les relire à chaque navigation.
- **Concurrence sur le stock** : décrémenter `inventory.quantityOnHand` /
  `quantityReserved` via une transaction Firestore (`runTransaction`) au
  moment de la confirmation de commande, pour éviter la survente en cas
  d'achats simultanés. Si le volume devient très élevé sur une même
  variante (rare en e-commerce de niche), le pattern de compteur distribué
  (sharded counters) documenté par Firebase peut être introduit plus tard
  sans changer le schéma public.
- **Numéro de commande lisible** : généré via une transaction sur un document
  compteur dédié (`counters/orders`) plutôt qu'un scan de la collection
  `orders` pour trouver le dernier numéro.
- **Écritures groupées** : toute opération qui touche plusieurs documents
  (ex. confirmer une commande → mettre à jour `orders`, décrémenter
  `inventory`, créer une notification, écrire un `auditLogs`) passe par un
  `WriteBatch` ou une transaction pour garantir l'atomicité et éviter des
  lectures de re-vérification côté client.
- **Analytics = rollups, pas d'événements bruts** : `analytics` ne doit
  jamais recevoir une écriture par vue de page ou par clic (coût
  prohibitif à l'échelle) — uniquement des documents agrégés générés
  périodiquement par une Cloud Function planifiée (`scheduled`). Le suivi
  d'événements bruts, si nécessaire, relève d'un outil dédié (voir décision
  PO §8, point 11).
- **Validation de coupon sans lecture exposée** : la vérification d'un code
  saisi au checkout passe par une Cloud Function callable
  (`validateCoupon`) qui lit `coupons/{code}` côté serveur et ne renvoie au
  client que `{ valid: boolean; discountMinor?: number }` — évite d'exposer
  `usageLimit`/`usageCount`/`appliesTo` et empêche l'énumération de codes.
- **Recherche préfixe via `nameLower`** (**ajout révision 3**) : Firestore ne
  supporte pas la recherche plein texte nativement. `products.nameLower`,
  `categories.nameLower` et `collections.nameLower` permettent une requête
  `where('nameLower', '>=', terme).where('nameLower', '<=', terme + '')`
  — suffisant pour une recherche "commence par" dans le dashboard admin. Une
  recherche plus riche (fautes de frappe, milieu de mot) nécessiterait un
  service tiers (Algolia, Typesense, Meilisearch) — non nécessaire au
  lancement, à réévaluer si le catalogue grossit significativement.
- **Synchronisation `products.collectionIds` ↔ `collections.productIds`**
  (**ajout révision 3**) : toute opération qui ajoute/retire un produit
  d'une collection écrit les deux côtés dans le **même** `WriteBatch`
  (jamais deux écritures séparées), pour qu'aucun état incohérent ne soit
  jamais lisible entre les deux collections.
- **Export CSV** (**ajout révision 3**) : généré à la demande dans une
  Server Action à partir de la même requête filtrée que le tableau admin
  (pas d'export "table entière" par défaut) — le volume attendu au
  lancement ne justifie pas un job d'export asynchrone en arrière-plan.
- **Logs d'audit asynchrones** : l'écriture dans `auditLogs` ne doit
  jamais bloquer la réponse à l'utilisateur — déclenchée en tâche de fond
  (trigger Firestore ou fire-and-forget côté Cloud Function) après
  l'opération principale.
- **Transactions bornées** (**ajout révision 4**) : chaque transaction
  d'inventaire (`reserveInventory`, `stockIn`, réception d'arrivage, ...)
  lit et écrit un nombre **fixe et petit** de documents (1 `inventory` + 1
  `stockMovements` +, pour une réception, 1 `incomingShipments`) — jamais
  une transaction qui itère sur un nombre de documents proportionnel au
  catalogue, pour rester sous les limites de contention de Firestore.
- **Alertes = requêtes bornées sur champs dénormalisés** (**ajout révision
  4**) : le panneau d'alertes (§11) ne scanne jamais l'intégralité de
  `products`/`inventory`. Chaque type d'alerte lit une requête indexée et
  plafonnée (`limit()`) : `isLowStock == true` pour le stock critique,
  `status in [...] && expectedAt < now` pour les retards — jamais un calcul
  qui nécessiterait de lire tous les documents pour les évaluer un par un
  côté serveur.

## 10. Types TypeScript miroir

Chaque table ci-dessus est reproduite en type TypeScript strict dans
`types/` : `types/product.ts`, `types/category.ts`, `types/collection.ts`
(Sprint 2A) ; `types/inventory.ts`, `types/supplier.ts`,
`types/incoming-shipment.ts`, `types/stock-movement.ts` (Sprint 2B). Les
types pour `order`, `promotion`, `coupon`, etc. restent à créer lors des
sprints correspondants.

## 11. Centre d'alertes intelligentes (ajout révision 4)

**Contexte** : demande Product Owner intégrée directement au Sprint 2B (pas
anticipée aux révisions précédentes). Le tableau de bord Stock affiche un
panneau de notifications centralisé, calculé à partir de données réelles —
**pas** une collection Firestore dédiée : chaque alerte est **dérivée à la
volée** par une requête bornée (voir §9) au chargement du dashboard, jamais
stockée ni recalculée en arrière-plan à ce stade (pas de Cloud Function
planifiée pour ça pour l'instant — le volume ne le justifie pas encore).

| Alerte                                      | Calcul                                                                                                                                | Statut                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 🔴 Stock critique                           | `inventory` où `isLowStock == true`, jointure produit pour l'affichage.                                                               | **Implémenté** (données réelles)                  |
| 🟡 Arrivage en retard                       | `incomingShipments` où `status not in ['received','cancelled']` et `expectedAt < now()`.                                              | **Implémenté** (données réelles)                  |
| 🟢 Arrivage reçu, prêt à la vente           | `incomingShipments` où `status == 'received'` et `receivedAt` dans les X derniers jours (fenêtre glissante, ex. 7 jours).             | **Implémenté** (données réelles)                  |
| 🟣 Produit très demandé, bientôt en rupture | Proxy : `inventory` où `isLowStock == true` **et** `quantityReserved / max(quantityOnHand, 1) >= 0,5` — voir décision PO §8 point 14. | **Implémenté (proxy)**, à affiner                 |
| 🔵 Précommandes dépassant le stock attendu  | Nécessiterait un compteur de précommandes par produit — **inexistant** tant que Commandes/Panier ne sont pas construits.              | **Non implémenté** — voir décision PO §8 point 15 |

Les trois premières alertes reposent sur des données déjà réelles et
fiables dans ce sprint. La quatrième est un indicateur proxy, documenté
comme tel dans l'UI (pas présenté comme une mesure de demande réelle). La
cinquième est volontairement absente de l'implémentation — afficher une
alerte basée sur une donnée qui n'existe pas serait trompeur ; l'écran
prévoit son emplacement (carte "à venir") plutôt que de l'omettre
silencieusement, pour que le suivi de cette dépendance reste visible.
