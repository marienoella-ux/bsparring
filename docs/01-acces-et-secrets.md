# B-Sparring — Accès et secrets

Ce document liste les accès à configurer pour le développement, et la façon de les transmettre. **Aucune valeur secrète ne figure dans ce dépôt**, ni dans une conversation, un email ou un message WhatsApp.

## Qui est « Dev »

Le développement est réalisé par **Claude** (Anthropic), un agent IA qui travaille dans une session **Claude Code** hébergée dans le cloud. Conséquences :

- Dev n'a **pas de compte personnel** à créer chez GitHub, Vercel ou Supabase, et ne se connecte à aucun tableau de bord.
- « Donner un accès à Dev » signifie : **installer l'application GitHub Claude** sur le dépôt, et **renseigner des variables dans l'environnement Claude Code** de la session.
- Les opérations faites dans les tableaux de bord (créer un projet, copier une clé dans Vercel, activer une option) sont faites par Brainiacs, en suivant les étapes ci-dessous.

## Principes

1. **Moindre privilège** : Dev ne reçoit que ce qui sert au développement sur l'environnement de test. Aucun accès à la production.
2. **Les secrets vont directement de leur source à leur destination** : de Supabase vers Vercel, ou de Supabase vers l'environnement Claude Code, par copier-coller fait par Brainiacs. Ils ne transitent jamais par un intermédiaire.
3. **Les comptes appartiennent à Brainiacs**, sur une adresse `@brainiacscompany.com`, avec la double authentification activée sur chacun.
4. **Rotation** : en cas de doute (clé collée au mauvais endroit, fin de collaboration), Brainiacs régénère la clé dans Supabase puis met à jour Vercel et l'environnement Claude Code.

---

## 1. GitHub (dépôt `marienoella-ux/bsparring`)

À faire par Brainiacs :

| Étape | Détail |
| --- | --- |
| Double authentification | L'activer sur le compte GitHub propriétaire du dépôt (Settings → Password and authentication). |
| Installer l'application **Claude** | Sur le compte propriétaire, en choisissant **« Only select repositories » → `bsparring`** uniquement. Lien : https://github.com/apps/claude/installations/select_target |
| Connecter GitHub à Claude | Depuis le compte qui pilote les sessions : https://claude.ai/connect-github |
| Protéger les branches | `main` et `develop` : fusion uniquement par pull request, au moins une approbation de Brainiacs, pas de push forcé, pas de suppression. |

Accès donné à Dev : **lecture et écriture sur `bsparring` uniquement**, via l'application. Aucun rôle d'administrateur, aucun jeton personnel.

Le dépôt reste sur `marienoella-ux/bsparring` : pas de transfert vers une organisation (décision Brainiacs du 14 octobre 2026).

### Branches

