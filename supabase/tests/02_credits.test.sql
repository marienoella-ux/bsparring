-- Tests du lot 2 : packs, paiement manuel, crédits, offre Pionniers.

-- ---------------------------------------------------------------------------
-- Comptes de test
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('20000000-0000-0000-0000-0000000000d1', 'd1@exemple.cm', '{"signup":"dirigeant","full_name":"Dirigeant Un","organization_name":"Org 1"}'),
  ('20000000-0000-0000-0000-0000000000d2', 'd2@exemple.cm', '{"signup":"dirigeant","full_name":"Dirigeant Deux","organization_name":"Org 2"}'),
  ('20000000-0000-0000-0000-0000000000d3', 'd3@exemple.cm', '{"signup":"dirigeant","full_name":"Dirigeant Trois","organization_name":"Org 3"}'),
  ('20000000-0000-0000-0000-0000000000a1', 'admin@brainiacscompany.com', '{"full_name":"Admin"}'),
  ('20000000-0000-0000-0000-0000000000e1', 'expert@exemple.cm', '{"full_name":"Expert"}');
insert into public.user_roles (user_id, role) values
  ('20000000-0000-0000-0000-0000000000a1', 'admin'),
  ('20000000-0000-0000-0000-0000000000e1', 'expert');

create function test.pack_id(p_name text) returns uuid language sql as $$
  select id from public.packs where name = p_name
$$;
grant execute on function test.pack_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Packs : visibles des dirigeants connectés seulement
-- ---------------------------------------------------------------------------
select test.as_anon();
select test.expect_error('select 1 from public.packs', 'permission denied', 'un anonyme lit les packs');
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000e1');
select test.check((select count(*) = 0 from public.packs), 'un expert ne voit pas les packs');
select test.check((select count(*) = 0 from public.payment_methods), 'un expert ne voit pas les moyens de paiement');
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000d1');
select test.check((select count(*) = 3 from public.packs), 'un dirigeant voit les 3 packs actifs');
select test.check((select price_fcfa = 600000 and credits = 5 from public.packs where name = 'Pack 5'), 'prix du Pack 5');
select test.check(public.credit_balance(auth.uid()) = 0, 'solde initial nul');
select test.check((public.purchase_config() ->> 'pioneer_offer_available')::boolean, 'offre Pionniers annoncée');
select test.check(not (public.purchase_config() ->> 'eur_display_enabled')::boolean, 'affichage EUR désactivé par défaut');

-- Aucun moyen de paiement actif tant que le bénéficiaire n'est pas renseigné
select test.expect_error(
  $$select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'OM241015.1234.A1')$$,
  'moyen_indisponible', 'déclaration sans moyen de paiement actif');
reset role;

-- ---------------------------------------------------------------------------
-- Admin : renseigne le bénéficiaire et active Orange Money
-- ---------------------------------------------------------------------------
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal1');
update public.payment_methods set beneficiary = 'Pirate', active = true where operator = 'orange_money';
reset role;
select test.check(
  (select not active from public.payment_methods where operator = 'orange_money'),
  'un admin sans 2FA ne modifie pas les moyens de paiement');

select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
update public.payment_methods set beneficiary = 'BRAINIACS SARL', active = true where operator = 'orange_money';
select test.expect_error(
  $$update public.payment_methods set active = true where operator = 'mtn_momo'$$,
  'active_requires_details', 'activer MTN sans numéro ni bénéficiaire');
reset role;

-- ---------------------------------------------------------------------------
-- Déclaration d'un paiement : aucun crédit avant validation
-- ---------------------------------------------------------------------------
select test.as_user('20000000-0000-0000-0000-0000000000d1');
select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'om 2410 15 A1');
select test.check(public.credit_balance(auth.uid()) = 0, 'une déclaration ne crée aucun crédit');
select test.check(
  (select status = 'en_attente_validation' and amount_fcfa = 600000 and external_reference = 'OM241015A1'
     and pay_to_phone = '+237659989910' from public.payments),
  'paiement en attente, montant et référence normalisée figés');

select test.expect_error(
  $$select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'OM241015a1')$$,
  'reference_deja_utilisee', 'une même référence déclarée deux fois');
