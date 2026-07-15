# Sprint 2B — Inventory & Supply Chain Management — Rapport

> Périmètre respecté : aucune fonctionnalité de Commandes, Panier ou
> Paiements n'a été développée. Ce sprint couvre uniquement Stock,
> Fournisseurs, Arrivages, Journal des mouvements et le centre d'alertes
> demandé en complément.

## 1. Résumé

`docs/firestore-architecture.md` (révision validée) et
`docs/sprint-2A-report.md` ont été relus avant toute implémentation. Le
brief Sprint 2B introduisait plusieurs champs/statuts absents du modèle
validé (quantités en transit/endommagées, statuts d'arrivage étendus,
champs fournisseur supplémentaires) et une collection entièrement nouvelle
(`stockMovements`) : tout a été **documenté d'abord** (Révision 4 de
l'architecture), conformément à la consigne, avant d'écrire le moindre
code. Le détail des écarts et des décisions prises est en §3.1. Le reste du
sprint (CRUD des 3 modules, journal de mouvements, dashboard, centre
d'alertes, tests) a été livré et vérifié (compilation, lint, types, tests,
build).

## 2. Réalisé

### 2.1 Mise à jour de l'architecture (avant le code, comme demandé)

`docs/firestore-architecture.md` passe en **Révision 4** :

- **Résolution de l'incohérence de nommage** laissée en suspens depuis la
  révision 2 : `incoming_shipments` → `incomingShipments`,
  `audit_logs` → `auditLogs` (camelCase, cohérent avec le reste du schéma ;
  aucune donnée existante à migrer).
- `inventory` : ajout de `quantityInTransit` et `quantityDamaged` (4
  quantités tracées séparément, comme demandé) ; `warehouseLocation` fixé à
  un entrepôt unique (`"main"`) pour l'instant — résout la décision PO en
  suspens sur le multi-entrepôt ; clarification du cas des produits simples
  sans variante (`variantId = "default"`, nouvelle constante
  `DEFAULT_VARIANT_ID`).
- `suppliers` : ajout de `company`, `country`, `currency`, `paymentTerms`,
  `averageLeadTimeDays`.
- `incomingShipments` : statut étendu de 4 à 8 valeurs (Prévu → Annulé,
  comme spécifié) ; ajout de `reference` (généré via compteur
  transactionnel, même pattern que `orders.orderNumber`), `trackingNumber`,
  `carrier`.
- **Nouvelle collection** `stockMovements` — registre append-only, un champ
  `field` (`quantityOnHand`/`quantityReserved`/`quantityInTransit`/
  `quantityDamaged`) précise **laquelle** des 4 quantités a bougé, ce qui
  lève l'ambiguïté du brief ("Avant/Après" sans préciser quelle quantité).
- Nouvelle section §5.2 : règles métier d'inventaire documentées et
  appliquées (voir §2.6).
- Nouvelle section §11 : centre d'alertes — voir §2.7 pour le détail de ce
  qui est réellement calculé vs. proxy vs. non implémentable.
- Nouveaux index composites (§6), déployés dans `firestore.indexes.json`.

### 2.2 Module Inventory — complet

`services/firestore/inventory.ts` + `features/inventory/actions/inventory-actions.ts` :

- Consultation (`/admin/inventory`, recherche par SKU, filtre stock faible,
  tri, pagination par curseur).
- Ajustement manuel (`quantityOnHand` ou `quantityDamaged`), **motif
  obligatoire**, validé par Zod ET revérifié côté service.
- Réservation / Libération (`quantityReserved`), **refusée si elle rendrait
  le stock disponible négatif** — vérifié à l'intérieur de la transaction,
  sur une lecture fraîche (pas une lecture préalable qui pourrait être
  périmée).
- Entrée / Sortie de stock (`quantityOnHand`), sortie toujours justifiée.
- Historique des mouvements par variante (dialogue dédié).
- Alertes de stock faible (`isLowStock`, dénormalisé et recalculé à chaque
  écriture).

Chaque enregistrement contient bien : produit, variante, entrepôt, quantité
disponible (dénormalisée = onHand − reserved), réservée, en transit,
endommagée, seuil d'alerte, dernière mise à jour.

