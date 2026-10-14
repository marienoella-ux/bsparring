# B-Sparring — Lot 0 : proposition d'architecture

Statut : **validé par Brainiacs le 14 octobre 2026**, avec les ajustements intégrés ci-dessous (voir section 12).

Ce document répond à la section « Choix techniques laissés à Dev » du brief technique V1. Il couvre la stack, l'hébergement, le schéma de base, la gestion des rôles, l'intégration du paiement, les notifications et les jobs planifiés.

---

## 1. Stack recommandée

| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Application web | **Next.js** (React, TypeScript), rendu serveur | Un seul projet pour la landing, l'espace dirigeant, l'espace expert et le back-office. C'est le framework le mieux connu des assistants IA, ce qui facilite la maintenance par une équipe non développeuse. Le rendu serveur garde des pages légères en 3G. |
| Base de données | **PostgreSQL via Supabase** | Le contrôle d'accès se fait **dans la base** (Row Level Security) : même un bug d'interface ne peut pas exposer un dilemme non assigné. |
| Authentification | **Supabase Auth** (email + mot de passe, lien magique), **double authentification TOTP obligatoire** pour les admins et facilitateurs | Intégré à la sécurité de la base. Le téléphone WhatsApp est stocké mais pas utilisé pour la connexion en V1. |
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
| Code source | Dépôt GitHub | 0 $ |

**Total : environ 45 $/mois** (≈ 27 000 FCFA) pour la production.

- **Deux environnements séparés** : `test` (branche `develop`, projet Supabase de test, URL de prévisualisation) et `production` (branche `main`, projet Supabase de production). Les données ne sont jamais partagées entre les deux.
- **Propriété des comptes** : Vercel, Supabase et Resend appartiennent à Brainiacs (adresse `@brainiacscompany.com`). Le code reste sur le dépôt GitHub `marienoella-ux/bsparring` (décision Brainiacs du 14 octobre 2026 : pas de transfert vers une organisation). Les accès de Dev se retirent sans rien perdre.
- **Région** : Supabase n'a pas de région en Afrique. Nous proposons l'Europe (Francfort ou Paris), qui offre la meilleure latence depuis Douala parmi les régions disponibles.
  > **Point bloquant pour la production, pas pour le test.** La loi camerounaise sur la protection des données personnelles (loi du 23 décembre 2024, en vigueur depuis le 23 juin 2026) encadre les transferts de données hors du territoire. La validation juridique est en cours chez Brainiacs. L'environnement de test peut être hébergé en Europe dès le lot 1 (avec des données fictives uniquement). **La mise en production attend l'avis juridique.** Si l'hébergement européen n'est pas retenu, la stack reste la même mais la base passe sur un PostgreSQL auto-hébergé ou chez un hébergeur au Cameroun. Le coût et le délai de cette bascule seront chiffrés le cas échéant.
  > Les CGU contiendront une clause sur le lieu d'hébergement des données. Brainiacs en fournit la rédaction.
- **Chiffrement** : HTTPS partout ; chiffrement au repos assuré par Supabase (AES-256).
- **Sauvegardes** : quotidiennes (incluses dans Supabase Pro), plus une copie hebdomadaire exportée hors de Supabase (base + fichiers) vers un stockage appartenant à Brainiacs.
- **Test de restauration** : avant l'ouverture au public, une restauration complète (base **et** fichiers : pièces jointes, notes vocales, PDF) est faite depuis une sauvegarde de production vers l'environnement de test. La procédure est documentée dans `docs/` et le test est concluant quand un dilemme restauré s'ouvre avec ses pièces jointes, ses notes vocales et son livrable. Ce test est refait après tout changement majeur du schéma.

---

## 3. Rôles et contrôle d'accès

Un utilisateur peut porter **plusieurs rôles** (table `user_roles`) : Nono peut être à la fois `admin` et `facilitateur`.

| Rôle | Ce que la base lui laisse lire |
| --- | --- |
| `dirigeant` | Ses propres dilemmes, sessions, livrables, crédits et paiements. |
| `expert` | Les sessions où il est l'expert assigné. **Avant acceptation** : uniquement le domaine, l'échéance, le format et le **résumé anonymisé** rédigé ou validé par le facilitateur (voir plus bas). Jamais un extrait automatique de la soumission, ni le contexte, ni l'identité du dirigeant, ni son organisation. Jamais les paiements. |
| `facilitateur` | Les sessions où il est le facilitateur assigné. Jamais les paramètres financiers globaux. |
| `admin` | Tout. |

