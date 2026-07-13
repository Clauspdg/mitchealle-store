# Architecture Firestore — Mitchaella Store

> Statut : **proposition technique, en attente de validation Product Owner.**
> Aucune collection n'est créée à partir de ce document et aucune règle
> Firestore définitive n'est écrite — voir `docs/technical-recommendations.md`
> pour la liste des points à trancher avant implémentation.

## 0. Journal des modifications

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

| Collection            | Portée                                                        | Clé de document                              |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `users`                | Profil des comptes (clients, staff, admin)                       | `uid` (Firebase Auth UID)                       |
| `categories`           | Taxonomie de navigation du catalogue                             | ID auto                                         |
| `products`             | Produits du catalogue                                            | ID auto (ou slug, voir §6)                      |
| `carts`                | Panier courant, un par utilisateur                               | `uid`                                           |
| `orders`               | Commandes (standard **et** pré-commandes)                        | ID auto                                         |
| `wishlists`            | Liste de souhaits (racine par utilisateur)                       | `uid`                                           |
| `notifications`        | Notifications reçues par un utilisateur (racine par utilisateur) | `uid`                                           |
| `settings`             | Configuration de la boutique, un document par domaine (voir §2.8) | slug du domaine (`store`, `payment`, ...)      |
| `inventory`            | Stock par variante produit (source de vérité)                    | `{productId}_{variantId}`                       |
| `suppliers`            | Fournisseurs / fabricants                                        | ID auto                                         |
| `incoming_shipments`   | Réceptions de marchandise attendues/reçues                       | ID auto                                         |
| `collections`          | Regroupements marchands de produits (éditorial/marketing)        | ID auto                                         |
| `promotions`           | Remises automatiques (sans code)                                 | ID auto                                         |
| `coupons`               | Codes promo saisis par le client                                 | code normalisé (voir §2.14)                     |
| `banners`               | Bannières promotionnelles/visuelles                              | ID auto                                         |
| `homepage`              | Sections composant la page d'accueil                             | ID auto                                         |
| `analytics`             | Agrégats de mesure (rollups périodiques)                         | `{period}_{date}` (voir §2.17)                  |
| `audit_logs`            | Journal d'audit des actions sensibles                            | ID auto                                         |

> **Note de vocabulaire** : la collection `collections` désigne un
> regroupement **marchand/éditorial** de produits (ex. « Nouveautés »,
> « Édition Été 2026 »), au sens où Shopify utilise "Collections" — à ne pas
> confondre avec le terme technique *collection* de Firestore. Elle est
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

| Sous-collection                          | Parent            | Contenu                          |
| ------------------------------------------ | ------------------ | ---------------------------------- |
| `users/{uid}/addresses/{addressId}`        | `users`            | Carnet d'adresses de livraison    |
| `orders/{orderId}/payments/{paymentId}`    | `orders`           | Transactions de paiement (dépôt, solde, remboursement) |
| `wishlists/{uid}/items/{productId}`        | `wishlists`        | Un item de wishlist par produit    |
| `notifications/{uid}/items/{notifId}`      | `notifications`    | Une notification                   |

Aucune nouvelle sous-collection n'est introduite dans cette révision : les
dix nouvelles collections listées ci-dessus sont toutes des collections
racine (justification au cas par cas en §7).

## 2. Modèle de données détaillé

### 2.1 `users/{uid}`

| Champ             | Type                                  | Description |
| ------------------ | -------------------------------------- | ------------ |
| `uid`               | `string`                                | Dupliqué depuis l'ID de doc pour faciliter les requêtes de groupe (`collectionGroup`) et l'export. |
| `email`             | `string`                                | Depuis Firebase Auth. |
| `displayName`       | `string`                                | |
| `phone`             | `string \| null`                        | Format E.164. |
| `photoURL`          | `string \| null`                        | |
| `role`              | `'customer' \| 'staff' \| 'admin'`      | Défaut `'customer'`. Modifiable uniquement côté serveur (voir §5). |
| `locale`            | `string`                                | Ex. `"fr-HT"`. |
| `defaultAddressId`  | `string \| null`                        | Référence vers `addresses/{addressId}`. |
| `marketingOptIn`    | `boolean`                               | Défaut `false`. |
| `createdAt`         | `Timestamp`                             | |
| `updatedAt`          | `Timestamp`                             | |

**Sous-collection `addresses/{addressId}`**

| Champ           | Type      |
| ---------------- | ---------- |
| `label`           | `string`   | Ex. "Maison", "Bureau". |
| `recipientName`   | `string`   |
| `phone`            | `string`   |
| `line1` / `line2`  | `string`   |
| `city` / `region`  | `string`   |
| `postalCode`       | `string \| null` |
| `country`          | `string`   | Code ISO 3166-1 alpha-2. |
| `isDefault`        | `boolean`  |

### 2.2 `categories/{categoryId}`

| Champ         | Type                | Description |
| -------------- | -------------------- | ------------ |
| `name`          | `string`              | |
| `slug`          | `string`              | Unique, utilisé dans les URLs. |
| `parentId`      | `string \| null`      | Support d'une hiérarchie à 2 niveaux max (voir §8, décision PO). |
| `imageUrl`      | `string \| null`      | |
| `position`      | `number`              | Ordre d'affichage. |
| `isActive`      | `boolean`             | |

