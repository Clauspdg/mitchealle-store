# Passage en BSD pour le lancement aux Bahamas

Le code est prêt. Rien ne change sur un environnement existant tant que `settings/store.currency` n'est pas modifié : une boutique dont le document dit `HTG` continue de vendre en HTG.

## Règles en place

- Devise de référence : `BSD` (`config/currency.ts`), utilisée quand `settings/store` n'existe pas.
- Affichage : `B$1,234.50`. Les anciennes commandes gardent leur devise et leur affichage.
- Montants : unités mineures entières (cents).
- Chaque commande, sous-commande, paiement, retour vendeur et remboursement enregistre sa devise.
- Une commande se passe uniquement dans la devise de la boutique. Un produit dans une autre devise reste visible, mais il bloque le panier.
- Aucune conversion automatique, nulle part. Un coupon sans devise est lu comme un ancien coupon HTG.
- Les revenus du tableau de bord ne couvrent que la devise de la boutique ; les commandes dans une autre devise sont comptées à part.

## À faire au moment du passage

Ces étapes touchent les données de production : elles demandent une autorisation explicite.

1. Saisir les nouveaux prix BSD des produits, puis mettre `currency` à `BSD` sur chacun d'eux. Tant que ce n'est pas fait, le produit ne peut pas être commandé.
2. Saisir à nouveau les frais de livraison et le seuil de livraison gratuite : `settings/shipping` n'a pas de devise, et ses montants seraient lus tels quels en BSD.
3. Passer `settings/store.currency` à `BSD` dans l'administration (Paramètres, Régionalisation). Les étapes 1 à 3 doivent se faire dans la même fenêtre de maintenance.
4. Recréer les coupons à montant fixe ou à minimum d'achat, ou les enregistrer à nouveau : ils prennent alors la devise de la boutique. Les pourcentages sans minimum restent valables.
5. Fixer le taux de taxe (`settings/shipping.taxRatePercent`).

## À décider ou vérifier avant le lancement

- Paiement réel : confirmer auprès de Stripe et PayPal que le compte accepte le BSD. Le BSD ne semble pas faire partie des devises prises en charge par PayPal : à confirmer. Les flux de paiement réels n'ont pas été modifiés.
- Valeurs par défaut hors devise, inchangées : langue `fr`, fuseau `America/Port-au-Prince`, pays `Haïti`, exemple de téléphone `+509`.
- Valeur du stock de l'administration (`/admin/stock`) : toujours affichée en USD, à partir des coûts d'achat.
