# B-Sparring — Configuration du projet Supabase de test

À faire une fois, dans le tableau de bord Supabase du projet de **test**. Les réglages d'accès (2FA, URLs) sont dans `docs/01-acces-et-secrets.md`.

## 1. Appliquer le schéma

Dev applique les migrations de `supabase/migrations/` avec `bash scripts/db-apply.sh` (lit `SUPABASE_TEST_DB_URL`). Chaque migration n'est appliquée qu'une fois.

Avant d'être appliquée, chaque migration est testée sur une base locale jetable : `npm run test:db`.

Si la session de Dev ne peut pas joindre la base, Dev fournit le fichier SQL de la migration : le coller dans Supabase → **SQL Editor → New query**, puis **Run**. Le fichier s'exécute en une seule transaction : en cas d'erreur, rien n'est appliqué.

## 2. URL du site et redirections (Authentication → URL Configuration)

| Réglage | Valeur |
| --- | --- |
| **Site URL** | L'adresse de **test** (déploiement de prévisualisation Vercel) tant que `main` n'est pas déployée. Les liens des emails partent de cette adresse : si elle pointe vers un déploiement inexistant, les liens mènent à une page introuvable. |
| **Redirect URLs** | `https://*-nonos-projects-6bebaf1a.vercel.app/**` (toutes les prévisualisations) et l'adresse de test. |

Lors de la mise en production, la Site URL passera sur l'adresse définitive (`sparring.brainiacscompany.com`).

## 3. Envoi des emails par Resend (Project Settings → Authentication → SMTP Settings)

Le serveur d'email intégré de Supabase est limité à quelques emails par heure : il bloque dès les premiers tests. Resend est branché en SMTP **dès le lot 1** :

| Réglage | Valeur |
| --- | --- |
| Enable custom SMTP | Activé |
| Sender email | `sparring@brainiacscompany.com` |
| Sender name | `B-Sparring by Brainiacs` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Une clé API Resend à portée **Sending access**, limitée au domaine `brainiacscompany.com`, collée directement depuis Resend |

Le domaine `brainiacscompany.com` doit être vérifié dans Resend (enregistrements DNS SPF et DKIM). La limite d'envoi se règle ensuite dans Authentication → Rate Limits.

## 4. Modèles d'emails (Authentication → Emails → Templates)

Règle : **aucun contenu** dans les emails, seulement un lien. Les liens pointent vers `/auth/confirm` de la plateforme (indispensable pour l'invitation des experts).

Remplacer chaque modèle par le texte ci-dessous.

### Confirm signup

- Sujet : `Confirmez votre email — B-Sparring`
- Corps :

```html
<p>Bonjour,</p>
<p>Confirmez votre adresse email pour accéder à votre espace B-Sparring.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/tableau">Confirmer mon email</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
<p>B-Sparring by Brainiacs</p>
```

### Invite user (experts)

- Sujet : `Votre accès expert — B-Sparring`
- Corps :

```html
<p>Bonjour,</p>
<p>Brainiacs vous invite à rejoindre le pool d'experts B-Sparring. Choisissez votre mot de passe pour activer votre accès.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/mot-de-passe">Activer mon accès</a></p>
<p>B-Sparring by Brainiacs</p>
```

### Reset password

- Sujet : `Réinitialiser votre mot de passe — B-Sparring`
- Corps :

```html
<p>Bonjour,</p>
<p>Choisissez un nouveau mot de passe pour votre compte B-Sparring.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/mot-de-passe">Choisir un nouveau mot de passe</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
<p>B-Sparring by Brainiacs</p>
```

### Change email address

- Sujet : `Confirmez votre nouvel email — B-Sparring`
- Corps :

```html
<p>Bonjour,</p>
<p>Confirmez votre nouvelle adresse email.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/tableau">Confirmer</a></p>
<p>B-Sparring by Brainiacs</p>
```

Les gabarits HTML aux couleurs de la charte arrivent au lot 4 ; l'envoi passe déjà par Resend (section 3).

## 5. Créer le premier compte admin

L'application ne permet jamais de s'attribuer un rôle. Le premier admin est donc créé une fois, à la main :

1. Supabase → **Authentication → Users → Add user → Create new user** : saisir l'email (`mnoella.tetka@brainiacscompany.com`) et un mot de passe de 12 caractères ou plus, cocher **Auto Confirm User**, puis **Create user**.
2. Supabase → **SQL Editor**, exécuter :

```sql
insert into public.user_roles (user_id, role)
select p.id, r.role::public.app_role
from public.profiles p
cross join (values ('admin'), ('facilitateur')) as r(role)
where p.email = 'mnoella.tetka@brainiacscompany.com'
on conflict do nothing;

-- Vérification : deux lignes, admin et facilitateur, aucune ligne dirigeant.
select p.email, ur.role
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
where p.email = 'mnoella.tetka@brainiacscompany.com'
order by ur.role;
```

Un compte créé depuis le tableau de bord ne reçoit aucun rôle automatiquement : il n'y a pas de rôle dirigeant à retirer.

3. Se connecter sur la plateforme : l'enrôlement de la double authentification s'impose avant l'ouverture du back-office.

## 6. Variables d'environnement Vercel (Settings → Environment Variables)

- Cocher **Production** et **Preview** pour chaque variable (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`). Tant que la production n'est pas ouverte, les deux environnements pointent vers le projet Supabase de **test**.
- **Relancer un déploiement après toute modification** (Deployments → dernier déploiement → **Redeploy**) : les variables `NEXT_PUBLIC_…` sont intégrées au moment de la compilation, un déploiement existant ne voit pas une nouvelle valeur.
- S'il manque une variable Supabase, la plateforme affiche la page « Service momentanément indisponible » (code 503) ; les journaux Vercel (Logs) nomment la variable manquante.

## 7. Vérifier le lot 1 (critères d'acceptation)

Vérifiés par Brainiacs le 14 octobre 2026 sur l'adresse de prévisualisation : les trois critères sont validés.

1. **Un dirigeant s'inscrit depuis un téléphone** : ouvrir l'URL de test sur un téléphone, `/inscription`, confirmer l'email, arriver sur « Mon espace ».
2. **Un compte admin sans 2FA n'accède pas au back-office** : se connecter avec le compte admin ; l'écran « Double authentification » s'impose avant `/admin`. Côté base, le test automatique `supabase/tests/01_socle.test.sql` vérifie qu'un admin sans 2FA ne lit aucune donnée d'administration.
3. **Un admin crée un expert** : back-office → Experts → Ajouter un expert. L'expert reçoit l'email, choisit son mot de passe et arrive sur l'espace expert.
