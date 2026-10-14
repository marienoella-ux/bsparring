-- B-Sparring — Lot 1 : socle (comptes, rôles, organisations, experts, paramètres, audit)
--
-- Principe : toute la sécurité est ici, dans la base (Row Level Security).
-- Les rôles admin et facilitateur n'ont aucun droit tant que la session
-- n'est pas en double authentification (aal2).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('dirigeant', 'expert', 'facilitateur', 'admin');

create type public.domain as enum ('strategie', 'gestion_projet', 'innovation', 'rh');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Prépare le futur tier entreprise : un dirigeant appartient à une organisation.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  sector text,
  country text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  job_title text,
  email text not null,
  whatsapp_phone text,
  organization_id uuid references public.organizations (id) on delete set null,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  terms_accepted_at timestamptz,
  confidentiality_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un même compte peut porter plusieurs rôles (ex. admin + facilitateur).
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.expert_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  domains public.domain[] not null default '{}',
  experience text,
  fee_per_session_fcfa integer check (fee_per_session_fcfa is null or fee_per_session_fcfa >= 0),
  nda_signed boolean not null default false,
  nda_signed_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nda_date_when_signed check (not nda_signed or nda_signed_at is not null)
);

create table public.expert_conflicts (
  expert_id uuid not null references public.expert_profiles (user_id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (expert_id, organization_id)
);

-- Paramètres éditables en back-office (délais, seuils, durées…).
create table public.settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Journal d'audit : insertion seule, jamais modifié ni supprimé.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  object_type text not null,
  object_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_object_idx on public.audit_log (object_type, object_id);
create index profiles_organization_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation
-- ---------------------------------------------------------------------------

-- La session courante est-elle en double authentification ?
create function public.is_aal2() returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- Le compte courant porte-t-il ce rôle ? (sans condition de 2FA)
create function public.has_role(r public.app_role) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = r
  )
$$;

-- Admin effectif : rôle admin ET session en 2FA.
create function public.is_admin() returns boolean
language sql stable
set search_path = ''
as $$
  select public.has_role('admin') and public.is_aal2()
$$;

-- Facilitateur effectif : rôle facilitateur ET session en 2FA.
create function public.is_facilitator() returns boolean
language sql stable
set search_path = ''
as $$
  select public.has_role('facilitateur') and public.is_aal2()
$$;

-- Écriture dans le journal d'audit (seule voie d'insertion).
create function public.log_audit(
  p_action text,
  p_object_type text,
  p_object_id text default null,
  p_details jsonb default null
) returns void
language sql volatile security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, object_type, object_id, details)
  values (auth.uid(), p_action, p_object_type, p_object_id, p_details)
$$;

-- ---------------------------------------------------------------------------
-- Création du profil à l'inscription
-- ---------------------------------------------------------------------------
-- Les métadonnées d'inscription viennent du navigateur : elles ne donnent
-- jamais un rôle autre que « dirigeant ». Les rôles expert, facilitateur
-- et admin sont attribués uniquement par un admin.

create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  org_id uuid;
begin
  if nullif(trim(meta ->> 'organization_name'), '') is not null then
    insert into public.organizations (name, sector, country)
    values (
      left(trim(meta ->> 'organization_name'), 200),
      nullif(trim(meta ->> 'sector'), ''),
      nullif(trim(meta ->> 'country'), '')
    )
    returning id into org_id;
  end if;

  insert into public.profiles (
    id, email, full_name, job_title, whatsapp_phone, organization_id,
    terms_accepted_at, confidentiality_accepted_at
  ) values (
    new.id,
    new.email,
    coalesce(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'job_title'), ''),
    nullif(trim(meta ->> 'whatsapp_phone'), ''),
    org_id,
    case when (meta ->> 'terms_accepted') = 'true' then now() end,
    case when (meta ->> 'confidentiality_accepted') = 'true' then now() end
  );

  if (meta ->> 'signup') = 'dirigeant' then
    insert into public.user_roles (user_id, role) values (new.id, 'dirigeant');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Horodatage des mises à jour
create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger expert_profiles_touch before update on public.expert_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.expert_profiles enable row level security;
alter table public.expert_conflicts enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- Aucun accès anonyme à ces tables.
revoke all on public.organizations, public.profiles, public.user_roles,
  public.expert_profiles, public.expert_conflicts, public.settings,
  public.audit_log from anon;

-- organizations
create policy "organisation : la sienne" on public.organizations
  for select to authenticated
  using (id = (select organization_id from public.profiles where id = auth.uid()));
create policy "organisation : admin lit tout" on public.organizations
  for select to authenticated using (public.is_admin());
create policy "organisation : admin crée" on public.organizations
  for insert to authenticated with check (public.is_admin());
create policy "organisation : admin modifie" on public.organizations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "profil : le sien" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profil : admin lit tout" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profil : modifier le sien" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profil : admin modifie" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Un utilisateur ne peut modifier que ses informations personnelles,
-- pas son email, son organisation ni ses dates d'acceptation.
revoke update on public.profiles from authenticated;
grant update (full_name, job_title, whatsapp_phone, locale) on public.profiles to authenticated;

-- user_roles
create policy "rôles : les siens" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "rôles : admin lit tout" on public.user_roles
  for select to authenticated using (public.is_admin());
create policy "rôles : admin attribue" on public.user_roles
  for insert to authenticated with check (public.is_admin() and granted_by = auth.uid());
create policy "rôles : admin retire" on public.user_roles
  for delete to authenticated using (public.is_admin());

-- expert_profiles
create policy "fiche expert : la sienne" on public.expert_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "fiche expert : admin lit tout" on public.expert_profiles
  for select to authenticated using (public.is_admin());
create policy "fiche expert : admin crée" on public.expert_profiles
  for insert to authenticated with check (public.is_admin());
create policy "fiche expert : admin modifie" on public.expert_profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- expert_conflicts
create policy "conflits : les siens" on public.expert_conflicts
  for select to authenticated using (expert_id = auth.uid());
create policy "conflits : admin gère" on public.expert_conflicts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- settings : admin uniquement en V1
create policy "paramètres : admin lit" on public.settings
  for select to authenticated using (public.is_admin());
create policy "paramètres : admin modifie" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit_log : lecture admin ; écriture uniquement via log_audit()
create policy "audit : admin lit" on public.audit_log
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_log from authenticated;

-- Fonctions : pas d'exécution anonyme
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Paramètres par défaut (valeurs provisoires, à ajuster en back-office)
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, description) values
  ('credit_validity_months', '12', 'Durée de validité d''un lot de crédits, en mois (6 à 12)'),
  ('cancellation_threshold_hours', '24', 'Annulation au-delà de ce délai avant la session : crédit restitué'),
  ('matching_alert_hours', '48', 'Alerte admin si un dilemme attend un matching depuis plus de ce délai'),
  ('written_round_delay_hours', '72', 'Délai de publication de chaque round du sparring écrit'),
  ('expert_invitation_hours', '24', 'Délai de réponse de l''expert à une invitation'),
  ('follow_up_days', '15', 'Relance du dirigeant N jours après la publication du livrable'),
  ('follow_up_admin_alert_days', '22', 'Alerte admin si la relance reste sans réponse N jours après le livrable'),
  ('credit_expiry_alert_days', '30', 'Alerte au dirigeant N jours avant l''expiration de ses crédits'),
  ('voice_note_max_seconds', '300', 'Durée maximale d''une note vocale, en secondes'),
  ('voice_note_max_bytes', '10485760', 'Taille maximale d''une note vocale, en octets'),
  ('manual_payment_enabled', 'true', 'Mode de paiement manuel (validation par l''admin) activé');