### 2.3 `products/{productId}`

| Champ              | Type                                            | Description |
| -------------------- | ------------------------------------------------- | ------------ |
| `name`                | `string`                                           | |
| `slug`                | `string`                                           | Unique. |
| `description`         | `string`                                           | |
| `categoryId`          | `string`                                           | Référence `categories/{categoryId}`. |
| `images`              | `Array<{ url: string; alt: string; position: number }>` | |
| `basePriceMinor`      | `number` (entier)                                  | Prix en unité mineure de devise (centimes) pour éviter les erreurs flottantes. |
| `currency`            | `string`                                           | Code ISO 4217 (ex. `"USD"`, `"HTG"`) — voir décision PO §8. |
| `variants`            | `Array<ProductVariant>`                             | Voir sous-type ci-dessous. |
| `status`              | `'draft' \| 'published' \| 'archived'`             | Seuls les produits `published` sont lisibles publiquement. |
| `isPreorderable`      | `boolean`                                          | |
| `preorderWindow`      | `{ startAt: Timestamp; endAt: Timestamp } \| null` | Rempli si `isPreorderable`. |
| `tags`                | `string[]`                                         | Pour recherche/filtrage facultatif. |
| `ratingAverage`       | `number`                                           | Dénormalisé, mis à jour par Cloud Function (si avis activés plus tard). |
| `ratingCount`         | `number`                                           | |
| `createdAt` / `updatedAt` | `Timestamp`                                    | |
| `createdBy`           | `string`                                           | `uid` staff/admin. |

`ProductVariant` (objet embarqué, pas de sous-collection — voir §7) :

| Champ        | Type      | Description |
| ------------- | ---------- | ------------ |
| `id`           | `string`   | Identifiant stable (ex. `"S-black"`). |
| `sku`          | `string`   | |
| `size`         | `string \| null` | |
| `color`        | `string \| null` | |
| `priceMinor`   | `number \| null` | Surcharge de `basePriceMinor` si différent. |
| `stock`        | `number`   | **Copie dénormalisée** de `inventory.{productId}_{variantId}.quantityAvailable`, maintenue par Cloud Function à chaque mouvement de stock. La source de vérité est désormais la collection `inventory` (§2.9) — ce champ existe uniquement pour éviter une lecture `inventory` supplémentaire à chaque affichage produit. |
| `isDefault`    | `boolean`  | |

### 2.4 `carts/{uid}`

| Champ      | Type                          | Description |
| ----------- | ------------------------------ | ------------ |
| `items`      | `Array<CartItem>`              | Voir sous-type. |
| `updatedAt`  | `Timestamp`                    | |

`CartItem` :

| Champ               | Type     |
| -------------------- | --------- |
| `productId`            | `string`  |
| `variantId`            | `string`  |
| `quantity`             | `number`  |
| `unitPriceMinorSnapshot` | `number` | Prix au moment de l'ajout, réconcilié à l'affichage si le prix produit a changé. |
| `addedAt`              | `Timestamp` |

### 2.5 `orders/{orderId}`

Couvre **à la fois** les commandes standard et les pré-commandes via le champ
`type` (voir §8 pour la décision d'unifier vs séparer en deux collections).

| Champ            | Type                                                                 | Description |
| ------------------ | ----------------------------------------------------------------------- | ------------ |
| `orderNumber`       | `string`                                                                 | Identifiant lisible (ex. `MS-2026-000123`), généré via compteur transactionnel — voir §9. |
| `userId`            | `string`                                                                 | Référence `users/{uid}`. |
| `type`              | `'standard' \| 'preorder'`                                              | |
| `status`            | `'pending' \| 'confirmed' \| 'processing' \| 'ready' \| 'shipped' \| 'delivered' \| 'cancelled' \| 'refunded'` | Machine à états, transitions validées côté serveur uniquement. |
| `items`             | `Array<OrderItem>`                                                       | Snapshot immuable au moment de la commande (nom, image, prix) — ne dépend plus du doc `products` après création. |
| `subtotalMinor`     | `number`                                                                 | |
| `shippingFeeMinor`  | `number`                                                                 | |
| `discountMinor`     | `number`                                                                 | Cumul des réductions issues d'un coupon (`appliedCouponCode`) et/ou de promotions automatiques (`appliedPromotionIds`). |
| `appliedCouponCode` | `string \| null`                                                        | **Ajout révision 2.** Référence `coupons/{code}` si un coupon a été appliqué. |
| `appliedPromotionIds` | `string[]`                                                             | **Ajout révision 2.** Référence `promotions/{promotionId}` pour chaque promotion automatique appliquée. Détail de la remise par article non modélisé à ce stade (voir §8). |
| `totalMinor`        | `number`                                                                 | |
| `currency`          | `string`                                                                 | |
| `statusHistory`     | `Array<{ status: string; at: Timestamp; by: string; note?: string }>`   | Journal d'audit embarqué (peu d'entrées, pas besoin de sous-collection). |
| `delivery`          | `{ method: 'pickup' \| 'delivery'; addressSnapshot: Address \| null; trackingNumber: string \| null; estimatedAt: Timestamp \| null; status: string }` | Adresse dénormalisée au moment de la commande. |
| `preorder`          | `{ depositMinor: number; depositPaidAt: Timestamp \| null; balanceDueMinor: number; balanceDueAt: Timestamp \| null; estimatedReadyAt: Timestamp \| null } \| null` | Rempli uniquement si `type === 'preorder'`. |
| `notes`             | `string \| null`                                                         | |
| `createdAt` / `updatedAt` | `Timestamp`                                                        | |

