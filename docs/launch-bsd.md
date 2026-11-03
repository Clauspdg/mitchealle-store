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

6. Passer aussi `settings/store` aux valeurs Bahamas dans la même page : langue `en`, fuseau `America/Nassau`, pays `Bahamas`. Ces valeurs par défaut ne s'appliquent qu'à une boutique sans document enregistré.
7. Renseigner la devise du coût sur les produits qui ont un coût (fiche produit, Tarification). Sans elle, le coût reste hors de la valeur du stock.

## Région Bahamas

- Les valeurs de lancement sont dans `config/region.ts` : pays `BS`, fuseau `America/Nassau`, langue `en`, indicatif `+1 242`.
- Dates : toutes les dates affichées et les jours du tableau de bord suivent le fuseau de Nassau. Le champ « Fuseau horaire » de l'administration est enregistré, mais l'affichage ne le lit pas.
- Adresses : le pays par défaut est `BS`. Le formulaire demande alors l'île, la localité, la rue et un repère, et une boîte postale facultative. Les autres pays restent disponibles et gardent leurs libellés. Les adresses enregistrées ne changent pas.
- Comptes : les nouveaux comptes reçoivent la préférence `en-BS`. Les comptes existants gardent la leur.

## Limite importante : la langue

L'interface n'a aucun système de traduction : tout le texte est écrit en français dans le code. La valeur `en` est enregistrée, mais le site reste affiché en français, et `<html lang="fr">` reste en place parce qu'il décrit le contenu réel. L'anglais par défaut, le français au choix et le créole demandent un chantier de traduction séparé.

## Valeur du stock

- Elle est calculée à partir du coût des produits, plus du prix de vente.
- Chaque coût a sa propre devise (`costCurrency`). La devise de vente d'un produit ne dit rien de celle de son coût.
- La carte affiche uniquement les coûts dans la devise de la boutique. Les autres devises sont listées à part, ni converties ni additionnées. Les coûts sans devise et les produits sans coût sont comptés dans un avertissement.

## Remboursements

- Un retour rembourse uniquement les unités retournées, y compris sur une commande uniquement maison.
- Quand toutes les unités d'une commande maison sont revenues, la commande passe à `refunded` et le dernier retour rend aussi ce que les lignes ne portent pas : livraison et taxe des anciennes commandes.
- Le total des remboursements dus ou effectués ne dépasse jamais `totalMinor`.
- Commandes anciennes : leur remise est répartie sur les lignes au moment du calcul, sans rien enregistrer. Leur taxe n'est pas répartie : un retour partiel ne la rend pas, seule la clôture de la commande la rend.
- Les retours déjà en cours au moment de la mise en production reçoivent leur remboursement à la réception.

## À décider ou vérifier avant le lancement

- Paiement réel : confirmer auprès de Stripe et PayPal que le compte accepte le BSD. Le BSD ne semble pas faire partie des devises prises en charge par PayPal : à confirmer. Les flux de paiement réels n'ont pas été modifiés.
- Précommandes : `createOrderFromCart` n'en crée pas, mais une ancienne commande de type `preorder` dont seul l'acompte a été payé n'est pas distinguée : le plafond reste `totalMinor`.
