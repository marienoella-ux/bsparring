# Field

Le champ de formulaire réunit libellé, saisie et message d'aide ou d'erreur.

- Libellé toujours visible au-dessus du champ, jamais remplacé par le placeholder.
- Le placeholder donne un exemple concret (« Ex. : faut-il ouvrir une agence à Douala cette année ? »), pas une consigne.
- L'aide (`hint`) dit à quoi sert le champ ou le format attendu ; l'erreur (`error`) dit comment corriger, en une phrase.
- Marquer les champs facultatifs (`optional`) plutôt que les obligatoires.
- Texte saisi en 16 px minimum : en dessous, les téléphones zooment.
- `multiline` pour le contexte, les options et les enjeux du dilemme.

Le consommateur fournit : `label`, `id` stable, la valeur et la validation.