`OrderItem` :

| Champ         | Type     |
| -------------- | --------- |
| `productId`      | `string`  |
| `variantId`      | `string`  |
| `nameSnapshot`   | `string`  |
| `imageSnapshot`  | `string`  |
| `unitPriceMinor` | `number`  |
| `quantity`       | `number`  |
| `lineTotalMinor` | `number`  |

**Sous-collection `payments/{paymentId}`**

| Champ         | Type                                              | Description |
| -------------- | --------------------------------------------------- | ------------ |
| `type`           | `'deposit' \| 'balance' \| 'full' \| 'refund'`      | |
| `provider`       | `string`                                            | Ex. `"moncash"`, `"stripe"` — dépend du choix PO. |
| `method`         | `string`                                            | |
| `amountMinor`    | `number`                                            | |
| `currency`       | `string`                                            | |
| `status`         | `'pending' \| 'succeeded' \| 'failed'`              | |
| `providerRef`    | `string \| null`                                     | ID de transaction externe. |
| `createdAt`      | `Timestamp`                                          | |

### 2.6 `wishlists/{uid}/items/{productId}`

| Champ        | Type      |
| ------------- | ---------- |
| `variantId`     | `string \| null` |
| `addedAt`       | `Timestamp` |

### 2.7 `notifications/{uid}/items/{notificationId}`

| Champ       | Type                          |
| ------------ | ------------------------------ |
| `type`         | `string`                        | Ex. `"order_status_changed"`, `"preorder_ready"`. |
| `title`        | `string`                        |
| `body`         | `string`                        |
| `data`         | `Record<string, string>`        | Payload libre (ex. `{ orderId }`) pour la navigation au clic. |
| `read`         | `boolean`                       |
| `createdAt`    | `Timestamp`                     |

### 2.8 `settings/{domain}` — **remplace `settings/general`**

Sept documents singletons, un par domaine de configuration, au lieu d'un
document unique `general`. Objectif : limiter la portée de lecture (le
storefront public n'a besoin que de `store`/`shipping`/`seo`, pas de
`payment`/`email`/`security`) et éviter qu'une modification mineure d'un
domaine ne déclenche une invalidation de cache sur tous les autres.

**`settings/store`**

| Champ           | Type                        |
| ----------------- | ----------------------------- |
| `storeName`         | `string`                       |
| `legalName`         | `string \| null`               |
| `currency`          | `string`                       | Devise principale, ISO 4217. |
| `supportedCurrencies` | `string[]`                   | Vide/1 élément tant que le multi-devise n'est pas validé (§8). |
| `contactEmail`      | `string`                       |
| `contactPhone`      | `string`                       |
| `address`           | `Address`                      | Même forme que `users/addresses`. |
| `socialLinks`       | `Record<string, string>`       | Ex. `{ instagram: "https://..." }`. |
| `maintenanceMode`   | `boolean`                      |
| `updatedAt`         | `Timestamp`                    |

**`settings/payment`**

| Champ                      | Type              | Description |
| ---------------------------- | ------------------- | ------------ |
| `enabledProviders`             | `string[]`           | Ex. `["moncash", "manual"]` — dépend de la décision PO §8. |
| `defaultProvider`              | `string`             | |
| `manualPaymentInstructions`    | `string \| null`     | Instructions affichées pour virement/dépôt manuel. |
| `preorderDepositPercentage`    | `number`             | |
| `updatedAt`                    | `Timestamp`          | |

> **Important** : ce document ne contient **aucun secret** (pas de clé API,
> pas de token). Les identifiants de connexion aux fournisseurs de paiement
> restent en variables d'environnement / secret manager, jamais en
> Firestore — cohérent avec `.env.example`.

**`settings/shipping`**

| Champ                        | Type                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `feesByRegionMinor`              | `Record<string, number>`                                     |
| `freeShippingThresholdMinor`     | `number \| null`                                              |
| `pickupLocations`                | `Array<{ id: string; name: string; address: Address }>`      |
| `deliveryMethods`                | `string[]`                                                    | Ex. `["pickup", "delivery"]`. |
| `updatedAt`                      | `Timestamp`                                                   |

**`settings/seo`**

| Champ                | Type              |
| ----------------------- | ------------------- |
| `defaultTitle`            | `string`             |
| `defaultDescription`     | `string`             |
| `defaultOgImageUrl`      | `string \| null`     |
| `robotsIndexable`        | `boolean`            |
| `updatedAt`              | `Timestamp`          |

**`settings/email`**

| Champ         | Type                                                     | Description |
| -------------- | ----------------------------------------------------------- | ------------ |
| `senderName`     | `string`                                                     | |
| `senderEmail`    | `string`                                                     | |
| `templates`      | `Record<string, { subject: string; enabled: boolean }>`     | Config par template (ex. `orderConfirmation`, `preorderReady`) — le contenu HTML/les identifiants SMTP ne vivent pas ici. |
| `updatedAt`      | `Timestamp`                                                  | |

**`settings/notifications`**