select test.expect_error(
  $$select public.declare_payment(test.pack_id('Pack 5'), 'mtn_momo', 'MTN123456')$$,
  'moyen_indisponible', 'déclaration sur un moyen inactif');
select test.expect_error(
  $$select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'ab')$$,
  'reference_invalide', 'référence trop courte');

-- Écritures directes interdites
select test.expect_error(
  $$insert into public.credit_lots (dirigeant_id, source, quantity, remaining, expires_at)
    values (auth.uid(), 'achat', 50, 50, now() + interval '1 year')$$,
  'permission denied', 'un dirigeant se crée des crédits');
select test.expect_error(
  $$update public.payments set status = 'confirme'$$,
  'permission denied', 'un dirigeant valide son propre paiement');
select test.expect_error(
  $$select public.confirm_payment((select id from public.payments limit 1))$$,
  'acces_refuse', 'un dirigeant appelle confirm_payment');
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal1');
select test.expect_error(
  $$select public.confirm_payment('00000000-0000-0000-0000-000000000000')$$,
  'acces_refuse', 'un admin sans 2FA valide un paiement');
reset role;

-- Un autre dirigeant ne voit pas ce paiement
select test.as_user('20000000-0000-0000-0000-0000000000d2');
select test.check((select count(*) = 0 from public.payments), 'un dirigeant ne voit pas les paiements des autres');
reset role;

-- ---------------------------------------------------------------------------
-- Validation par l'admin + offre Pionniers
-- ---------------------------------------------------------------------------
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select public.confirm_payment((select id from public.payments where dirigeant_id = '20000000-0000-0000-0000-0000000000d1'));
select test.expect_error(
  $$select public.confirm_payment((select id from public.payments where dirigeant_id = '20000000-0000-0000-0000-0000000000d1'))$$,
  'paiement_deja_traite', 'valider deux fois le même paiement');
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000d1');
select test.check(public.credit_balance(auth.uid()) = 6, 'Pack 5 + offre Pionniers = 6 crédits');
select test.check((select count(*) = 2 from public.credit_lots), 'un lot acheté et un lot Pionniers');
select test.check(
  (select count(distinct expires_at) = 1 from public.credit_lots),
  'le crédit Pionniers expire avec le lot du pack');
select test.check(
  (select bool_and(expires_at::date = (purchased_at + interval '12 months')::date) from public.credit_lots),
  'validité de 12 mois à partir de l''achat');
select test.check(not (public.purchase_config() ->> 'pioneer_offer_available')::boolean,
  'l''offre n''est plus proposée à un dirigeant qui en a bénéficié');

-- Second Pack 5 : pas de second bonus
select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'OM-SECOND-ACHAT');
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select public.confirm_payment((select id from public.payments where external_reference = 'OM-SECOND-ACHAT'));
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000d1');
select test.check(public.credit_balance(auth.uid()) = 11, 'pas de second bonus Pionniers (6 + 5)');
reset role;

-- ---------------------------------------------------------------------------
-- Refus : motif obligatoire, la référence redevient utilisable
-- ---------------------------------------------------------------------------
select test.as_user('20000000-0000-0000-0000-0000000000d2');
select public.declare_payment(test.pack_id('Découverte'), 'orange_money', 'OM-ERREUR-01');
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select test.expect_error(
  $$select public.reject_payment((select id from public.payments where external_reference = 'OM-ERREUR-01'), '  ')$$,
  'motif_obligatoire', 'refus sans motif');
select public.reject_payment((select id from public.payments where external_reference = 'OM-ERREUR-01'), 'Montant reçu : 13 500 FCFA');
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000d2');
select test.check(
  (select status = 'refuse' and rejection_reason like 'Montant%' from public.payments),
  'le dirigeant voit le refus et son motif');
select test.check(public.credit_balance(auth.uid()) = 0, 'un refus ne crée aucun crédit');
select public.declare_payment(test.pack_id('Découverte'), 'orange_money', 'OM-ERREUR-01');
reset role;

-- ---------------------------------------------------------------------------
-- Limite de l'offre Pionniers : désactivation automatique
-- ---------------------------------------------------------------------------
update public.settings set value = '2' where key = 'pioneer_offer_limit';