Principes :

0. **Double authentification obligatoire pour l'admin et le facilitateur.** Ces comptes enrôlent une application TOTP (Google Authenticator, Authy…) à leur première connexion. L'accès au back-office est refusé à deux niveaux tant que la session n'est pas au niveau `aal2` (mot de passe + code TOTP) :
   - dans l'application : toute page `/admin` redirige vers l'enrôlement ou la saisie du code ;
   - dans la base : les politiques de sécurité réservées aux rôles `admin` et `facilitateur` exigent `aal2` dans le jeton. Un compte sans 2FA ne lit donc rien, même en appelant la base directement.
   Les dirigeants et les experts peuvent activer la 2FA, sans obligation en V1. Un admin peut réinitialiser la 2FA d'un autre compte (action tracée dans le journal d'audit).
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
| `dilemmas` | dirigeant, titre, domaine, contexte, décision à trancher, options, enjeux, échéance, format (`visio` / `ecrit`), créneaux proposés, statut, **résumé anonymisé**, résumé validé par, résumé validé le |
| `dilemma_attachments` | dilemme, chemin du fichier privé, nom, taille |
| `sessions` | dilemme, expert, facilitateur, date et lien visio, statut, notes privées de l'expert, dates limites des rounds |
| `session_invitations` | session, expert, statut (`envoyee`, `acceptee`, `refusee`, `expiree`), conflit déclaré, date limite |
| `session_messages` | session, round (1 ou 2), auteur, type (`texte` / `vocal`), contenu ou chemin du fichier, format audio, durée (s), taille (octets), brouillon / publié, horodatage |
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

### Résumé anonymisé

- Le facilitateur rédige (ou corrige puis valide) le résumé anonymisé depuis la fiche du dilemme dans le back-office. Rien n'est pré-rempli automatiquement à partir de la soumission.
- La fonction `send_expert_invitation` **refuse** l'envoi tant que le résumé n'est pas renseigné et validé (validé par, validé le). La règle est dans la base, pas seulement dans l'interface.
- L'expert accède au résumé par une vue dédiée qui n'expose aucune autre colonne du dilemme. La fiche complète ne s'ouvre qu'après acceptation et déclaration de conflit d'intérêts.
- Une aide de rédaction rappelle les éléments à retirer : nom de l'organisation, ville, taille précise, chiffres identifiants, noms de personnes, marques.

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
- **Aucun contenu dans aucune notification** : ni titre du dilemme, ni domaine, ni prochaine étape, ni nom de l'expert ou du dirigeant concerné. Seuls une date et un lien vers la plateforme. Exemples :
  - Relance J+15 : « Votre décision du 23 octobre : où en êtes-vous ? » + bouton « Répondre ».
  - Session planifiée : « Votre session du 23 octobre à 10 h est confirmée. » + bouton « Voir la session ». Le lien visio n'est **pas** dans l'email : il s'affiche sur la plateforme après connexion.
  - Invitation expert : « Une nouvelle mission vous est proposée. Réponse attendue avant le 24 octobre. »
- La personnalisation (titre du dilemme, prochaine étape du livrable) s'affiche **uniquement sur la plateforme, après connexion**. La relance J+15 ouvre une page qui reprend le titre et la prochaine étape.
- Les gabarits d'emails sont éditables en back-office, mais ne disposent que de variables neutres (prénom du destinataire, date, heure, lien). Les variables de contenu n'existent pas côté email : un admin ne peut pas les y glisser par erreur. Même règle pour le futur canal WhatsApp.

---

## 7 bis. Notes vocales

