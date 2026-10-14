# Button

Le bouton déclenche une action ; son libellé commence par un verbe, à l'infinitif ou à l'impératif, en minuscules après la première lettre : « Soumettre mon dilemme », « Acheter des crédits ».

- **primary** (`foret`) : l'action pour laquelle l'écran existe, une seule par écran.
- **secondary** (contour `line-strong`, texte `foret`) : actions d'appoint (« Voir les packs », « Recharger »).
- **quiet** (texte souligné) : retour, annulation, actions mineures.
- Hauteur minimale 44 px (cible tactile mobile) ; `size="sm"` (36 px) seulement dans une carte ou un tableau.
- Sur mobile, le bouton principal d'un formulaire prend toute la largeur (`block`).
- Pas de bouton cuivre : le cuivre n'est jamais une action.

Le consommateur fournit : le libellé en `children`, `onClick`, et `disabled` pendant un envoi.