Configuration des **canaux** de notification de la boutique (à ne pas
confondre avec la collection `notifications`, qui contient les messages
effectivement envoyés à chaque utilisateur — voir §2.7).

| Champ                     | Type                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `channelsEnabled`             | `{ email: boolean; sms: boolean; whatsapp: boolean; push: boolean }`         |
| `adminAlertEmails`            | `string[]`                                                                    | Destinataires internes (nouvelle commande, stock bas, etc.). |
| `lowStockThresholdDefault`    | `number`                                                                      | Utilisé si `inventory.reorderThreshold` n'est pas défini pour une variante. |
| `updatedAt`                   | `Timestamp`                                                                   |

**`settings/security`**

| Champ                      | Type              |
| ----------------------------- | ------------------- |
| `allowedAdminIpRanges`          | `string[] \| null`   | Optionnel — restriction d'accès à l'admin par IP. |
| `sessionTimeoutMinutes`         | `number`             |
| `require2faForAdmin`            | `boolean`             |
| `updatedAt`                     | `Timestamp`           |

### 2.9 `inventory/{productId}_{variantId}`

**Nouvelle collection — source de vérité du stock.** Séparée de `products`
pour ne pas réécrire tout le document produit à chaque mouvement de stock
(réception, vente, ajustement manuel), et pour permettre des écritures
concurrentes fréquentes sans contention sur le document produit.

| Champ                | Type                | Description |
| ----------------------- | --------------------- | ------------ |
| `productId`               | `string`               | Référence `products/{productId}`. |
| `variantId`                | `string`               | Référence à `products.variants[].id`. |
| `sku`                      | `string`               | Dénormalisé depuis le variant pour lookup rapide. |
| `quantityOnHand`           | `number`               | Stock physique total. |
| `quantityReserved`         | `number`               | Réservé par des commandes `pending`/`confirmed` non encore décomptées définitivement. |
| `quantityAvailable`        | `number`               | Dénormalisé = `quantityOnHand - quantityReserved`, recalculé par Cloud Function à chaque écriture. Copié vers `products.variants[].stock`. |
| `reorderThreshold`         | `number`               | Seuil déclenchant une alerte de réassort. |
| `isLowStock`               | `boolean`               | Dénormalisé = `quantityAvailable <= reorderThreshold`, maintenu par Cloud Function (Firestore ne permet pas de comparer deux champs dans une requête — voir §6). |
| `warehouseLocation`        | `string \| null`        | `null` tant qu'un seul entrepôt est utilisé (voir décision PO §8). |
| `lastRestockedAt`          | `Timestamp \| null`    | |
| `updatedAt`                 | `Timestamp`             | |

### 2.10 `suppliers/{supplierId}`

**Nouvelle collection.**

| Champ          | Type              |
| ---------------- | ------------------- |
| `name`             | `string`             |
| `contactName`      | `string \| null`     |
| `email`             | `string \| null`     |
| `phone`             | `string \| null`     |
| `address`           | `Address \| null`    | Même forme que `users/addresses`. |
| `notes`             | `string \| null`     |
| `isActive`          | `boolean`             |
| `createdAt` / `updatedAt` | `Timestamp`     |

### 2.11 `incoming_shipments/{shipmentId}`

**Nouvelle collection.** Suit les commandes passées auprès des fournisseurs,
de la commande à la réception en stock.

| Champ            | Type                                                                                     | Description |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------ |
| `supplierId`         | `string`                                                                                       | Référence `suppliers/{supplierId}`. |
| `status`             | `'ordered' \| 'inTransit' \| 'received' \| 'cancelled'`                                       | |
| `items`              | `Array<{ productId: string; variantId: string; quantityOrdered: number; quantityReceived: number; unitCostMinor: number }>` | |
| `currency`           | `string`                                                                                       | |
| `totalCostMinor`     | `number`                                                                                       | |
| `orderedAt`          | `Timestamp`                                                                                     | |
| `expectedAt`         | `Timestamp \| null`                                                                             | |
| `receivedAt`         | `Timestamp \| null`                                                                             | |
| `notes`              | `string \| null`                                                                                | |
| `createdBy`          | `string`                                                                                        | `uid` staff/admin. |
| `createdAt` / `updatedAt` | `Timestamp`                                                                                 | |

Quand `status` passe à `received`, une Cloud Function incrémente
`inventory.quantityOnHand` pour chaque `item` — voir §9.

### 2.12 `collections/{collectionId}`

**Nouvelle collection** (regroupement marchand — voir note de vocabulaire §1).

| Champ         | Type                                                              | Description |
| -------------- | ---------------------------------------------------------------------- | ------------ |
| `name`           | `string`                                                                | |
| `slug`           | `string`                                                                | Unique, utilisé dans les URLs. |
| `description`    | `string \| null`                                                        | |
| `imageUrl`       | `string \| null`                                                        | |
| `type`           | `'manual' \| 'automatic'`                                              | |
| `productIds`     | `string[] \| null`                                                      | Rempli si `type === 'manual'`. Tableau embarqué — voir seuil de taille en §7. |
| `rules`          | `Array<{ field: string; operator: string; value: string }> \| null`    | Rempli si `type === 'automatic'` (ex. `tags contains "summer"`). Moteur de règles à définir — voir décision PO §8. |
| `isActive`       | `boolean`                                                               | |
| `position`       | `number`                                                                | Ordre d'affichage (ex. menu "Shop by collection"). |
| `createdBy`       | `string`                                                                | `uid` staff/admin. |
| `createdAt` / `updatedAt` | `Timestamp`                                                    | |