select test.as_user('20000000-0000-0000-0000-0000000000d2');
select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'OM-D2-PACK5');
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000d3');
select public.declare_payment(test.pack_id('Pack 5'), 'orange_money', 'OM-D3-PACK5');
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select public.confirm_payment((select id from public.payments where external_reference = 'OM-D2-PACK5'));
select test.check(
  (select value = 'false'::jsonb from public.settings where key = 'pioneer_offer_enabled'),
  'l''offre se désactive seule une fois la limite atteinte');
select public.confirm_payment((select id from public.payments where external_reference = 'OM-D3-PACK5'));
reset role;

select test.as_user('20000000-0000-0000-0000-0000000000d3');
select test.check(public.credit_balance(auth.uid()) = 5, 'au-delà de la limite : pas de bonus');
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000d2');
select test.check(public.credit_balance(auth.uid()) = 6, 'la 2e place Pionniers est attribuée');
reset role;

-- ---------------------------------------------------------------------------
-- Réservation (lot qui expire le plus tôt d'abord), annulation, consommation
-- ---------------------------------------------------------------------------
-- Lot ancien de d3, qui expire dans 10 jours
insert into public.credit_lots (id, dirigeant_id, source, quantity, remaining, purchased_at, expires_at)
values ('20000000-0000-0000-0000-00000000107a', '20000000-0000-0000-0000-0000000000d3', 'ajustement', 2, 2,
        now() - interval '355 days', now() + interval '10 days');
insert into public.credit_movements (dirigeant_id, lot_id, type, delta, reason)
values ('20000000-0000-0000-0000-0000000000d3', '20000000-0000-0000-0000-00000000107a', 'ajustement', 2, 'Test');

select test.as_user('20000000-0000-0000-0000-0000000000d3');
select test.check(public.credit_balance(auth.uid()) = 7, 'solde 5 + 2');
select public.reserve_credit(auth.uid());
select test.check(public.credit_balance(auth.uid()) = 6, 'la réservation retire un crédit du solde');
select test.check(
  (select lot_id = '20000000-0000-0000-0000-00000000107a' from public.credit_reservations),
  'la réservation prend le lot qui expire le plus tôt');

-- Annulation plus de 24 h avant la session : crédit restitué
select test.check(
  public.cancel_reservation((select id from public.credit_reservations limit 1), now() + interval '3 days') = 'restituee',
  'annulation à J-3 : restitution');
select test.check(public.credit_balance(auth.uid()) = 7, 'le solde revient à 7 après restitution');

-- Annulation moins de 24 h avant : crédit consommé
select public.reserve_credit(auth.uid());
select test.check(
  public.cancel_reservation((select id from public.credit_reservations where status = 'reservee'), now() + interval '5 hours') = 'consommee',
  'annulation à H-5 : consommation');
select test.check(public.credit_balance(auth.uid()) = 6, 'le crédit reste consommé');

select test.expect_error(
  $$select public.reserve_credit('20000000-0000-0000-0000-0000000000d1')$$,
  'acces_refuse', 'réserver sur le compte d''un autre');
reset role;

-- Un autre dirigeant n'annule pas la réservation de d3
select test.as_user('20000000-0000-0000-0000-0000000000d3');
select public.reserve_credit(auth.uid());
reset role;
select id as res_d3 from public.credit_reservations where status = 'reservee' \gset
select test.as_user('20000000-0000-0000-0000-0000000000d2');
select test.check((select count(*) = 0 from public.credit_reservations), 'un dirigeant ne voit pas les réservations des autres');
select test.expect_error(format('select public.cancel_reservation(%L)', :'res_d3'),
  'acces_refuse', 'annuler la réservation d''un autre dirigeant');
select test.expect_error(format('select public.consume_reservation(%L)', :'res_d3'),
  'acces_refuse', 'un dirigeant consomme une réservation');
reset role;

-- Session tenue : consommation par l'admin (ou le facilitateur), solde inchangé
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select public.consume_reservation((select id from public.credit_reservations where status = 'reservee'));
reset role;
select test.as_user('20000000-0000-0000-0000-0000000000d3');
select test.check(public.credit_balance(auth.uid()) = 5, 'consommation : le solde reste à 5');
select test.expect_error(
  $$select public.reserve_credit(auth.uid()) from generate_series(1, 6)$$,
  'credits_insuffisants', 'réserver plus que le solde');
reset role;
select test.check(
  (select count(*) = 0 from public.credit_reservations where dirigeant_id = '20000000-0000-0000-0000-0000000000d3' and status = 'reservee'),
  'une réservation refusée annule toute la transaction');

-- ---------------------------------------------------------------------------
-- Expiration
-- ---------------------------------------------------------------------------
insert into public.credit_lots (dirigeant_id, source, quantity, remaining, purchased_at, expires_at)
values ('20000000-0000-0000-0000-0000000000d2', 'ajustement', 3, 3, now() - interval '13 months', now() - interval '1 day');
insert into public.credit_movements (dirigeant_id, type, delta, reason, lot_id)
select dirigeant_id, 'ajustement', 3, 'Test', id from public.credit_lots where remaining = 3 and expires_at < now();

select test.as_user('20000000-0000-0000-0000-0000000000d2');
select test.check(public.credit_balance(auth.uid()) = 6, 'un lot expiré ne compte pas dans le solde');
select test.expect_error('select public.expire_credit_lots()', 'permission denied', 'un dirigeant lance l''expiration');
reset role;

select test.check(public.expire_credit_lots() = 1, 'le job d''expiration traite le lot expiré');
select test.check(
  (select remaining = 0 from public.credit_lots where expires_at < now() and dirigeant_id = '20000000-0000-0000-0000-0000000000d2'),
  'restant remis à zéro');
select test.check(
  (select count(*) = 1 from public.credit_movements where type = 'expiration' and delta = -3),
  'expiration inscrite au journal');
select test.check(public.expire_credit_lots() = 0, 'le job ne traite pas deux fois le même lot');

-- ---------------------------------------------------------------------------
-- Ajustements admin
-- ---------------------------------------------------------------------------
select test.as_user('20000000-0000-0000-0000-0000000000a1', 'aal2');
select test.expect_error(
  $$select public.adjust_credits('20000000-0000-0000-0000-0000000000d2', 2, '')$$,
  'motif_obligatoire', 'ajustement sans motif');
select test.expect_error(
  $$select public.adjust_credits('20000000-0000-0000-0000-0000000000d2', -50, 'Erreur')$$,
  'credits_insuffisants', 'retrait supérieur au solde');
select test.expect_error(
  $$select public.adjust_credits('20000000-0000-0000-0000-0000000000e1', 1, 'Geste')$$,
  'dirigeant_introuvable', 'créditer un compte qui n''est pas dirigeant');
select public.adjust_credits('20000000-0000-0000-0000-0000000000d2', 2, 'Geste commercial');
select public.adjust_credits('20000000-0000-0000-0000-0000000000d2', -1, 'Correction de saisie');
select test.check(public.credit_balance('20000000-0000-0000-0000-0000000000d2') = 7, 'ajustements : 6 + 2 - 1');
reset role;

-- ---------------------------------------------------------------------------
-- Journal immuable et cohérent
-- ---------------------------------------------------------------------------
select test.expect_error('update public.credit_movements set delta = 100', 'immuable', 'modifier le journal (même en superutilisateur)');
select test.expect_error('delete from public.credit_movements', 'immuable', 'supprimer le journal (même en superutilisateur)');

-- Pour chaque dirigeant : somme des mouvements = somme des restants des lots
select test.check(
  not exists (
    select 1 from (
      select dirigeant_id, sum(delta) as total from public.credit_movements group by dirigeant_id
    ) m
    join (
      select dirigeant_id, sum(remaining) as total from public.credit_lots group by dirigeant_id
    ) l using (dirigeant_id)
    where m.total <> l.total
  ),
  'le journal et les lots concordent pour chaque dirigeant');

-- Toute validation, refus et ajustement est tracé dans l'audit
select test.check(
  (select count(*) >= 4 from public.audit_log where action = 'paiement_confirme')
  and exists (select 1 from public.audit_log where action = 'paiement_refuse')
  and exists (select 1 from public.audit_log where action = 'credits_ajustes'),
  'validations, refus et ajustements tracés dans l''audit');