Le dirigeant peut répondre par note vocale dans le sparring écrit. Les notes sont enregistrées dans le navigateur (pas d'application à installer).

| Paramètre | Valeur V1 |
| --- | --- |
| Formats enregistrés | iPhone (Safari iOS) : **AAC dans un conteneur MP4** (`audio/mp4`). Android (Chrome) : **AAC/MP4** si le navigateur le permet, sinon **Opus dans un conteneur WebM** (`audio/webm`). L'application choisit automatiquement le premier format pris en charge, dans cet ordre. |
| Formats acceptés à l'envoi | `audio/mp4` (.m4a, .mp4), `audio/webm`, `audio/ogg` (Opus), `audio/mpeg` (.mp3). Tout autre format est refusé avec un message clair. |
| Débit d'enregistrement | 64 kbit/s mono (suffisant pour la voix, ≈ 0,5 Mo par minute) |
| Durée maximale | **5 minutes par note** (paramétrable). Le compteur s'affiche pendant l'enregistrement et l'enregistrement s'arrête seul à 5:00. |
| Taille maximale | **10 Mo par note**, vérifiée par le stockage lui-même (pas seulement par l'interface) |
| Nombre de notes | Plusieurs notes possibles par réponse, en complément ou à la place du texte |
| Lecture | Dans la page, avec le lecteur audio du navigateur, par lien signé de courte durée. Les notes WebM étant mal lues par certains anciens iPhone, l'expert et le facilitateur écoutent sur la plateforme ; le format est choisi pour que les deux sens fonctionnent sur les navigateurs récents. |
| Contrôles serveur | Type de fichier vérifié sur le contenu réel (pas seulement l'extension), durée lue dans le fichier et refusée au-delà de la limite + 10 s de tolérance |

Le dirigeant peut réécouter et supprimer une note avant d'envoyer sa réponse. Une fois la réponse envoyée, la note n'est plus modifiable.

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
| 1 | Socle : comptes, rôles, 2FA, landing, back-office vide | Un admin crée un expert ; un dirigeant s'inscrit depuis un téléphone ; un compte admin ou facilitateur sans 2FA n'accède pas au back-office (ni par l'interface, ni par la base) |
| 2 | Crédits : packs, paiement manuel, journal, expiration | Un paiement manuel validé crédite le compte ; le solde est juste après achat, réservation et annulation |
| 3 | Cycle de session : diagnostic, soumission, résumé anonymisé, matching, visio, sparring écrit, notes vocales, espace expert, livrable PDF | Un dilemme va de la soumission au livrable publié dans les deux formats. Une invitation expert est impossible sans résumé anonymisé validé. **Une note vocale est enregistrée, envoyée puis réécoutée depuis Safari iOS et depuis Chrome Android, et lue par l'expert et le facilitateur sur ordinateur** ; une note de plus de 5 minutes ou de plus de 10 Mo est refusée. |
| 4 | Relances et pilotage | Relance J+15 avec le titre du dilemme ; tableau de bord |
| 5 | Orange Money | Un paiement réel crédite le compte via webhook, sans action admin |

**Avant l'ouverture au public** (en plus du test final des 3 dilemmes réels) :
- test de restauration complet réussi sur l'environnement de test (section 2) ;
- avis juridique favorable sur le lieu d'hébergement, et clause correspondante dans les CGU (section 2).

---

## 11. Ce dont nous avons besoin pour démarrer le lot 1

1. **Validation de ce document** (ou corrections).
2. Création des comptes au nom de Brainiacs : **GitHub** (dépôt actuel `marienoella-ux/bsparring`, conservé), **Vercel**, **Supabase** (deux projets : test et production), **Resend**. Dev peut guider la création ; les comptes doivent appartenir à Brainiacs, pas à Dev.
3. Accès DNS de `brainiacscompany.com` pour créer le sous-domaine.
4. Une adresse d'expédition des emails (par exemple `sparring@brainiacscompany.com`) et la vérification DNS associée.

Le lieu d'hébergement **ne bloque pas le lot 1** (environnement de test, données fictives), mais bloque la mise en production.

Les points ouverts du brief (prix, validité, seuil d'annulation, protocole, NDA…) **ne bloquent pas le lot 1** : ils sont tous paramétrables et peuvent être tranchés pendant les lots 1 et 2.

---

## 12. Ajustements demandés à la validation (14 octobre 2026)

| # | Ajustement | Où dans ce document |
| --- | --- | --- |
| 1 | 2FA TOTP obligatoire pour admin et facilitateur, vérifiée dans l'application et dans la base | Sections 1, 3, 10 (lot 1) |
| 2 | Résumé anonymisé rédigé ou validé par le facilitateur, obligatoire avant toute invitation expert | Sections 3, 4, 10 (lot 3) |
| 3 | Aucun contenu dans aucune notification : date et lien uniquement | Section 7 |
| 4 | Notes vocales : formats, 5 min, 10 Mo, test Safari iOS et Chrome Android | Sections 4, 7 bis, 10 (lot 3) |
| 5 | Test de restauration complet avant ouverture au public | Sections 2, 10 |
| 6 | Propriété des comptes Brainiacs ; le dépôt reste `marienoella-ux/bsparring` (pas de transfert) | Sections 2, 11 |
| 7 | Hébergement en Europe soumis à validation juridique : bloque la production, pas le test ; clause CGU fournie par Brainiacs | Sections 2, 10, 11 |