### 2.13 `promotions/{promotionId}`

**Nouvelle collection.** Remises **automatiques**, appliquées sans saisie
d'un code par le client (par opposition à `coupons`, §2.14).

| Champ         | Type                                                                          | Description |
| -------------- | ---------------------------------------------------------------------------------- | ------------ |
| `name`           | `string`                                                                            | Libellé interne. |
| `description`    | `string \| null`                                                                    | |
| `type`           | `'percentageOff' \| 'fixedAmountOff' \| 'buyXGetY' \| 'freeShipping'`              | Extensible — voir décision PO §8. |
| `value`          | `number \| null`                                                                    | Pourcentage (0–100) ou `amountMinor` selon `type`. |
| `appliesTo`      | `{ scope: 'allProducts' \| 'category' \| 'collection' \| 'products'; targetIds: string[] }` | Référence polymorphe vers `categories`, `collections` ou `products` selon `scope`. |
| `startAt` / `endAt` | `Timestamp`                                                                     | Fenêtre de validité. |
| `isActive`       | `boolean`                                                                            | |
| `combinable`     | `boolean`                                                                            | Peut être cumulée avec un coupon ou une autre promotion. |
| `priority`       | `number`                                                                             | Ordre de résolution si plusieurs promotions s'appliquent. |
| `createdBy`       | `string`                                                                             | `uid` staff/admin. |
| `createdAt` / `updatedAt` | `Timestamp`                                                                  | |

### 2.14 `coupons/{code}`

**Nouvelle collection.** L'ID de document est le **code normalisé**
(majuscules, sans espace, ex. `WELCOME10`) — garantit l'unicité du code sans
requête supplémentaire, même idiome que `users/{uid}`.

| Champ                | Type                                    | Description |
| ----------------------- | ------------------------------------------ | ------------ |
| `code`                    | `string`                                    | Dupliqué depuis l'ID de doc (export/lecture). |
| `description`             | `string \| null`                            | |
| `discountType`             | `'percentageOff' \| 'fixedAmountOff'`       | |
| `discountValue`            | `number`                                    | |
| `minPurchaseMinor`         | `number \| null`                            | |
| `maxDiscountMinor`         | `number \| null`                            | Plafond pour une remise en pourcentage. |
| `usageLimit`               | `number \| null`                            | Nombre total d'utilisations autorisées. |
| `usageCount`               | `number`                                    | Incrémenté **transactionnellement** à chaque utilisation. |
| `perUserLimit`             | `number \| null`                            | |
| `appliesTo`                | même forme que `promotions.appliesTo`, optionnel | |
| `startAt` / `endAt`        | `Timestamp`                                 | |
| `isActive`                 | `boolean`                                    | |
| `createdAt` / `updatedAt`   | `Timestamp`                                  | |

### 2.15 `banners/{bannerId}`

**Nouvelle collection.**

| Champ         | Type                                                                                 | Description |
| -------------- | ------------------------------------------------------------------------------------------ | ------------ |
| `title`          | `string`                                                                                    | |
| `imageUrl`       | `string`                                                                                    | |
| `linkUrl`        | `string \| null`                                                                            | URL interne ou externe, non contrainte en référence stricte. |
| `placement`      | `'homepageHero' \| 'homepageSecondary' \| 'catalogTop' \| 'checkoutSidebar'`               | Extensible. |
| `startAt` / `endAt` | `Timestamp \| null`                                                                       | Fenêtre d'affichage optionnelle. |
| `isActive`       | `boolean`                                                                                    | |
| `position`       | `number`                                                                                     | Ordre au sein d'un `placement`. |
| `createdBy`       | `string`                                                                                     | `uid` staff/admin. |
| `createdAt` / `updatedAt` | `Timestamp`                                                                            | |

### 2.16 `homepage/{sectionId}`

**Nouvelle collection.** Modélise la page d'accueil comme une liste ordonnée
de sections (mini-CMS), pour permettre à l'équipe boutique de la recomposer
sans déploiement de code.

| Champ         | Type                                                                                              | Description |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `type`           | `'heroBanner' \| 'featuredCollection' \| 'featuredProducts' \| 'promotionBanner' \| 'newsletterSignup'`  | |
| `position`       | `number`                                                                                                    | Ordre d'affichage. |
| `isActive`       | `boolean`                                                                                                    | |
| `config`         | forme dépendante de `type` (référence polymorphe, voir détail ci-dessous)                                  | |
| `updatedBy`       | `string`                                                                                                    | `uid` staff/admin. |
| `updatedAt`       | `Timestamp`                                                                                                  | |

Formes de `config` selon `type` :

| `type`                  | Forme de `config`                              |
| ------------------------- | ------------------------------------------------- |
| `heroBanner`                | `{ bannerId: string }`                              |
| `featuredCollection`        | `{ collectionId: string; title: string }`           |
| `featuredProducts`          | `{ productIds: string[]; title: string }`           |
| `promotionBanner`           | `{ promotionId: string }`                            |
| `newsletterSignup`          | `{ headline: string }`                               |

### 2.17 `analytics/{period}_{date}`

