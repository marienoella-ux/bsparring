-- B-Sparring — Lot 2 : packs, paiement manuel, crédits, offre Pionniers
--
-- Principes :
-- - Les crédits ne sont créés que par confirm_payment (validation admin, ou
--   webhook vérifié au lot 5) et adjust_credits (ajustement admin motivé).
-- - Toute opération passe par une fonction qui écrit le journal
--   credit_movements dans la même transaction. Le journal ne se modifie jamais.
-- - Le solde est calculé à partir des lots non expirés.
-- - Consommation des crédits les plus proches de l'expiration en premier.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.payment_status as enum ('en_attente_validation', 'confirme', 'refuse');
create type public.payment_operator as enum ('orange_money', 'mtn_momo');
create type public.credit_lot_source as enum ('achat', 'pionnier', 'ajustement');
create type public.credit_movement_type as enum
  ('achat', 'reservation', 'consommation', 'restitution', 'expiration', 'ajustement');
create type public.reservation_status as enum ('reservee', 'consommee', 'restituee');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  credits integer not null check (credits between 1 and 100),
  price_fcfa integer not null check (price_fcfa > 0),
  pioneer_eligible boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Moyens de paiement manuels : numéro et bénéficiaire modifiables en back-office.
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  operator public.payment_operator not null unique,
  label text not null,
  phone text not null default '',
  beneficiary text not null default '',
  ussd_code text not null,
  active boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint active_requires_details check (not active or (phone <> '' and beneficiary <> ''))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  dirigeant_id uuid not null references public.profiles (id) on delete restrict,
  pack_id uuid not null references public.packs (id) on delete restrict,
  -- Valeurs figées au moment de la déclaration : un changement de prix ne les modifie pas.
  pack_name text not null,
  credits integer not null check (credits > 0),
  amount_fcfa integer not null check (amount_fcfa > 0),
  provider text not null default 'manuel',
  operator public.payment_operator,
  pay_to_phone text,
  external_reference text not null check (length(external_reference) between 4 and 64),
  status public.payment_status not null default 'en_attente_validation',
  rejection_reason text,
  pioneer_bonus_credits integer not null default 0,
  webhook_payload jsonb,
  declared_at timestamptz not null default now(),
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  constraint rejection_has_reason check (status <> 'refuse' or length(trim(coalesce(rejection_reason, ''))) > 0)
);

-- Une même référence ne peut pas servir deux fois (sauf après un refus).
create unique index payments_reference_unique
  on public.payments (provider, upper(external_reference))
  where status <> 'refuse';
create index payments_status_idx on public.payments (status, declared_at);
create index payments_dirigeant_idx on public.payments (dirigeant_id);

create table public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  dirigeant_id uuid not null references public.profiles (id) on delete restrict,
  source public.credit_lot_source not null,
  payment_id uuid references public.payments (id) on delete restrict,
  pack_id uuid references public.packs (id) on delete set null,
  quantity integer not null check (quantity > 0),
  remaining integer not null check (remaining >= 0),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint remaining_le_quantity check (remaining <= quantity),
  constraint expires_after_purchase check (expires_at > purchased_at)
);

create index credit_lots_fefo_idx on public.credit_lots (dirigeant_id, expires_at) where remaining > 0;

-- Un crédit réservé à la soumission d'un dilemme, consommé à la tenue de la session.
create table public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  dirigeant_id uuid not null references public.profiles (id) on delete restrict,
  lot_id uuid not null references public.credit_lots (id) on delete restrict,
  dilemma_id uuid, -- clé étrangère ajoutée au lot 3 avec la table des dilemmes
  status public.reservation_status not null default 'reservee',
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index credit_reservations_dirigeant_idx on public.credit_reservations (dirigeant_id, status);

