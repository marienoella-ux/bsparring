B-Sparring est le sparring partner stratégique des dirigeants isolés, un actif de Brainiacs. La marque doit donner la sensation d'entrer dans un **cercle de confiance** : sobre, chaleureux, discret, sérieux sans être froid. On y vient pour être challengé par des pairs exigeants, dans un lieu où rien ne fuit.

Trois mots guident chaque choix : **discret, chaleureux, décisif**.

## Voix et ton

- Vouvoyer toujours. Parler au dirigeant comme un pair expérimenté, jamais comme un coach ou un vendeur.
- Phrases courtes, verbes d'action, une idée par phrase. Le français d'abord ; l'anglais pour les contenus panafricains.
- Nommer la décision, pas l'émotion : « Votre décision : ouvrir Douala avant Abidjan » plutôt que « Vous vous sentez bloqué ? ».
- Pas d'emoji, pas de points d'exclamation, pas de superlatifs (« révolutionnaire », « le meilleur »).
- Vocabulaire maison : *dilemme*, *session*, *sparring écrit*, *round*, *livrable de décision*, *crédit*, *facilitatrice / facilitateur*, *expert*. Éviter : *coaching*, *mentorat*, *consultation*, *client* (dire *dirigeant*).

| Faire | Ne pas faire |
| --- | --- |
| Ne décidez plus seul. | Boostez votre leadership ! |
| Votre dilemme a été transmis. Un expert vous sera proposé sous 48 h. | Super ! On s'occupe de tout 🚀 |
| Où en êtes-vous sur la décision d'ouvrir Douala ? | Comment ça va depuis la dernière fois ? |
| Ce que vous partagez reste ici. | Vos données sont protégées par une sécurité de pointe. |

## Couleurs

- `surface` (sable) est le fond de toute la plateforme, des emails et des livrables. Poser les cartes et formulaires sur `surface-raised`.
- `foret` est la couleur de marque : actions principales, liens (`link`), étapes actives. Texte sur `foret` : `on-foret`.
- `cuivre` est un accent rare, la chaleur de la marque : la *prochaine étape* d'un livrable, le surtitre des cartes, le focus clavier (`focus`), la lentille du logo. Jamais pour un bouton, jamais sur plus d'un élément par écran.
- `nuit` porte les bandeaux profonds : en-tête de la landing page, pied de page, couverture du livrable. Texte et logo en `on-nuit`.
- `foret-soft` est réservé aux messages de confiance (carte `trust`) et à l'étape en cours.
- Statuts : `info`, `success`, `warning`, `danger`, chacun avec son fond `-soft`, toujours accompagnés d'un mot.
- Proportions d'un écran : environ 70 % `surface`, 20 % `surface-raised` et `ink`, 8 % `foret`, 2 % `cuivre`.
- Thème sombre : mêmes noms de tokens ; ne jamais coder de valeur en dur.

## Typographie

- Deux familles Google Fonts, à charger avec ces graisses seulement (pages légères, réseau 3G) : **Fraunces** 400, 400 italique, 600 (`--font-serif`) et **Source Sans 3** 400, 600 (`--font-sans`).
- Fraunces pour les titres (`display`, `h1`, `h2`) et pour citer la décision à trancher (`quote`). Source Sans 3 pour tout le reste (`body-lg`, `body`, `label`, `caption`, `overline`).
- `display` une fois par écran au plus. Les chiffres clés (solde de crédits, compteurs) en Fraunces 600 `foret`.
- Texte courant jamais sous 16 px sur mobile ; `caption` (13 px) seulement pour les métadonnées.
- Capitales réservées à `overline`. Pas d'italique en dehors de `quote`.

## Espacements et mise en page

- Grille de 4 px : `space-1` à `space-16`.
- Mobile d'abord : marge latérale `space-4`, colonne unique, bouton principal pleine largeur en bas des formulaires.
- Écran large : contenu centré, 720 px de large pour la lecture, 1120 px pour le back-office.
- Respirer : `space-12` entre sections, `space-16` sur la landing page. Peu d'éléments par écran ; la sobriété fait partie de la promesse.

## Formes, filets et profondeur

- Rayons : `radius-md` pour boutons et champs, `radius-lg` pour cartes et panneaux, `radius-sm` pour badges, `radius-full` pour les pastilles.
- Délimiter par des filets (`line`), pas par des ombres. Une seule ombre, `shadow-float`, pour ce qui flotte (menus, modales, feuilles mobiles).
- Pas de dégradés, pas de verre dépoli, pas de bordure colorée sur le côté des cartes.
- Motif de marque : des cercles qui se chevauchent, en filet `foret` ou en aplats `foret-soft`, pour les visuels de communication et la couverture du livrable. Jamais derrière du texte courant.

## Logo

- Utiliser le composant `Logo` (symbole + « B-Sparring » + « by Brainiacs ») ou les fichiers du groupe Logos.
- Couleurs autorisées : symbole `foret` avec lentille `cuivre` sur fond clair ; tout en `on-nuit` sur `nuit`.
- La signature « by Brainiacs » accompagne toujours le nom ; seul le symbole seul (favicon, avatar WhatsApp) s'en passe.
- Zone de protection : la hauteur de la lentille. Taille minimale : 120 px pour la version complète, 24 px pour le symbole.
- Écrire « B-Sparring » : B majuscule, trait d'union, S majuscule.

## Iconographie

- Icônes au trait, coins arrondis, épaisseur 1,75 px, à 20 ou 24 px, en `ink` ou `foret`. Recommandation : la bibliothèque Lucide, qui correspond à ce style.
- Une icône accompagne un mot, elle ne le remplace pas (sauf fermer, menu, retour).
- Pas d'emoji dans l'interface, les emails ni les livrables.

## Imagerie

- Privilégier l'absence d'image à une image générique : le motif de cercles et les aplats suffisent.
- Si photo : dirigeantes et dirigeants africains réels, en situation de réflexion ou d'échange, lumière naturelle, tons chauds, jamais de poignée de main ni de sourire face caméra de banque d'images.
- Aucune photo d'un client réel sans son accord écrit : la discrétion est la promesse.

## Applications

- **Livrable de décision (PDF)** : couverture `nuit` avec le logo en `on-nuit` ; décision à trancher en `quote` ; grille et risques en tableaux à filets `line` ; la *prochaine étape* dans un encadré `cuivre-soft` avec surtitre `cuivre`. Mention « Confidentiel — destiné à [nom du dirigeant] » en pied de page.
- **Emails** : fond `surface`, logo en tête, un seul bouton `foret`, aucun contenu du dilemme (un lien vers la plateforme seulement).
- **WhatsApp et réseaux** : symbole seul en avatar ; visuels sur `nuit` ou `surface` avec le motif de cercles.

## Accessibilité

- Tout texte atteint au moins 4,5:1 sur les fonds indiqués dans la note de son token, dans les deux thèmes ; bordures de contrôle (`line-strong`) et focus (`focus`) au moins 3:1.
- Focus clavier : contour plein de 2 px en `focus`, décalé de 2 px, sur tout élément interactif.
- Cibles tactiles de 44 px minimum. Les statuts portent toujours un mot.
