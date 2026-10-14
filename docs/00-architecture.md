# B-Sparring — Lot 0 : proposition d'architecture

Statut : **proposition à valider par Brainiacs**. Aucun code applicatif n'est écrit avant validation.

Ce document répond à la section « Choix techniques laissés à Dev » du brief technique V1. Il couvre la stack, l'hébergement, le schéma de base, la gestion des rôles, l'intégration du paiement, les notifications et les jobs planifiés.

---

## 1. Stack recommandée

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Application web | **Next.js** (React, TypeScript), rendu serveur | Un seul projet pour la landing, l'espace dirigeant, l'espace expert et le back-office. C'est le framework le mieux connu des assistants IA, ce qui facilite la maintenance par une équipe non développeuse. Le rendu serveur garde des pages légères en 3G. |
| Base de données | **PostgreSQL via Supabase** | Le contrôle d'accès se fait **dans la base** (Row Level Security) : même un bug d'interface ne peut pas exposer un dilemme non assigné. |
| Authentification | **Supabase Auth** (email + mot de passe, lien magique) | Intégré à la sécurité de la base. Le téléphone WhatsApp est stocké mais pas utilisé pour la connexion en V1. |
| Fichiers | **Supabase Storage**, buckets privés | Pièces jointes, notes vocales et PDF de livrables, accessibles seulement par liens signés de courte durée (5 min). |
| Jobs planifiés | **pg_cron** (dans la base) qui appelle une route serveur protégée | Job quotidien pour les relances J+15 / J+22, les expirations et les alertes ; job toutes les 15 min pour les rappels J-1 / H-1 et les délais de rounds. |
| PDF | **@react-pdf/renderer**, côté serveur | Le livrable est mis en page avec la charte (couverture `nuit`, Fraunces, encadré cuivre). Pas de navigateur headless, donc compatible avec un hébergement léger. |
| Emails | **Resend** (ou Brevo) via une couche `NotificationChannel` | Gabarits aux couleurs de la charte. Le canal WhatsApp s'ajoutera derrière la même interface. |
| Styles | CSS natif + les `tokens.css` de la charte | Aucune couleur codée en dur, thème sombre gratuit, pas de framework CSS lourd. |
| Icônes | Lucide | Recommandé par la charte. |
| Textes | Fichiers de traduction (`fr.json`) | Interface en français, anglais ajoutable sans toucher au code. |
| Tests | Vitest (règles métier : crédits, statuts) + Playwright (parcours clés) | Les règles de crédit sont l'endroit où une erreur coûte de l'argent. |

### Alternatives écartées

- **Laravel / Django** : solides, mais l'hébergement et la sécurité au niveau des données demandent plus de travail manuel.
- **No-code (Bubble, Softr…)** : cloisonnement des données trop faible pour la promesse de confidentialité, webhooks et PDF limités.

---

## 2. Hébergement et environnements

| Élément | Choix | Coût de départ estimé |
| --- | --- | --- |
| Application | Vercel (plan Pro, requis pour un usage commercial) | ~20 $/mois |
| Base + Auth + Storage | Supabase (Pro pour la production, gratuit pour le test) | ~25 $/mois |
| Emails | Resend (3 000 emails/mois gratuits) | 0 $ au départ |
| Domaine | `sparring.brainiacscompany.com` (CNAME vers Vercel) | — |

**Total : environ 45 $/mois** (≈ 27 000 FCFA) pour la production.

- **Deux environnements séparés** : `test` (branche `develop`, projet Supabase de test, URL de prévisualisation) et `production` (branche `main`, projet Supabase de production). Les données ne sont jamais partagées entre les deux.
- **Région** : Supabase n'a pas de région en Afrique. Nous proposons l'Europe (Francfort ou Paris), qui offre la meilleure latence depuis Douala parmi les régions disponibles.
- **Chiffrement** : HTTPS partout ; chiffrement au repos assuré par Supabase (AES-256).
- **Sauvegardes** : quotidiennes (incluses dans Supabase Pro).

---

## 3. Rôles et contrôle d'accès

Un utilisateur peut porter **plusieurs rôles** (table `user_roles`) : Nono peut être à la fois `admin` et `facilitateur`.

| Rôle | Ce que la base lui laisse lire |
| --- | --- |
| `dirigeant` | Ses propres dilemmes, sessions, livrables, crédits et paiements. |
| `expert` | Les sessions où il est l'expert assigné. **Avant acceptation** : un résumé du dilemme, sans identité du dirigeant (vue dédiée). Jamais les paiements. |
| `facilitateur` | Les sessions où il est le facilitateur assigné. Jamais les paramètres financiers globaux. |
| `admin` | Tout. |

Principes :