**Nouvelle collection.** Contient uniquement des **agrégats périodiques**
pré-calculés par une Cloud Function planifiée — **pas** d'événements bruts
(page vues, clics), qui doivent aller vers un outil dédié (GA4/BigQuery,
voir décision PO §8) pour rester dans l'esprit de la stratégie de coût de
lecture (§9).

| Champ           | Type                                                              | Description |
| ------------------ | ---------------------------------------------------------------------- | ------------ |
| `period`             | `'daily' \| 'monthly'`                                                 | |
| `date`               | `string`                                                                | `"2026-07-12"` (daily) ou `"2026-07"` (monthly) — cohérent avec l'ID de doc. |
| `metrics`             | `{ visits: number; orders: number; revenueMinor: number; newCustomers: number; conversionRate: number; averageOrderValueMinor: number }` | |
| `topProducts`         | `Array<{ productId: string; unitsSold: number }>`                       | Top N (ex. 10) — liste bornée, pas un classement complet. |
| `generatedAt`         | `Timestamp`                                                              | Horodatage du calcul. |
| `source`               | `'cloudFunctionRollup'`                                                  | Marque le document comme généré, jamais saisi manuellement. |

### 2.18 `audit_logs/{logId}`

**Nouvelle collection.** Journal **append-only** des actions sensibles
(changement de rôle, modification de prix, override de statut de commande,
création de coupon, etc.). Aucune modification ni suppression n'est permise
une fois un log écrit (voir §5).

| Champ         | Type                                    | Description |
| -------------- | ------------------------------------------ | ------------ |
| `actorId`        | `string`                                    | `uid` de l'auteur de l'action. |
| `actorRole`       | `'staff' \| 'admin' \| 'system'`            | `'system'` pour les changements initiés par une Cloud Function. |
| `action`          | `string`                                    | Ex. `"order.statusChanged"`, `"product.priceUpdated"`, `"user.roleChanged"`, `"coupon.created"`. |
| `targetType`       | `string`                                    | Ex. `"order"`, `"product"`, `"user"`, `"coupon"`. |
| `targetId`         | `string`                                    | |
| `before`           | `Record<string, unknown> \| null`           | Valeurs avant modification (champs modifiés uniquement). |
| `after`            | `Record<string, unknown> \| null`           | Valeurs après modification. |
| `ip`               | `string \| null`                            | Optionnel, si capturé côté serveur. |
| `createdAt`         | `Timestamp`                                 | |

## 3. Relations entre collections

