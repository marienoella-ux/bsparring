# B-Sparring — Charte graphique pour le développement

Ce dossier contient la charte complète à appliquer à la plateforme B-Sparring (voir le brief technique V1).

## Contenu

| Fichier | Rôle |
| --- | --- |
| `charte-graphique.md` | Le guide de marque : voix et ton, couleurs, typographie, espacements, formes, logo, iconographie, accessibilité. À lire en premier. |
| `tokens.json` | Source de vérité des valeurs (couleurs thème clair et sombre, typographies, espacements, rayons, ombre). |
| `tokens.css` | Les mêmes valeurs en variables CSS prêtes à l'emploi + classes de texte (`.text-h1`, `.text-body`…). Thème sombre automatique, ou forcé avec `data-theme="dark"`. |
| `logos/` | Symbole en SVG : couleur (fonds clairs), forêt (monochrome), sable (fonds sombres). |
| `composants-reference/` | Règles d'usage des composants clés (bouton, badge de statut, champ, carte, solde de crédits, logo) et une feuille de styles de référence. |

## Règles à respecter

- Ne jamais coder une couleur en dur : toujours passer par les variables (`var(--foret)`, `var(--surface)`…).
- Typographies : Fraunces (titres) et Source Sans 3 (texte), Google Fonts, graisses 400 et 600 uniquement.
- Mobile d'abord ; cibles tactiles de 44 px minimum ; texte courant jamais sous 16 px.
- Une seule action principale (`--foret`) par écran ; le cuivre n'est jamais un bouton.
- Focus clavier : contour plein 2 px `var(--focus)`, décalé de 2 px.
- Les statuts de dilemme (badges) portent toujours un mot, pas seulement une couleur.

La feuille `composants-reference/styles-reference.css` montre l'intention visuelle : Dev peut la réécrire dans la stack choisie, tant que les valeurs viennent des tokens.
