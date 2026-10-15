-- ---------------------------------------------------------------------------
-- Contrôle : objets du lot 2 et leur présence (résultat affiché par l'éditeur)
-- ---------------------------------------------------------------------------
with attendus(categorie, objet, present) as (
  select 'table', t, to_regclass('public.' || t) is not null
  from unnest(array['packs', 'payment_methods', 'payments', 'credit_lots', 'credit_reservations', 'credit_movements']) t
  union all
  select 'type', t, to_regtype('public.' || t) is not null
  from unnest(array['payment_status', 'payment_operator', 'credit_lot_source', 'credit_movement_type', 'reservation_status']) t
  union all
  select 'fonction', f, exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f)
  from unnest(array['purchase_config', 'credit_balance', 'declare_payment', 'confirm_payment', 'reject_payment',
                    'adjust_credits', 'reserve_credit', 'consume_reservation', 'cancel_reservation',
                    'expire_credit_lots', 'setting_int', 'setting_bool', '_grant_lot', 'forbid_mutation']) f
  union all
  select 'sécurité', 'RLS active sur ' || t,
    coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.' || t)), false)
  from unnest(array['packs', 'payment_methods', 'payments', 'credit_lots', 'credit_reservations', 'credit_movements']) t
  union all
  select 'sécurité', 'journal immuable (déclencheur)',
    exists (select 1 from pg_trigger where tgname = 'credit_movements_immutable'
            and tgrelid = to_regclass('public.credit_movements'))
  union all
  select 'données', 'packs : Découverte 135 000, Pack 5 600 000 (Pionniers), Pack 10 1 000 000',
    (select count(*) = 3 from public.packs
     where (name, credits, price_fcfa) in (('Découverte', 1, 135000), ('Pack 5', 5, 600000), ('Pack 10', 10, 1000000)))
  union all
  select 'données', 'Orange Money actif : +237659989910, Marie Noella Tetka',
    exists (select 1 from public.payment_methods where operator = 'orange_money'
            and phone = '+237659989910' and beneficiary = 'Marie Noella Tetka' and active)
  union all
  select 'données', 'MTN renseigné : +237678812669 (inactif sans bénéficiaire)',
    exists (select 1 from public.payment_methods where operator = 'mtn_momo' and phone = '+237678812669')
  union all
  select 'paramètre', k, exists (select 1 from public.settings where key = k)
  from unnest(array['credit_validity_months', 'cancellation_threshold_hours', 'pioneer_offer_enabled',
                    'pioneer_offer_limit', 'pioneer_bonus_credits', 'eur_display_enabled',
                    'payment_validation_delay_text', 'manual_payment_enabled']) k
  union all
  select 'migration', v, exists (select 1 from public.bs_schema_migrations where version = v)
  from unnest(array['20261015000001_credits', '20261015000002_moyens_paiement']) v
)
select categorie, objet, case when present then 'OK' else 'MANQUANT' end as etat
from attendus
order by present, categorie, objet;
