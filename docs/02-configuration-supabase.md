# B-Sparring — Configuration du projet Supabase de test

À faire une fois, dans le tableau de bord Supabase du projet de **test**. Les réglages d'accès (2FA, URLs) sont dans `docs/01-acces-et-secrets.md`.

## 1. Appliquer le schéma

Dev applique les migrations de `supabase/migrations/` avec `bash scripts/db-apply.sh` (lit `SUPABASE_TEST_DB_URL`). Chaque migration n'est appliquée qu'une fois.

Avant d'être appliquée, chaque migration est testée sur une base locale jetable : `npm run test:db`.

## 2. Modèles d'emails (Authentication → Emails → Templates)

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

Les emails aux couleurs de la charte et l'envoi par Resend arrivent au lot 4. D'ici là, Supabase envoie avec son serveur par défaut, limité à quelques emails par heure : suffisant pour les tests.

## 3. Créer le premier compte admin

L'application ne permet jamais de s'attribuer un rôle. Le premier admin est donc créé une fois, à la main :

1. Créer le compte depuis la plateforme (`/inscription`) avec l'adresse `@brainiacscompany.com` de Nono, puis confirmer l'email.
2. Dans Supabase → SQL Editor, exécuter (en remplaçant l'email) :

```sql
insert into public.user_roles (user_id, role)
select id, r.role::public.app_role
from public.profiles, (values ('admin'), ('facilitateur')) as r(role)
where email = 'nono@brainiacscompany.com'
on conflict do nothing;

-- Ce compte a été créé comme dirigeant : retirer ce rôle s'il ne doit pas l'être.
delete from public.user_roles
where role = 'dirigeant'
  and user_id = (select id from public.profiles where email = 'nono@brainiacscompany.com');
```

3. Se reconnecter : la plateforme impose l'enrôlement de la double authentification avant d'ouvrir le back-office.

## 4. Vérifier le lot 1 (critères d'acceptation)

1. **Un dirigeant s'inscrit depuis un téléphone** : ouvrir l'URL de test sur un téléphone, `/inscription`, confirmer l'email, arriver sur « Mon espace ».
2. **Un compte admin sans 2FA n'accède pas au back-office** : se connecter avec le compte admin ; l'écran « Double authentification » s'impose avant `/admin`. Côté base, le test automatique `supabase/tests/01_socle.test.sql` vérifie qu'un admin sans 2FA ne lit aucune donnée d'administration.
3. **Un admin crée un expert** : back-office → Experts → Ajouter un expert. L'expert reçoit l'email, choisit son mot de passe et arrive sur l'espace expert.
