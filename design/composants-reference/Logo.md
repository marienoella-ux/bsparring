# Logo

Le logotype B-Sparring : deux cercles qui se chevauchent (deux regards sur une même décision) et, à leur intersection, une lentille cuivre (le point où la décision se tranche).

- **Version complète** (`Logo`) : symbole + « B-Sparring » en Fraunces 600 + signature « by Brainiacs ». À utiliser par défaut : en-tête, landing page, emails, couverture du livrable.
- **Symbole seul** (`markOnly`) : favicon, icône d'application, avatar WhatsApp, filigrane du livrable. Jamais sous 24 px.
- **Sur `nuit` ou une photo sombre** : passer `accent={false}` dans un conteneur `bs-on-nuit` ; tout le logo passe en `on-nuit`, la lentille cuivre disparaît.
- Zone de protection : la hauteur de la lentille tout autour. Taille minimale de la version complète : 120 px de large.
- Ne jamais : changer les couleurs hors `foret` / `cuivre` / `on-nuit`, ajouter un contour ou une ombre, séparer « by Brainiacs » du nom sauf en version symbole seul, écrire « B Sparring », « Bsparring » ou « B-sparring ».

Le consommateur fournit : `size` (hauteur du symbole en px, 40 par défaut), et le conteneur de fond.