1. Chaque table sensible a des politiques Row Level Security. Une requête qui ne passe pas la politique renvoie **zéro ligne**, quelle que soit l'interface.
2. Les opérations sensibles (consommer un crédit, changer un statut, valider un paiement) passent par des **fonctions SQL** qui vérifient les droits et écrivent le journal dans la même transaction.
3. Un **journal d'audit** enregistre chaque consultation d'un dilemme ou d'un livrable (qui, quoi, quand).
4. **Suppression de compte** sur demande : une fonction admin efface les données personnelles et anonymise ce qui doit rester pour la comptabilité (paiements, mouvements de crédit).

---

## 4. Schéma de base

Les noms de tables sont en anglais (convention technique) ; tous les textes affichés sont en français.

```
organizations ─┐
               ├─< profiles >── user_roles
               │      │
               │      ├── expert_profiles ──< expert_conflicts >── organizations
               │      ├── expert_availabilities
               │      │
               │      ├─< payments >── packs
               │      ├─< credit_lots >──< credit_movements
               │      ├─< diagnostics
               │      │
               │      └─< dilemmas ──< dilemma_attachments
               │              │
               │              └── sessions ──< session_messages (sparring écrit)
               │                     │      ──< session_invitations (expert)
               │                     ├── deliverables
               │                     └── follow_ups (relance J+15)
               │
settings, protocol_questions, diagnostic_questions, email_templates,
status_history, audit_log, notifications
```

| Table | Champs clés |
| --- | --- |
| `organizations` | id, nom, secteur, pays — prépare le futur tier entreprise |
| `profiles` | id (= compte), nom, fonction, email, téléphone WhatsApp, organisation, langue, CGU acceptées le, confidentialité acceptée le |
| `user_roles` | utilisateur, rôle (`dirigeant`, `expert`, `facilitateur`, `admin`) |
| `expert_profiles` | utilisateur, domaines, expérience, tarif par session (FCFA), NDA signé + date, actif |
| `expert_conflicts` | expert, organisation en conflit |
| `expert_availabilities` | expert, début, fin |
| `packs` | nom, crédits, prix FCFA, actif, ordre |
| `credit_lots` | dirigeant, pack, paiement, quantité, restant, date d'achat, date d'expiration |
| `credit_movements` | lot, dilemme (si lié), type (`achat`, `reservation`, `consommation`, `restitution`, `expiration`, `ajustement`), quantité, motif, auteur, horodatage — **insertion seule, jamais modifié ni supprimé** |
| `payments` | dirigeant, pack, montant, fournisseur (`manuel`, `orange_money`…), référence externe, statut (`initie`, `en_attente_validation`, `confirme`, `echoue`), payload webhook, validé par |
| `diagnostic_questions` | ordre, texte, choix (avec domaine associé), active |
| `diagnostics` | dirigeant, réponses, domaine suggéré |
| `dilemmas` | dirigeant, titre, domaine, contexte, décision à trancher, options, enjeux, échéance, format (`visio` / `ecrit`), créneaux proposés, statut |
| `dilemma_attachments` | dilemme, chemin du fichier privé, nom, taille |
| `sessions` | dilemme, expert, facilitateur, date et lien visio, statut, notes privées de l'expert, dates limites des rounds |
| `session_invitations` | session, expert, statut (`envoyee`, `acceptee`, `refusee`, `expiree`), conflit déclaré, date limite |
| `session_messages` | session, round (1 ou 2), auteur, type (`texte` / `vocal`), contenu ou chemin du fichier, brouillon / publié, horodatage |
| `deliverables` | session, contenu structuré (décision, options, grille, risques, prochaine étape, échéance), chemin du PDF, publié le |
| `follow_ups` | session, prévue le, envoyée le, réponse (`prise`, `reportee`, `abandonnee`), commentaire, alerte admin J+22 envoyée le |
| `protocol_questions` | domaine, ordre, texte, active |
| `settings` | clé / valeur : validité des crédits, seuil d'annulation, délais de rounds, seuil d'alerte matching, mode de paiement manuel actif… |
| `email_templates` | clé, sujet, corps (éditables en back-office) |
| `status_history` | dilemme, ancien statut, nouveau statut, auteur, horodatage |
| `audit_log` | utilisateur, action, objet, horodatage |
| `notifications` | destinataire, canal, déclencheur, objet lié, statut d'envoi |

### Statuts du dilemme

```
soumis → en_matching → planifie / en_cours_echange → tenu → livrable_publie → clos
   └──────────┴──────────────┴──→ annule (avant « tenu »)
```

Chaque transition passe par une seule fonction `change_dilemma_status`, qui vérifie que la transition est autorisée, l'enregistre dans `status_history` et crée la notification correspondante.

---

## 5. Crédits

- **Achat confirmé** → un lot de crédits avec date d'expiration = date d'achat + durée paramétrée.
- **Soumission d'un dilemme** → réservation d'un crédit sur le lot qui expire le plus tôt.
- **Session tenue** (visio tenue, ou round 2 publié) → la réservation devient consommation.
- **Annulation** plus de N heures avant la session (N paramétrable) → restitution ; sinon consommation.
- **Expiration** → le job quotidien passe le restant des lots expirés à zéro et trace un mouvement `expiration`.
- **Ajustement admin** → motif obligatoire.

