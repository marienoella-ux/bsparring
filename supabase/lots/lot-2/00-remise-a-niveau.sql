-- ---------------------------------------------------------------------------
-- Remise à niveau : met de côté les objets du lot 2 déjà présents
-- ---------------------------------------------------------------------------
-- Une base peut contenir une version partielle ou ancienne du lot 2. Plutôt
-- que de deviner les écarts, on déplace ces objets (avec leurs données) dans
-- un schéma de sauvegarde propre à cette exécution (lot2_ancien_<date>),
-- puis on recrée la version finale. Rien n'est supprimé, sauf les fonctions
-- (recréées à l'identique plus bas). Une fois le lot 2 vérifié, ces schémas
-- peuvent être supprimés : drop schema lot2_ancien_<date> cascade;

do $$
declare
  backup text := 'lot2_ancien_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS_US');
  created boolean := false;
  t text;
  r record;
begin
  -- Tables (enfants d'abord), avec leurs index, contraintes et données.
  foreach t in array array['credit_movements', 'credit_reservations', 'credit_lots', 'payments', 'payment_methods', 'packs'] loop
    if to_regclass(format('public.%I', t)) is not null then
      if not created then
        execute format('create schema %I', backup);
        execute format('revoke all on schema %I from public, anon, authenticated', backup);
        created := true;
      end if;
      execute format('alter table public.%I set schema %I', t, backup);
      raise notice 'Table % mise de côté dans %.%', t, backup, t;
    end if;
  end loop;

  -- Fonctions du lot 2 : supprimées (toutes signatures), recréées plus bas.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'forbid_mutation', 'setting_int', 'setting_bool', 'purchase_config', 'credit_balance',
        '_grant_lot', 'declare_payment', 'confirm_payment', 'reject_payment', 'adjust_credits',
        'reserve_credit', 'consume_reservation', 'cancel_reservation', 'expire_credit_lots'])
  loop
    execute format('drop function %s cascade', r.sig);
  end loop;

  -- Types énumérés : déplacés aussi (les tables mises de côté les utilisent encore).
  foreach t in array array['payment_status', 'payment_operator', 'credit_lot_source', 'credit_movement_type', 'reservation_status'] loop
    if to_regtype(format('public.%I', t)) is not null then
      if not created then
        execute format('create schema %I', backup);
        execute format('revoke all on schema %I from public, anon, authenticated', backup);
        created := true;
      end if;
      execute format('alter type public.%I set schema %I', t, backup);
    end if;
  end loop;
end $$;

-- Paramètres et règle ajoutés par le lot 2 : remis à leur valeur de départ.
drop policy if exists "paramètres : admin crée" on public.settings;
delete from public.settings
where key in ('pioneer_offer_enabled', 'pioneer_offer_limit', 'pioneer_bonus_credits',
              'eur_display_enabled', 'payment_validation_delay_text');

-- Suivi des migrations (créé par le lot 1 s'il a été appliqué par fichier).
create table if not exists public.bs_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.bs_schema_migrations enable row level security;
revoke all on public.bs_schema_migrations from anon, authenticated;
delete from public.bs_schema_migrations where version like '20261015%';