```
users (1) ──< addresses (N)
users (1) ── carts (1)                [même uid, relation 1:1 par convention de clé]
users (1) ──< orders (N)               via orders.userId
users (1) ──< wishlists.items (N)      via wishlists/{uid}/items
users (1) ──< notifications.items (N)  via notifications/{uid}/items
users(staff/admin) (1) ──< audit_logs (N)  via auditLogs.actorId

categories (1) ──< products (N)        via products.categoryId
categories (N) ──< promotions (N)      relation polymorphe optionnelle, via appliesTo.scope == 'category'

products (1) ──< orders.items (N)      dénormalisé (snapshot), pas de FK vive
products (1) ──< wishlists.items (N)   via l'ID de doc de la sous-collection
products (1) ──< inventory (N)         via inventory.productId (+ variantId), un doc inventory par variante
products (N) ──< collections.productIds (N)  many-to-many, tableau d'IDs embarqué (ou sous-collection si volumineux — voir §7)
products (N) ──< promotions/coupons (N) relation polymorphe optionnelle, via appliesTo.scope == 'products'
products (N) ──< incoming_shipments.items (N) via incomingShipments.items[].productId

orders (1) ──< payments (N)            sous-collection
orders (N) ──> coupons (0..1)          via orders.appliedCouponCode
orders (N) ──> promotions (0..N)       via orders.appliedPromotionIds

suppliers (1) ──< incoming_shipments (N)  via incomingShipments.supplierId
incoming_shipments (1) ──▷ inventory (N)  pas de FK stricte : réception (status='received') incrémente inventory.quantityOnHand via Cloud Function

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

> ⚠️ **Incohérence à trancher (voir décision PO §8, point 7)** : les noms
> `incoming_shipments` et `audit_logs`, tels que fournis, utilisent le
> `snake_case` alors que toutes les autres collections de ce document
> suivent le `camelCase` (`incomingShipments`, `auditLogs`). Ils sont
> reproduits ici **tels que communiqués**, sans renommage automatique — à
> confirmer avant toute création réelle de collection.

## 5. Règles de sécurité proposées (stratégie, pas la version finale)

Principe général : **deny-by-default**, écritures sensibles réservées au
serveur (Admin SDK / Cloud Functions), le client Firestore n'ayant que des
permissions étroites et explicites. Pour toutes les collections listées
« Interdit (Admin SDK / staff) », **aucun rôle n'obtient de droit d'écriture
direct côté client** — même un compte `staff`/`admin` passe par une Server
Action ou une Cloud Function qui vérifie le rôle côté serveur avant
d'écrire avec l'Admin SDK (qui, lui, contourne les règles Firestore).

| Collection / sous-collection      | Lecture client                          | Écriture client |
| ------------------------------------ | ------------------------------------------ | ------------------ |
| `users/{uid}`                          | Propriétaire uniquement                     | Propriétaire, **sauf** le champ `role` (modifiable seulement via Admin SDK) |
| `users/{uid}/addresses/**`             | Propriétaire uniquement                     | Propriétaire |
| `categories/**`                        | Public                                      | Interdit (Admin SDK / staff) |
| `products/**`                          | Public, **si** `status == 'published'`      | Interdit (Admin SDK / staff) |
| `carts/{uid}`                          | Propriétaire uniquement                     | Propriétaire |
| `orders/{orderId}`                     | Propriétaire (`resource.data.userId == uid`) ou staff/admin | **Interdit** — création et changements de statut uniquement via Server Action / Cloud Function |
| `orders/{orderId}/payments/**`         | Propriétaire (lecture reçu) ou staff/admin  | Interdit — écrit uniquement par le webhook de paiement (Cloud Function) |
| `wishlists/{uid}/items/**`             | Propriétaire uniquement                     | Propriétaire |
| `notifications/{uid}/items/**`         | Propriétaire uniquement                     | Propriétaire, **seulement** le champ `read` — création serveur uniquement |
| `settings/store`                       | Public                                      | Interdit (Admin SDK) |
| `settings/shipping`                    | Public                                      | Interdit (Admin SDK) |
| `settings/seo`                         | Public                                      | Interdit (Admin SDK) |
| `settings/payment`                     | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `settings/email`                       | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `settings/notifications`               | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `settings/security`                    | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `inventory/**`                         | Staff/admin uniquement (niveaux de stock exacts et coûts non publics) | Interdit (Admin SDK / Cloud Function) |
| `suppliers/**`                         | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `incoming_shipments/**`                | Staff/admin uniquement                       | Interdit (Admin SDK) |
| `collections/**`                       | Public, **si** `isActive == true`            | Interdit (Admin SDK / staff) |
| `promotions/**`                        | Public, **si** `isActive == true`            | Interdit (Admin SDK / staff) |
| `coupons/{code}`                       | **Interdit** — un code n'est jamais lu/listé directement par le client ; validation via Cloud Function `validateCoupon` qui ne renvoie que le résultat (valide/montant), jamais le document brut | Interdit (Admin SDK) — `usageCount` incrémenté transactionnellement côté serveur |
| `banners/**`                           | Public, **si** `isActive == true`            | Interdit (Admin SDK / staff) |
| `homepage/**`                          | Public, **si** `isActive == true`            | Interdit (Admin SDK / staff) |
| `analytics/**`                         | Staff/admin uniquement                       | Interdit — écrit uniquement par la Cloud Function planifiée |
| `audit_logs/**`                        | **Admin uniquement** (plus restreint que staff) | **Interdit en toutes circonstances côté client** — écrit uniquement par le serveur/Cloud Functions ; aucune règle d'`update`/`delete`, même côté Admin SDK applicatif (log immuable) |

Ce tableau sera traduit en règles `firestore.rules` réelles une fois validé ;
le fichier actuel refuse tout accès client (voir `firestore.rules`).

## 6. Index composites recommandés

| Collection                | Champs indexés                                  | Requête servie |
| ---------------------------- | -------------------------------------------------- | ---------------- |
| `products`                     | `status ASC, categoryId ASC, createdAt DESC`        | Catalogue par catégorie, plus récents en premier |
| `products`                     | `status ASC, isPreorderable ASC, createdAt DESC`    | Liste des produits en pré-commande |
| `orders`                        | `userId ASC, createdAt DESC`                        | "Mes commandes" |
| `orders`                        | `status ASC, createdAt DESC`                        | File d'attente admin par statut |
| `orders`                        | `type ASC, status ASC, createdAt DESC`              | File d'attente pré-commandes admin |
| `notifications/{uid}/items`     | `read ASC, createdAt DESC`                          | Notifications non lues d'un utilisateur, triées |
| `inventory`                     | `isLowStock ASC, updatedAt DESC`                    | Tableau de bord "stock bas" — Firestore ne pouvant pas comparer deux champs (`quantityAvailable <= reorderThreshold`) dans une requête, `isLowStock` est dénormalisé et recalculé par Cloud Function à chaque écriture (voir §2.9). |
| `incoming_shipments`            | `supplierId ASC, status ASC, expectedAt ASC`        | Réceptions attendues par fournisseur |
| `incoming_shipments`            | `status ASC, expectedAt ASC`                        | File d'attente globale des réceptions |
| `collections`                   | `isActive ASC, position ASC`                        | Liste des collections actives, triées pour affichage |
| `promotions`                    | `isActive ASC, endAt ASC`                           | Promotions actives non expirées (à croiser côté serveur avec `startAt` — volume faible, filtrage en mémoire recommandé en alternative, voir §9) |
| `coupons`                       | `isActive ASC, endAt DESC`                          | Liste admin des coupons actifs |
| `banners`                       | `placement ASC, isActive ASC, position ASC`         | Bannières actives d'un emplacement donné, triées |
| `homepage`                      | `isActive ASC, position ASC`                        | Composition ordonnée de la page d'accueil |
| `analytics`                     | `period ASC, date ASC`                              | Séries temporelles pour les graphiques du tableau de bord |
| `audit_logs`                    | `targetType ASC, targetId ASC, createdAt DESC`      | Historique des actions sur une entité donnée |
| `audit_logs`                    | `actorId ASC, createdAt DESC`                       | Historique des actions d'un membre du staff/admin |

Les index simple-champ sont automatiques ; seuls les index composites
ci-dessus devront être déclarés dans `firestore.indexes.json` (actuellement
vide) une fois les requêtes confirmées. Les documents `settings/{domain}`,
`coupons/{code}` (lecture serveur) et `inventory/{productId}_{variantId}`
sont conçus pour être lus par `get()` direct sur un ID connu — aucun index
n'est requis pour ces accès.

## 7. Choix racine vs sous-collection vs tableau embarqué

| Donnée                     | Choix                     | Justification |
| ---------------------------- | --------------------------- | ---------------- |
| Variantes produit             | Tableau embarqué dans `products` | Nombre borné (quelques tailles/couleurs), toujours lu avec le produit — pas de gain à séparer. |
| Items du panier                | Tableau embarqué dans `carts` | Nombre borné (~dizaine max), lecture/écriture toujours globale au panier. |
| Historique de statut commande  | Tableau embarqué dans `orders` | Peu d'entrées (quelques transitions), toujours affiché avec la commande. |
| Adresses utilisateur           | Sous-collection              | Nombre variable, CRUD indépendant (ajout/suppression d'une adresse ne doit pas réécrire tout le profil). |
| Paiements de commande          | Sous-collection              | Écrit par un webhook externe de manière asynchrone et indépendante du doc `orders` — évite les conflits d'écriture concurrente. |
| Items de wishlist               | Sous-collection              | Ajout/suppression unitaire fréquent ; éviter les limites de taille de tableau et les conflits d'écriture concurrente sur un même document. |
| Notifications                   | Sous-collection              | Volume non borné dans le temps, écriture serveur fréquente, lecture paginée — inadapté à un tableau embarqué. |
| Stock (`inventory`)             | Collection racine            | Écritures fréquentes et concurrentes (vente, réception, ajustement) — isolé de `products` pour éviter la contention sur le document produit. |
| Réceptions fournisseur (`incoming_shipments`) | Collection racine | Cycle de vie indépendant du produit et du fournisseur, plusieurs `items` par réception — un tableau embarqué dans `suppliers` ou `products` serait mal placé (relation N:M). |
| Produits d'une collection marchande (`collections.productIds`) | Tableau embarqué | Nombre borné en pratique (quelques dizaines à ~500 produits). **Seuil indicatif** : au-delà de ~500 IDs ou si un besoin de métadonnée par association apparaît (ex. position spécifique dans la collection), migrer vers une sous-collection `collections/{id}/products/{productId}`. |
| Logs d'audit (`audit_logs`)     | Collection racine (jamais imbriquée sous l'entité concernée) | `targetType` varie (order, product, user, coupon...) — une collection unique permet à la fois "historique d'une entité" et "actions d'un acteur" sans dupliquer les logs dans plusieurs sous-collections. |
| Agrégats analytics (`analytics`) | Collection racine, un document par période | Peu de documents (365/an en daily), toujours accédés par plage de dates, jamais imbriqués sous une autre entité. |

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
7. **Convention de nommage** : conserver `incoming_shipments`/`audit_logs`
   en `snake_case` tel que fourni, ou les renommer en `incomingShipments`/
   `auditLogs` pour rester cohérent avec le reste du schéma (§4).
8. **Multi-entrepôt** : `inventory.warehouseLocation` doit-il gérer
   plusieurs emplacements dès le départ, ou un seul entrepôt suffit-il pour
   le lancement ?
9. **Moteur de règles des collections automatiques** (`collections.rules`) :
   quels critères doivent être supportés (tag, catégorie, plage de prix,
   combinaison) ?
10. **Types de promotions à supporter en priorité** (`promotions.type`) et
    règles de cumul avec les coupons (`combinable`).
11. **Portée de l'analytics** : les rollups agrégés dans Firestore
    (`analytics`) suffisent-ils pour le tableau de bord interne, ou une
    intégration GA4/BigQuery est-elle nécessaire pour l'analyse détaillée
    (entonnoir, comportement utilisateur) ?
12. **Politique de rétention des `audit_logs`** : durée de conservation,
    purge automatique ou archivage — impacte une éventuelle Cloud Function
    planifiée de nettoyage (à concevoir séparément, un log étant
    normalement immuable une fois écrit).
13. **Sécurité admin** (`settings/security`) : IP allowlisting et 2FA
    obligatoire pour les comptes admin dès le lancement, ou fonctionnalité
    différée ?

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
  notifications, `audit_logs`).
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
  `inventory`, créer une notification, écrire un `audit_logs`) passe par un
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
- **Logs d'audit asynchrones** : l'écriture dans `audit_logs` ne doit
  jamais bloquer la réponse à l'utilisateur — déclenchée en tâche de fond
  (trigger Firestore ou fire-and-forget côté Cloud Function) après
  l'opération principale.

## 10. Types TypeScript miroir

Une fois ce modèle validé, chaque table ci-dessus sera reproduite en type
TypeScript strict dans `types/` (ex. `types/product.ts`, `types/order.ts`,
`types/inventory.ts`, `types/promotion.ts`, `types/coupon.ts`, etc.),
utilisé à la fois par `services/`, les Server Actions et les Cloud Functions
(sous réserve de la décision de partage de code, voir
`docs/technical-recommendations.md`). Ces types ne sont **pas encore créés**
à ce stade du projet.