Le solde affiché est toujours **calculé à partir des lots** : il ne peut pas diverger du journal.

---

## 6. Paiement

```ts
interface PaymentProvider {
  initiate(payment): Promise<{ redirectUrl?: string; instructions?: string }>;
  checkStatus(payment): Promise<PaymentStatus>;
  handleWebhook(request): Promise<{ paymentId: string; status: PaymentStatus }>;
}
```

- `ManualProvider` (lot 2) : le dirigeant paie hors plateforme et saisit la référence de transaction ; l'admin valide.
- `OrangeMoneyProvider` (lot 5) : branché dès réception des accès API. Le webhook est vérifié (signature et contre-appel à `checkStatus`) avant tout crédit.
- MTN MoMo ou Smobilpay s'ajouteront comme nouveaux fournisseurs, sans toucher au reste.
- **Règle absolue** : les crédits sont attribués uniquement par la fonction `confirm_payment`, appelée par un webhook vérifié ou par un admin. Le retour navigateur affiche seulement « paiement en cours de vérification ».
- Un reçu est envoyé par email à la confirmation.

---

## 7. Notifications

```ts
interface NotificationChannel { send(recipient, template, data): Promise<void> }
```

- Les déclencheurs (changement de statut, jobs) créent une ligne dans `notifications` ; un envoyeur la distribue sur les canaux actifs. En V1 : email seulement. WhatsApp s'ajoutera comme second canal.
- **Aucun contenu de dilemme ni de livrable dans les emails** : uniquement le titre quand le brief l'exige (relance J+15) et un lien vers la plateforme.

> Point à confirmer : la relance J+15 doit reprendre le titre du dilemme et la prochaine étape du livrable. Cela met un peu de contenu dans l'email. Nous proposons de n'inclure que le **titre** et de garder la prochaine étape sur la plateforme, derrière le lien.

---

## 8. Jobs planifiés

| Fréquence | Tâche |
| --- | --- |
| Quotidien (6 h, heure de Douala) | Relances J+15, alertes J+22 à l'admin, expiration des lots, alertes d'expiration à 30 jours, alertes de dilemmes en attente de matching depuis plus de 48 h, invitations expert expirées (24 h) |
| Toutes les 15 min | Rappels J-1 et H-1 des sessions visio, dépassement des délais de rounds |

Tous les délais viennent de la table `settings`. Fuseau par défaut : `Africa/Douala`.

---

## 9. Organisation du code

```
bsparring/
├── design/                 charte graphique (source de vérité visuelle)
├── docs/                   architecture, décisions
├── supabase/migrations/    schéma SQL, politiques de sécurité, fonctions
├── src/
│   ├── app/
│   │   ├── (public)/       landing, inscription, connexion
│   │   ├── espace/         espace dirigeant
│   │   ├── expert/         espace expert
│   │   ├── admin/          back-office (admin + facilitateur)
│   │   └── api/            webhooks paiement, routes des jobs
│   ├── components/         Button, Badge, Card, Field, Logo, CreditBalance
│   ├── lib/
│   │   ├── payments/       PaymentProvider + fournisseurs
│   │   ├── notifications/  NotificationChannel + gabarits
│   │   ├── credits/        règles de crédit
│   │   └── pdf/            gabarit du livrable
│   └── i18n/fr.json
└── tests/
```

---

## 10. Plan de livraison

| Lot | Contenu | Critère d'acceptation |
| --- | --- | --- |
| 0 | Ce document | Validé par Brainiacs |
| 1 | Socle : comptes, rôles, landing, back-office vide | Un admin crée un expert ; un dirigeant s'inscrit depuis un téléphone |
| 2 | Crédits : packs, paiement manuel, journal, expiration | Un paiement manuel validé crédite le compte ; le solde est juste après achat, réservation et annulation |
| 3 | Cycle de session : diagnostic, soumission, matching, visio, sparring écrit, espace expert, livrable PDF | Un dilemme va de la soumission au livrable publié dans les deux formats |
| 4 | Relances et pilotage | Relance J+15 avec le titre du dilemme ; tableau de bord |
| 5 | Orange Money | Un paiement réel crédite le compte via webhook, sans action admin |

---

## 11. Ce dont nous avons besoin pour démarrer le lot 1

1. **Validation de ce document** (ou corrections).
2. Création des comptes au nom de Brainiacs : **Vercel**, **Supabase** (deux projets : test et production), **Resend**. Dev peut guider la création ; les comptes doivent appartenir à Brainiacs, pas à Dev.
3. Accès DNS de `brainiacscompany.com` pour créer le sous-domaine.
4. Une adresse d'expédition des emails (par exemple `sparring@brainiacscompany.com`) et la vérification DNS associée.

Les points ouverts du brief (prix, validité, seuil d'annulation, protocole, NDA…) **ne bloquent pas le lot 1** : ils sont tous paramétrables et peuvent être tranchés pendant les lots 1 et 2.