-- Journal immuable de toutes les opérations de crédit.
create table public.credit_movements (
  id bigint generated always as identity primary key,
  dirigeant_id uuid not null references public.profiles (id) on delete restrict,
  lot_id uuid references public.credit_lots (id) on delete restrict,
  reservation_id uuid references public.credit_reservations (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete restrict,
  type public.credit_movement_type not null,
  -- Effet sur le nombre de crédits disponibles : +5 à l'achat, -1 à la réservation…
  delta integer not null,
  reason text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index credit_movements_dirigeant_idx on public.credit_movements (dirigeant_id, created_at desc);

-- Le journal ne se modifie ni ne se supprime, même par un admin.
create function public.forbid_mutation() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Le journal des crédits est immuable' using errcode = 'insufficient_privilege';
end;
$$;

create trigger credit_movements_immutable
  before update or delete on public.credit_movements
  for each row execute function public.forbid_mutation();

create trigger packs_touch before update on public.packs
  for each row execute function public.touch_updated_at();
create trigger payment_methods_touch before update on public.payment_methods
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security : lecture seule pour les utilisateurs,
-- toutes les écritures passent par les fonctions ci-dessous.
-- ---------------------------------------------------------------------------

alter table public.packs enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.credit_lots enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.credit_movements enable row level security;

revoke all on public.packs, public.payment_methods, public.payments, public.credit_lots,
  public.credit_reservations, public.credit_movements from anon;
revoke insert, update, delete on public.payments, public.credit_lots,
  public.credit_reservations, public.credit_movements from authenticated;

-- Packs et moyens de paiement : les dirigeants voient ceux qui sont actifs
-- (les prix ne sont jamais publics : connexion obligatoire).
create policy "packs : dirigeant voit les actifs" on public.packs
  for select to authenticated using (active and public.has_role('dirigeant'));
create policy "packs : admin lit tout" on public.packs
  for select to authenticated using (public.is_admin());
create policy "packs : admin crée" on public.packs
  for insert to authenticated with check (public.is_admin());
create policy "packs : admin modifie" on public.packs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "moyens de paiement : dirigeant voit les actifs" on public.payment_methods
  for select to authenticated using (active and public.has_role('dirigeant'));
create policy "moyens de paiement : admin lit tout" on public.payment_methods
  for select to authenticated using (public.is_admin());
create policy "moyens de paiement : admin modifie" on public.payment_methods
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "paiements : les siens" on public.payments
  for select to authenticated using (dirigeant_id = auth.uid());
create policy "paiements : admin lit tout" on public.payments
  for select to authenticated using (public.is_admin());

create policy "lots : les siens" on public.credit_lots
  for select to authenticated using (dirigeant_id = auth.uid());
create policy "lots : admin lit tout" on public.credit_lots
  for select to authenticated using (public.is_admin());

create policy "réservations : les siennes" on public.credit_reservations
  for select to authenticated using (dirigeant_id = auth.uid());
create policy "réservations : admin lit tout" on public.credit_reservations
  for select to authenticated using (public.is_admin());

create policy "mouvements : les siens" on public.credit_movements
  for select to authenticated using (dirigeant_id = auth.uid());
create policy "mouvements : admin lit tout" on public.credit_movements
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Lecture des paramètres
-- ---------------------------------------------------------------------------

create function public.setting_int(p_key text, p_default integer) returns integer
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = p_key), p_default)
$$;

create function public.setting_bool(p_key text, p_default boolean) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::boolean from public.settings where key = p_key), p_default)
$$;

-- Configuration d'achat visible par le dirigeant (sans exposer la table settings).
create function public.purchase_config() returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'manual_payment_enabled', public.setting_bool('manual_payment_enabled', true),
    'eur_display_enabled', public.setting_bool('eur_display_enabled', false),
    'pioneer_offer_available',
      public.setting_bool('pioneer_offer_enabled', false)
      and (select count(*) from public.payments where pioneer_bonus_credits > 0)
          < public.setting_int('pioneer_offer_limit', 10)
      and not exists (
        select 1 from public.payments
        where dirigeant_id = auth.uid() and pioneer_bonus_credits > 0
      ),
    'pioneer_bonus_credits', public.setting_int('pioneer_bonus_credits', 1),
    'credit_validity_months', public.setting_int('credit_validity_months', 12),
    'credit_expiry_alert_days', public.setting_int('credit_expiry_alert_days', 30),
    'validation_delay_text', coalesce(
      (select value #>> '{}' from public.settings where key = 'payment_validation_delay_text'),
      'sous 24 h ouvrées')
  )
