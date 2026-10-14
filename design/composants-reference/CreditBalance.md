# CreditBalance

Le solde de crédits du dirigeant, en tête de « Mon espace » : le nombre, sa date de validité et l'action de recharge.

- Le chiffre en Fraunces `foret`, grand : c'est la première information de l'écran.
- La date affichée est celle du lot qui expire le plus tôt.
- `expiringSoon` (moins de 30 jours) passe la date en `warning` avec le mot « Attention ».
- À zéro crédit, le bouton devient principal (« Acheter des crédits ») ; sinon secondaire (« Recharger »).
- Les montants en FCFA n'apparaissent pas ici, seulement sur l'écran d'achat.

Le consommateur fournit : `credits`, `expiresOn` (déjà formaté, ex. « 14 avril 2027 »), `expiringSoon`, `onBuy`.