| Branche | Rôle | Déploiement |
| --- | --- | --- |
| `main` | Production | Production Vercel (en attente de l'avis juridique) |
| `develop` | Référence validée, intégration | Environnement de test |
| `claude/…`, `lot-…` | Travail en cours | Prévisualisation Vercel, liée à la base de test |

---

## 2. Supabase — projet de test (région Europe)

À faire par Brainiacs dans le tableau de bord du projet de test :

| Réglage | Où | Valeur |
| --- | --- | --- |
| Double authentification TOTP | Authentication → Multi-Factor | **TOTP activé** |
| Inscriptions | Authentication → Sign In / Providers → Email | Activé, confirmation d'email activée |
| URL du site | Authentication → URL Configuration | L'adresse de test Vercel, tant que `main` n'est pas déployée (voir `docs/02-configuration-supabase.md`) |
| URLs de redirection | Authentication → URL Configuration | `https://*-<équipe-vercel>.vercel.app/**` et l'URL de test |

Variables à renseigner dans **l'environnement Claude Code** (voir section 4) :

| Variable | Où la trouver dans Supabase | Sensibilité | Usage |
| --- | --- | --- | --- |
| `SUPABASE_TEST_URL` | Project Settings → API → Project URL | Publique | Connexion de l'application |
| `SUPABASE_TEST_ANON_KEY` | Project Settings → API Keys → `anon` / publishable | Publique (protégée par les règles de sécurité de la base) | Tests de l'application |
| `SUPABASE_TEST_SERVICE_ROLE_KEY` | Project Settings → API Keys → `service_role` / secret | **Secrète** : contourne les règles de sécurité | Tests automatisés (création de comptes de test) |
| `SUPABASE_TEST_DB_URL` | Connect → Connection string → **Session pooler** (URI, avec le mot de passe de la base) | **Secrète** | Appliquer les migrations du schéma |

Dev n'a pas besoin de jeton d'accès Supabase personnel (`SUPABASE_ACCESS_TOKEN`) : ce jeton donnerait accès à tous les projets du compte, production comprise.

**Production Supabase** : rien à créer ni à transmettre avant l'avis juridique. Dev n'y aura jamais d'accès direct : les migrations y seront appliquées par un processus automatique validé (lot de mise en production).

---

## 3. Vercel (équipe Brainiacs)

Dev n'a **aucun accès** à Vercel. À faire par Brainiacs :

| Étape | Détail |
| --- | --- |
| Importer le projet | Add New → Project → dépôt `marienoella-ux/bsparring`. Framework : Next.js. |
| Branche de production | Settings → Git → Production Branch : `main` |
| Domaine de test | Rattacher un domaine à la branche `develop` (par exemple `test-sparring.brainiacscompany.com`) — facultatif au lot 1, l'URL `*.vercel.app` suffit |
| Protection des prévisualisations | Settings → Deployment Protection → **Vercel Authentication** activé pour les prévisualisations |

Variables d'environnement (Settings → Environment Variables), à copier **directement depuis Supabase** :

| Variable | Environnements Vercel | Valeur |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production et Preview | Project URL du projet de **test** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production et Preview | Clé `anon` / publishable du projet de **test** |
| `SUPABASE_SERVICE_ROLE_KEY` | Production et Preview | Clé `service_role` / secret du projet de **test** — cocher **Sensitive** |
| `CRON_SECRET` | Preview | Une valeur aléatoire générée par Vercel ou par un gestionnaire de mots de passe (32 caractères ou plus) — cocher **Sensitive**. Sert au lot 2. |
| `APP_URL` | Production et Preview | L'URL de test |

Tant que la production n'est pas ouverte, les environnements Production et Preview de Vercel pointent tous deux vers le projet Supabase de **test**. Les valeurs de Production basculeront vers le projet Supabase de production après l'avis juridique. Relancer un déploiement après toute modification de variable.

---

## 4. Transmettre les secrets à Dev : l'environnement Claude Code

C'est la seule voie de transmission vers Dev.

1. Dans l'application Claude, ouvrir la session, puis le **menu de l'environnement cloud** (dans la barre de titre de la session) → **Edit**.
2. Ajouter les quatre variables de la section 2 (`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`, `SUPABASE_TEST_DB_URL`), en copiant les valeurs depuis le tableau de bord Supabase.
3. Vérifier que l'accès réseau de l'environnement autorise `*.supabase.co` et `*.pooler.supabase.com`.
4. **Ouvrir une nouvelle session** : les variables sont lues au démarrage.

Ce qu'il ne faut jamais faire : coller une clé dans la conversation, dans un commentaire GitHub, dans un fichier du dépôt, dans un email ou un message.

Entre personnes de Brainiacs (par exemple pour transmettre le mot de passe de la base à la personne qui configure Vercel), utiliser le **partage sécurisé d'un gestionnaire de mots de passe** (Bitwarden Send, 1Password, lien à usage unique et à durée courte).

---

## 5. Resend

Branché dès le lot 1 comme serveur SMTP de Supabase (expéditeur `sparring@brainiacscompany.com`), voir `docs/02-configuration-supabase.md`. La clé API (portée « Sending access », domaine `brainiacscompany.com`) va directement de Resend vers Supabase. Dev n'en a pas besoin avant le lot 4, où les notifications de la plateforme passeront aussi par Resend.

---

## Récapitulatif

| Compte | Rôle donné à Dev | Ce que Brainiacs transmet | Par où |
| --- | --- | --- | --- |
| GitHub | Application Claude, dépôt `bsparring` seul, lecture et écriture | Rien | Installation de l'application |
| Supabase test | Aucun rôle sur le tableau de bord | 4 variables | Environnement Claude Code |
| Supabase production | Aucun | Rien | — |
| Vercel | Aucun | Rien (Brainiacs copie les clés de Supabase vers Vercel) | — |
| Resend | Aucun avant le lot 4 | Rien (Brainiacs colle la clé dans les réglages SMTP de Supabase) | — |