$$;

-- ---------------------------------------------------------------------------
-- Solde
-- ---------------------------------------------------------------------------

create function public.credit_balance(p_dirigeant uuid) returns integer
language sql stable
set search_path = ''
as $$
  -- Soumis aux règles de lecture : un utilisateur n'obtient que son propre solde.
  select coalesce(sum(remaining), 0)::integer
  from public.credit_lots
  where dirigeant_id = p_dirigeant and remaining > 0 and expires_at > now()
$$;

-- ---------------------------------------------------------------------------
-- Fonctions internes (non exposées)
-- ---------------------------------------------------------------------------

-- Crée un lot et son mouvement d'entrée.
create function public._grant_lot(
  p_dirigeant uuid, p_source public.credit_lot_source, p_quantity integer,
  p_payment uuid, p_pack uuid, p_movement public.credit_movement_type, p_reason text
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  lot_id uuid;
begin
  insert into public.credit_lots (dirigeant_id, source, payment_id, pack_id, quantity, remaining, purchased_at, expires_at)
  values (p_dirigeant, p_source, p_payment, p_pack, p_quantity, p_quantity, now(),
          now() + make_interval(months => public.setting_int('credit_validity_months', 12)))
  returning id into lot_id;

  insert into public.credit_movements (dirigeant_id, lot_id, payment_id, type, delta, reason, actor_id)
  values (p_dirigeant, lot_id, p_payment, p_movement, p_quantity, p_reason, auth.uid());
  return lot_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paiement manuel
-- ---------------------------------------------------------------------------

-- Le dirigeant déclare avoir payé : aucun crédit n'est créé à ce stade.
create function public.declare_payment(p_pack_id uuid, p_operator public.payment_operator, p_reference text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  pack public.packs;
  method public.payment_methods;
  ref text := upper(regexp_replace(coalesce(p_reference, ''), '\s', '', 'g'));
  new_id uuid;
begin
  if me is null or not public.has_role('dirigeant') then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('manual_payment_enabled', true) then
    raise exception 'paiement_manuel_desactive' using errcode = 'check_violation';
  end if;
  if length(ref) < 4 or length(ref) > 64 then
    raise exception 'reference_invalide' using errcode = 'check_violation';
  end if;

  select * into pack from public.packs where id = p_pack_id and active;
  if not found then
    raise exception 'pack_indisponible' using errcode = 'check_violation';
  end if;
  select * into method from public.payment_methods where operator = p_operator and active;
  if not found then
    raise exception 'moyen_indisponible' using errcode = 'check_violation';
  end if;

  -- Limite les déclarations en attente (évite les envois répétés par erreur).
  if (select count(*) from public.payments where dirigeant_id = me and status = 'en_attente_validation') >= 3 then
    raise exception 'trop_de_paiements_en_attente' using errcode = 'check_violation';
  end if;

  begin
    insert into public.payments (dirigeant_id, pack_id, pack_name, credits, amount_fcfa, provider, operator, pay_to_phone, external_reference)
    values (me, pack.id, pack.name, pack.credits, pack.price_fcfa, 'manuel', method.operator, method.phone, ref)
    returning id into new_id;
  exception when unique_violation then
    raise exception 'reference_deja_utilisee' using errcode = 'unique_violation';
  end;

  perform public.log_audit('paiement_declare', 'payment', new_id::text,
    jsonb_build_object('pack', pack.name, 'montant_fcfa', pack.price_fcfa, 'operateur', method.operator));
  return new_id;
end;
$$;

-- Validation par l'admin : seule voie (avec le futur webhook) qui crée des crédits achetés.
create function public.confirm_payment(p_payment_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  pay public.payments;
  pack public.packs;
  bonus integer := 0;
  used integer;
  lim integer;
begin
  if not public.is_admin() then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;

  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'paiement_introuvable' using errcode = 'no_data_found';
  end if;
  if pay.status <> 'en_attente_validation' then
    raise exception 'paiement_deja_traite' using errcode = 'check_violation';
  end if;

  select * into pack from public.packs where id = pay.pack_id;

  perform public._grant_lot(pay.dirigeant_id, 'achat', pay.credits, pay.id, pay.pack_id, 'achat',
    format('Achat %s', pay.pack_name));

  -- Offre Pionniers : places comptées sous verrou, une fois par dirigeant.
  if pack.pioneer_eligible and public.setting_bool('pioneer_offer_enabled', false) then
    perform 1 from public.settings where key = 'pioneer_offer_enabled' for update;
    select count(*) into used from public.payments where pioneer_bonus_credits > 0;
    lim := public.setting_int('pioneer_offer_limit', 10);
    if used < lim and not exists (
      select 1 from public.payments where dirigeant_id = pay.dirigeant_id and pioneer_bonus_credits > 0
    ) then
      bonus := public.setting_int('pioneer_bonus_credits', 1);
      perform public._grant_lot(pay.dirigeant_id, 'pionnier', bonus, pay.id, pay.pack_id, 'achat', 'Offre Pionniers');
      if used + 1 >= lim then
        update public.settings set value = 'false', updated_by = auth.uid(), updated_at = now()
        where key = 'pioneer_offer_enabled';
      end if;
    end if;
  end if;

  update public.payments
  set status = 'confirme', pioneer_bonus_credits = bonus, validated_by = auth.uid(), validated_at = now()
  where id = pay.id;

  perform public.log_audit('paiement_confirme', 'payment', pay.id::text,
    jsonb_build_object('credits', pay.credits, 'bonus_pionnier', bonus));
end;
$$;

create function public.reject_payment(p_payment_id uuid, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  pay public.payments;
begin
  if not public.is_admin() then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'motif_obligatoire' using errcode = 'check_violation';
  end if;
  select * into pay from public.payments where id = p_payment_id for update;
  if not found or pay.status <> 'en_attente_validation' then
    raise exception 'paiement_deja_traite' using errcode = 'check_violation';
  end if;
  update public.payments
  set status = 'refuse', rejection_reason = trim(p_reason), validated_by = auth.uid(), validated_at = now()
  where id = pay.id;
  perform public.log_audit('paiement_refuse', 'payment', pay.id::text, jsonb_build_object('motif', trim(p_reason)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajustement admin (motif obligatoire)
-- ---------------------------------------------------------------------------

create function public.adjust_credits(p_dirigeant uuid, p_delta integer, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  lot record;
  left_to_remove integer;
  take integer;
begin
  if not public.is_admin() then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'motif_obligatoire' using errcode = 'check_violation';
  end if;
  if p_delta = 0 or abs(p_delta) > 100 then
    raise exception 'quantite_invalide' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_dirigeant and role = 'dirigeant') then
    raise exception 'dirigeant_introuvable' using errcode = 'no_data_found';
  end if;

  if p_delta > 0 then
    perform public._grant_lot(p_dirigeant, 'ajustement', p_delta, null, null, 'ajustement', trim(p_reason));
  else
    left_to_remove := -p_delta;
    for lot in
      select id, remaining from public.credit_lots
      where dirigeant_id = p_dirigeant and remaining > 0 and expires_at > now()
      order by expires_at, purchased_at
      for update
    loop
      exit when left_to_remove = 0;
      take := least(lot.remaining, left_to_remove);
      update public.credit_lots set remaining = remaining - take where id = lot.id;
      insert into public.credit_movements (dirigeant_id, lot_id, type, delta, reason, actor_id)
      values (p_dirigeant, lot.id, 'ajustement', -take, trim(p_reason), auth.uid());
      left_to_remove := left_to_remove - take;
    end loop;
    if left_to_remove > 0 then
      raise exception 'credits_insuffisants' using errcode = 'check_violation';
    end if;
  end if;

  perform public.log_audit('credits_ajustes', 'dirigeant', p_dirigeant::text,
    jsonb_build_object('delta', p_delta, 'motif', trim(p_reason)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Réservation, consommation, restitution (utilisées par le cycle de session au lot 3)
-- ---------------------------------------------------------------------------

create function public.reserve_credit(p_dirigeant uuid, p_dilemma_id uuid default null) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  lot record;
  res_id uuid;
begin
  if not (p_dirigeant = auth.uid() and public.has_role('dirigeant')) and not public.is_admin() then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;

  -- Le lot qui expire le plus tôt d'abord.
  select id into lot from public.credit_lots
  where dirigeant_id = p_dirigeant and remaining > 0 and expires_at > now()
  order by expires_at, purchased_at
  limit 1
  for update;
  if not found then
    raise exception 'credits_insuffisants' using errcode = 'check_violation';
  end if;

  update public.credit_lots set remaining = remaining - 1 where id = lot.id;
  insert into public.credit_reservations (dirigeant_id, lot_id, dilemma_id)
  values (p_dirigeant, lot.id, p_dilemma_id) returning id into res_id;
  insert into public.credit_movements (dirigeant_id, lot_id, reservation_id, type, delta, reason, actor_id)
  values (p_dirigeant, lot.id, res_id, 'reservation', -1, 'Soumission d''un dilemme', auth.uid());
  return res_id;
end;
$$;

-- Session tenue : la réservation devient consommation (le solde ne change pas).
create function public.consume_reservation(p_reservation_id uuid) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  res public.credit_reservations;
begin
  if not (public.is_admin() or public.is_facilitator()) then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;
  select * into res from public.credit_reservations where id = p_reservation_id for update;
  if not found or res.status <> 'reservee' then
    raise exception 'reservation_deja_reglee' using errcode = 'check_violation';
  end if;
  update public.credit_reservations set status = 'consommee', settled_at = now() where id = res.id;
  insert into public.credit_movements (dirigeant_id, lot_id, reservation_id, type, delta, reason, actor_id)
  values (res.dirigeant_id, res.lot_id, res.id, 'consommation', 0, 'Session tenue', auth.uid());
end;
$$;

-- Annulation : restitution si plus de N heures avant la session (ou session non planifiée),
-- sinon consommation. Renvoie 'restituee' ou 'consommee'.
create function public.cancel_reservation(p_reservation_id uuid, p_session_at timestamptz default null)
returns public.reservation_status
language plpgsql security definer
set search_path = ''
as $$
declare
  res public.credit_reservations;
  lot public.credit_lots;
  threshold interval := make_interval(hours => public.setting_int('cancellation_threshold_hours', 24));
begin
  select * into res from public.credit_reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'reservation_introuvable' using errcode = 'no_data_found';
  end if;
  if not (res.dirigeant_id = auth.uid() or public.is_admin()) then
    raise exception 'acces_refuse' using errcode = 'insufficient_privilege';
  end if;
  if res.status <> 'reservee' then
    raise exception 'reservation_deja_reglee' using errcode = 'check_violation';
  end if;

  if p_session_at is not null and now() > p_session_at - threshold then
    update public.credit_reservations set status = 'consommee', settled_at = now() where id = res.id;
    insert into public.credit_movements (dirigeant_id, lot_id, reservation_id, type, delta, reason, actor_id)
    values (res.dirigeant_id, res.lot_id, res.id, 'consommation', 0, 'Annulation tardive', auth.uid());
    return 'consommee';
  end if;

  select * into lot from public.credit_lots where id = res.lot_id for update;
  update public.credit_lots set remaining = remaining + 1 where id = lot.id;
  update public.credit_reservations set status = 'restituee', settled_at = now() where id = res.id;
  insert into public.credit_movements (dirigeant_id, lot_id, reservation_id, type, delta, reason, actor_id)
  values (res.dirigeant_id, lot.id, res.id, 'restitution', 1, 'Annulation', auth.uid());

  -- Restitution sur un lot déjà expiré : le crédit expire aussitôt.
  if lot.expires_at <= now() then
    update public.credit_lots set remaining = remaining - 1 where id = lot.id;
    insert into public.credit_movements (dirigeant_id, lot_id, type, delta, reason)
    values (res.dirigeant_id, lot.id, 'expiration', -1, 'Lot expiré');
  end if;
  return 'restituee';
end;
$$;

-- ---------------------------------------------------------------------------
-- Expiration (job quotidien)
-- ---------------------------------------------------------------------------
-- Le solde exclut déjà les lots expirés : ce job ne fait qu'inscrire
-- l'expiration au journal et remettre le restant à zéro.

create function public.expire_credit_lots() returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  lot record;
  n integer := 0;
begin
  for lot in
    select id, dirigeant_id, remaining from public.credit_lots
    where remaining > 0 and expires_at <= now()
    for update
  loop
    update public.credit_lots set remaining = 0 where id = lot.id;
    insert into public.credit_movements (dirigeant_id, lot_id, type, delta, reason)
    values (lot.dirigeant_id, lot.id, 'expiration', -lot.remaining, 'Lot expiré');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------

revoke execute on function public._grant_lot(uuid, public.credit_lot_source, integer, uuid, uuid, public.credit_movement_type, text)
  from public, anon, authenticated;
revoke execute on function public.expire_credit_lots() from public, anon, authenticated;
revoke execute on function public.forbid_mutation() from public, anon, authenticated;

revoke execute on function public.setting_int(text, integer), public.setting_bool(text, boolean),
  public.purchase_config(), public.credit_balance(uuid),
  public.declare_payment(uuid, public.payment_operator, text), public.confirm_payment(uuid),
  public.reject_payment(uuid, text), public.adjust_credits(uuid, integer, text),
  public.reserve_credit(uuid, uuid), public.consume_reservation(uuid),
  public.cancel_reservation(uuid, timestamptz)
  from public, anon;
grant execute on function public.purchase_config(), public.credit_balance(uuid),
  public.declare_payment(uuid, public.payment_operator, text), public.confirm_payment(uuid),
  public.reject_payment(uuid, text), public.adjust_credits(uuid, integer, text),
  public.reserve_credit(uuid, uuid), public.consume_reservation(uuid),
  public.cancel_reservation(uuid, timestamptz)
  to authenticated;
revoke execute on function public.setting_int(text, integer), public.setting_bool(text, boolean) from authenticated;

-- ---------------------------------------------------------------------------
-- Valeurs de départ (modifiables en back-office)
-- ---------------------------------------------------------------------------

insert into public.packs (name, credits, price_fcfa, pioneer_eligible, sort_order) values
  ('Découverte', 1, 135000, false, 1),
  ('Pack 5', 5, 600000, true, 2),
  ('Pack 10', 10, 1000000, false, 3);

insert into public.payment_methods (operator, label, phone, beneficiary, ussd_code, active, sort_order) values
  ('orange_money', 'Orange Money', '+237659989910', '', '#150#', false, 1),
  ('mtn_momo', 'MTN Mobile Money', '', '', '*126#', false, 2);

update public.settings set value = '12' where key = 'credit_validity_months';
update public.settings set value = '24' where key = 'cancellation_threshold_hours';

insert into public.settings (key, value, description) values
  ('pioneer_offer_enabled', 'true', 'Offre Pionniers active (se désactive seule une fois la limite atteinte)'),
  ('pioneer_offer_limit', '10', 'Nombre de dirigeants pouvant bénéficier de l''offre Pionniers'),
  ('pioneer_bonus_credits', '1', 'Crédits offerts par l''offre Pionniers'),
  ('eur_display_enabled', 'false', 'Afficher l''équivalent en euros (parité fixe 1 € = 655,957 FCFA)'),
  ('payment_validation_delay_text', '"sous 24 h ouvrées"', 'Délai de validation affiché au dirigeant');

-- Les paramètres sont modifiés en back-office par un admin avec 2FA.
create policy "paramètres : admin crée" on public.settings
  for insert to authenticated with check (public.is_admin());
