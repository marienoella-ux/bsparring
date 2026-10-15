# B-Sparring — Lot 2 : crédits, packs et paiement manuel

## Ce que fait le lot 2

- **Achat** (dirigeant, `/espace/credits`) : choix du pack, avec le prix par session mis en avant et le total en second ; instructions de paiement selon l'opérateur ; déclaration de la référence de transaction.
- **Validation** (admin, `/admin/paiements`) : file des paiements à valider, la plus ancienne en premier, avec une alerte au-delà de 24 h. On valide, ou on refuse avec un motif obligatoire. Un onglet donne l'historique.
- **Crédits** (admin, `/admin/credits`) : ajustement motivé, soldes de chaque dirigeant, journal des mouvements.
- **Paramètres** (admin, `/admin/parametres`) : packs et prix, numéro et bénéficiaire de chaque opérateur, offre Pionniers (compteur, limite), validité des crédits, seuil d'annulation, délai affiché, équivalent en euros.

## Règles appliquées par la base

| Règle | Valeur de départ |
| --- | --- |
| 1 crédit = 1 session (visio ou sparring écrit) | — |
| Validité d'un lot | 12 mois à partir de l'achat (paramètre, entre 6 et 12) |
| Ordre de consommation | Le lot qui expire le plus tôt d'abord |
| Annulation | Crédit restitué plus de 24 h avant la session ; consommé sinon (paramètre) |
| Crédits ajoutés | Uniquement à la validation par l'admin (puis par webhook vérifié au lot 5), jamais à la déclaration |
| Référence de transaction | Unique (espaces et casse ignorés) ; réutilisable seulement après un refus |
| Paiements en attente | 3 au plus par dirigeant |
| Offre Pionniers | +1 crédit à la validation d'un pack éligible (Pack 5), une fois par dirigeant, 10 places ; se désactive seule à la 10e. Le crédit offert expire avec le lot du pack. |
| Équivalent en euros | Désactivé par défaut ; parité fixe 1 € = 655,957 FCFA ; le paiement reste en FCFA |
| Journal des crédits | Immuable : ni modification ni suppression, même par un admin |

## Mise en place sur le projet de test

### 1. Appliquer la migration

Dans Supabase → **SQL Editor → New query**, coller puis exécuter, dans l'ordre, les fichiers fournis par Dev (chacun en une seule transaction) :

1. `20261015000001_credits` : schéma des crédits, packs et paiements.
2. `20261015000002_moyens_paiement` : numéros et bénéficiaires de départ.

### 2. Planifier l'expiration quotidienne

Le solde affiché exclut déjà les lots expirés. Le job inscrit l'expiration au journal et remet les restants à zéro.

1. Supabase → **Database → Extensions** : activer **pg_cron**.
2. **SQL Editor** :

```sql
select cron.schedule(
  'expiration-credits',
  '0 5 * * *',               -- 5 h UTC = 6 h à Douala
  $$select public.expire_credit_lots()$$
);
```

L'alerte par email 30 jours avant expiration arrive avec les notifications du lot 4. D'ici là, « Mon espace » affiche « Attention » quand un lot expire dans moins de 30 jours.

### 3. Moyens de paiement

La migration `20261015000002_moyens_paiement` renseigne les valeurs de départ :

| Opérateur | Numéro | Bénéficiaire affiché | État |
| --- | --- | --- | --- |
| Orange Money (#150#) | +237 6 59 98 99 10 | Marie Noella Tetka | Actif |
| MTN Mobile Money (*126#) | +237 6 78 81 26 69 | À confirmer | Inactif |

Pour activer MTN, ou pour passer plus tard à un compte marchand Brainiacs, allez dans le back-office, **Paramètres → Moyens de paiement**. Modifiez le numéro et le bénéficiaire, cochez « Proposé aux dirigeants », puis enregistrez. Le changement s'applique aux déclarations suivantes : chaque paiement garde le numéro affiché au moment de sa déclaration. Un moyen de paiement ne peut pas être activé sans numéro ni bénéficiaire.

Quand plusieurs opérateurs sont actifs, le dirigeant choisit le sien et voit les instructions correspondantes.

## Critères d'acceptation du lot 2

1. **Un paiement manuel validé crédite le compte** : un dirigeant choisit le Pack 5 et déclare une référence ; son solde reste à 0 avec le badge « En vérification ». L'admin valide : le solde passe à 6 (5 + 1 Pionniers).
2. **Le solde est juste après achat, réservation et annulation** : vérifié par les tests automatiques (`npm run test:db`, fichier `supabase/tests/02_credits.test.sql`). La réservation et l'annulation s'utiliseront depuis l'écran de soumission d'un dilemme, au lot 3.
3. **Refus** : l'admin refuse avec un motif ; le dirigeant voit « Paiement refusé » et le motif ; aucun crédit n'est ajouté.
4. **Ajustement** : l'admin ajoute ou retire des crédits avec un motif ; le mouvement apparaît au journal.