### 2.3 Module Suppliers — CRUD complet

`services/firestore/suppliers.ts` + fiche détaillée (`/admin/suppliers/{id}`)
affichant coordonnées, conditions commerciales et la liste de ses
arrivages. Tous les champs demandés sont présents (nom, société, contact,
téléphone, email, pays, adresse, devise, conditions de paiement, délai
moyen, statut, notes).

### 2.4 Module Incoming Shipments — suivi complet

`services/firestore/incoming-shipments.ts` : création (référence
auto-générée), 8 statuts avec machine à états restreignant les transitions
valides, réception partielle ou totale (dialogue de réception avec
quantité par ligne), mise à jour **automatique et transactionnelle** de
l'inventaire à la réception (voir §2.6). Détail de l'arrivage : produits
inclus, quantités attendues/reçues, transporteur, numéro de suivi, ETA,
date de réception.

### 2.5 Module Journal des mouvements — append-only

`stockMovements` : aucune Server Action d'`update`/`delete` n'existe pour
cette collection — seule `services/firestore/inventory.ts` y écrit, dans la
même transaction que la mise à jour `inventory` correspondante. Chaque
mouvement contient type, produit, variante, quantité avant/après, motif,
référence, utilisateur, date — consultable par variante (historique) ou
globalement filtré par type (dashboard), avec export CSV.

### 2.6 Règles métier appliquées

Extraites dans une fonction pure et testée (`validators/inventory.validator.ts#computeInventoryMutation`),
appelée par `services/firestore/inventory.ts` à l'intérieur de chaque
transaction :

- Stock disponible = stock physique − stock réservé, toujours recalculé,
  jamais stocké indépendamment.
- Une réservation ne peut jamais rendre le disponible négatif (vérifié
  contre une lecture fraîche dans la transaction).
- La réception d'un arrivage met à jour l'inventaire automatiquement et
  atomiquement (onHand +, inTransit −, `stockMovements` écrit, statut de
  l'arrivage recalculé).
- Tout ajustement exige un motif non vide.
- Toutes les écritures critiques (ajustement, réservation, libération,
  entrée, sortie, réception) passent par `adminDb.runTransaction()` — jamais
  un `update()` simple sur un champ quantité.

### 2.7 Centre d'alertes intelligentes (demande intégrée ce sprint)

`services/firestore/alerts.ts`, panneau sur `/admin/stock`. Sur les 5
alertes demandées :

| Alerte                                     | Statut                                                                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Stock critique                          | **Données réelles** (`inventory.isLowStock`)                                                                                                                                |
| 🟡 Arrivage en retard                      | **Données réelles** (`incomingShipments`, ETA dépassée)                                                                                                                     |
| 🟢 Arrivage reçu, prêt à la vente          | **Données réelles** (statut `received` récent)                                                                                                                              |
| 🟣 Forte demande, bientôt en rupture       | **Proxy documenté** (ratio réservé/physique — pas de vraies données de vente, module Commandes absent)                                                                      |
| 🔵 Précommandes dépassant le stock attendu | **Non implémenté** — nécessite un compteur de précommandes qui n'existe nulle part tant que Commandes/Panier ne sont pas construits (hors périmètre explicite de ce sprint) |

Les trois premières sont fiables dès aujourd'hui. La quatrième est
clairement étiquetée comme un indicateur proxy dans l'UI, pas présentée
comme une mesure de demande réelle. La cinquième a volontairement sa place
réservée dans le panneau ("à venir") plutôt que d'être simulée avec une
donnée inventée — afficher une fausse alerte aurait été moins honnête que
de documenter la dépendance manquante.

### 2.8 Dashboard Stock

`/admin/stock` : stock total, produits en rupture, stock faible, produits
en transit, arrivages à venir, valeur estimée du stock (`basePriceMinor ×
quantityOnHand`, avec avertissement si le calcul est tronqué au-delà de 500
enregistrements — voir §4), derniers mouvements (filtrable par type,
triable, exportable en CSV).

### 2.9 Architecture respectée

Next.js App Router, TypeScript strict, Server Actions, Firestore Services,
Zod, React Hook Form, Shadcn UI, Tailwind — comme prescrit. Aucun accès
Firestore dans un composant UI. `CursorPagination` (pagination par curseur)
a été promue de `features/catalog/` vers `components/shared/` dès qu'un
deuxième domaine (inventaire, arrivages) en a eu besoin — elle n'avait rien
de spécifique aux produits.

### 2.10 Qualité

| Vérification       | Résultat                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` | ✅ Aucune erreur                                                                                               |
| `npm run lint`     | ✅ 0 erreur (5 warnings bénins, même limitation React Compiler ↔ React Hook Form déjà documentée au Sprint 2A) |
| `npm run build`    | ✅ 20 routes compilées, y compris les 6 nouvelles pages admin                                                  |
| `npm run test`     | ✅ 16 fichiers, 67 tests passants                                                                              |

### 2.11 Tests unitaires ajoutés

`validators/inventory.validator.test.ts` (le plus important : couvre les
règles métier — refus de stock négatif, refus de réservation excédentaire,
calcul du disponible, seuil d'alerte), `schemas/inventory.schema.test.ts`,
`schemas/supplier.schema.test.ts`, `schemas/incoming-shipment.schema.test.ts`,
`types/inventory.test.ts` (`variantIdsOrDefault`). Comme au Sprint 2A,
volontairement pas de tests des services Firestore eux-mêmes contre un
vrai backend (nécessite l'émulateur) — la logique métier critique en a été
extraite précisément pour rester testable sans lui.

### 2.12 Documentation mise à jour

- `docs/firestore-architecture.md` (Révision 4, avant le code — voir §2.1).
- `docs/project-structure.md` : ajout de `features/inventory/`, des
  nouveaux services, de `validators/inventory.validator.ts`, de la
  promotion de `CursorPagination`, et de la règle "écritures d'inventaire
  toujours transactionnelles".
- `firestore.indexes.json` : 8 nouveaux index (inventory ×2,
  incomingShipments ×4, stockMovements ×2) correspondant au code livré.
- Ce rapport (`docs/sprint-2B-report.md`).

## 3. Ce qui reste à faire

### 3.1 Décisions prises sans validation PO explicite (à confirmer)

1. **Alerte 🟣 "forte demande"** : implémentée comme un indicateur proxy
   (ratio stock réservé / stock physique ≥ 50 %), faute de données de vente
   réelles. À remplacer par un vrai calcul de vélocité dès que le module
   Commandes existe — voir `docs/firestore-architecture.md` §8 point 14.
2. **Alerte 🔵 "précommandes dépassant le stock"** : non implémentée du
   tout (voir §2.7). L'emplacement existe dans l'UI, la logique attend le
   module Commandes.
3. **Entrepôt unique** (`warehouseLocation = "main"`) : résolution par
   défaut de la décision PO en suspens depuis la révision 2 — à confirmer
   avant d'introduire un vrai multi-entrepôt.
4. **Renommage `incomingShipments`/`auditLogs`** : résolu par défaut vers
   camelCase, cohérent avec le reste du schéma — à confirmer si un autre
   nom était réellement voulu (aucune donnée existante à migrer si un
   changement est encore souhaité).
5. **Motif d'ajustement en texte libre** (pas une liste fermée de motifs) —
   voir `docs/firestore-architecture.md` §8 point 16.
6. **Édition des lignes d'un arrivage après création** : le formulaire
   permet de modifier fournisseur/dates/notes/produits tant que l'arrivage
   n'est pas reçu, mais il n'y a pas d'écran "Modifier" séparé listé dans le
   brief — cohérent avec le choix fait pour Catégories/Collections au
   Sprint 2A (dialogue/formulaire réutilisé, pas de page dédiée
   supplémentaire non demandée).

### 3.2 Non fait, explicitement hors périmètre ou différé

- **Commandes, Panier, Paiements** — hors périmètre par consigne explicite.
- **Valeur estimée du stock à grande échelle** : le calcul scanne jusqu'à
  500 documents `inventory` (voir §4) ; au-delà, l'UI affiche un
  avertissement plutôt que de mentir sur la précision. Un rollup planifié
  (à la manière de la collection `analytics` déjà documentée) est la voie
  d'amélioration si ça devient un vrai problème de performance.
- **Multi-entrepôt réel** : le schéma l'anticipe (`warehouseLocation` reste
  une chaîne libre), mais aucune UI de gestion d'entrepôts n'existe — un
  seul entrepôt logique (`"main"`) est utilisé partout.
- **Moteur de règles pour `collections.rules`** — inchangé depuis le
  Sprint 2A, toujours en attente d'une décision PO.
- **Tests contre l'émulateur Firebase** — non fait, voir §2.11.

## 4. Problèmes rencontrés

- **Ambiguïté "Avant/Après"** : le brief demandait "Avant/Après" sans
  préciser laquelle des 4 quantités suivies. Résolu en ajoutant un champ
  `field` explicite à chaque `stockMovements`, qui indique sans ambiguïté
  quelle quantité (`quantityOnHand`, `quantityReserved`,
  `quantityInTransit` ou `quantityDamaged`) a changé — renforce la
  traçabilité au-delà du minimum demandé.
- **Produits sans variante** : `inventory`/`stockMovements` sont indexés
  par `{productId}_{variantId}`, mais un produit "simple" (Sprint 2A) n'a
  par définition aucune variante — donc aucun `variantId` naturel. Résolu
  par une constante `DEFAULT_VARIANT_ID = "default"` documentée dans
  l'architecture (§2.9) avant d'écrire le code du sélecteur produit/variante.
- **`Query.aggregate()` de l'Admin SDK** : utilisé pour sommer
  `quantityOnHand` sans lire tous les documents un par un
  (`AggregateField.sum(...)`) — fonctionne, mais Firestore n'a pas
  d'agrégat "valeur" prêt à l'emploi ; la valeur estimée du stock reste le
  seul indicateur du dashboard qui nécessite un scan borné plutôt qu'un
  agrégat pur (voir §3.2).
- **Composition `DialogTrigger` + `Tooltip`** : une première version des
  boutons d'action de la ligne d'inventaire enveloppait chaque bouton dans
  un `Tooltip`, puis passait ce `Tooltip` comme `trigger` d'un `Dialog` —
  ne fonctionne pas avec le pattern `render={element}` de Base UI, qui clone
  un seul élément natif et fusionne ses props dessus (pas une compositions
  à plusieurs éléments). Corrigé en gardant un simple `<Button>` avec
  `aria-label`/`title` comme déclencheur, sans `Tooltip` visuel.
- **`CursorPagination` dupliquée en germe** : le composant de pagination
  écrit au Sprint 2A (`ProductsPagination`) n'avait rien de spécifique aux
  produits ; plutôt que d'en écrire une copie quasi identique pour
  l'inventaire et les arrivages, il a été renommé et déplacé vers
  `components/shared/` — corrige une petite violation de la règle "un
  composant transverse ne dépend jamais d'une feature" qui aurait sinon dû
  se produire pour l'importer depuis `features/catalog/`.

## 5. Vérifications effectuées

| Commande           | Résultat                                                              |
| ------------------ | --------------------------------------------------------------------- |
| `npx tsc --noEmit` | ✅ Aucune erreur                                                      |
| `npm run lint`     | ✅ 0 erreur, 5 warnings bénins (React Compiler ↔ RHF, déjà documenté) |
| `npm run build`    | ✅ 20 routes compilées                                                |
| `npm run test`     | ✅ 16 fichiers, 67 tests passants                                     |

## 6. Recommandations avant Sprint 2C

1. **Valider les 6 décisions du §3.1**, en particulier l'entrepôt unique et
   le renommage `incomingShipments`/`auditLogs`.
2. **Déployer les index** : `firebase deploy --only firestore:indexes`
   avant tout trafic réel sur un projet Firebase connecté.
3. **Décider du prochain module** (Sprint 2C) — le Panier ou les Commandes
   sont les candidats naturels maintenant que Catalogue et Stock existent ;
   leur construction débloquera aussi les alertes 🟣/🔵 encore incomplètes.
4. Envisager le module d'audit transverse (`auditLogs`) toujours en
   attente depuis le Sprint 1, avant d'empiler encore plus d'actions admin
   sans traçabilité au niveau "qui a fait quoi" (distinct du journal de
   mouvements de stock, qui lui existe désormais).

Aucun autre sprint ne sera démarré sans votre validation explicite.
