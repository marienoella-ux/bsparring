-- Tests de sécurité du socle (lot 1).
-- Chaque bloc se met dans la peau d'un utilisateur, puis vérifie ce que la base
-- lui laisse lire ou écrire. Un échec arrête l'exécution avec un message clair.

-- ---------------------------------------------------------------------------
-- Comptes de test
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'awa@exemple.cm',
   '{"signup":"dirigeant","full_name":"Awa Dirigeante","job_title":"DG","organization_name":"Société A","sector":"Agro","country":"Cameroun","whatsapp_phone":"+237600000001","terms_accepted":"true","confidentiality_accepted":"true"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@exemple.cm',
   '{"signup":"dirigeant","full_name":"Bruno Dirigeant","organization_name":"Société B","terms_accepted":"true","confidentiality_accepted":"true"}'),
  -- Tentative d'escalade : métadonnées qui réclament un rôle admin
  ('00000000-0000-0000-0000-00000000000c', 'pirate@exemple.cm',
   '{"signup":"admin","role":"admin","roles":["admin"],"full_name":"Pirate"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'nono@brainiacscompany.com', '{"full_name":"Nono"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'expert1@exemple.cm', '{"full_name":"Expert Un"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'expert2@exemple.cm', '{"full_name":"Expert Deux"}');

-- Amorçage du premier admin (fait en SQL par Brainiacs, hors application)
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin'),
  ('00000000-0000-0000-0000-0000000000ad', 'facilitateur');

-- ---------------------------------------------------------------------------
-- Inscription
-- ---------------------------------------------------------------------------
select test.check(
  (select count(*) = 1 from public.user_roles
   where user_id = '00000000-0000-0000-0000-00000000000a' and role = 'dirigeant'),
  'une inscription dirigeant reçoit le rôle dirigeant');
select test.check(
  (select o.name = 'Société A' and p.terms_accepted_at is not null and p.confidentiality_accepted_at is not null
   from public.profiles p join public.organizations o on o.id = p.organization_id
   where p.id = '00000000-0000-0000-0000-00000000000a'),
  'le profil et l''organisation sont créés à l''inscription');
select test.check(
  (select count(*) = 0 from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000c'),
  'des métadonnées d''inscription ne donnent jamais un rôle admin');

-- ---------------------------------------------------------------------------
-- Anonyme : aucun accès
-- ---------------------------------------------------------------------------
select test.as_anon();
do $$ begin
  perform 1 from public.profiles;
  raise exception 'ÉCHEC : un visiteur anonyme lit les profils';
exception when insufficient_privilege then null;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- Dirigeant : ne voit que lui-même
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-00000000000a');
select test.check((select count(*) = 1 from public.profiles), 'un dirigeant ne voit que son profil');
select test.check((select count(*) = 1 from public.organizations), 'un dirigeant ne voit que son organisation');
select test.check((select count(*) = 0 from public.settings), 'un dirigeant ne voit pas les paramètres');
select test.check((select count(*) = 0 from public.audit_log), 'un dirigeant ne lit pas le journal d''audit');

update public.profiles set full_name = 'Awa D.' where id = '00000000-0000-0000-0000-00000000000a';
select test.check((select full_name = 'Awa D.' from public.profiles), 'un dirigeant modifie son nom');

do $$ begin
  update public.profiles set email = 'autre@exemple.cm' where id = auth.uid();
  raise exception 'ÉCHEC : un dirigeant modifie son email directement';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  insert into public.user_roles (user_id, role, granted_by)
  values (auth.uid(), 'admin', auth.uid());
  raise exception 'ÉCHEC : un dirigeant s''attribue le rôle admin';
exception when insufficient_privilege then null;
end $$;

update public.profiles set full_name = 'Piraté' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select test.check(
  (select full_name = 'Bruno Dirigeant' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'un dirigeant ne modifie pas le profil d''un autre');

-- Journal d'audit : pas d'écriture directe, seulement via log_audit()
select test.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.audit_log (action, object_type) values ('faux', 'faux');
  raise exception 'ÉCHEC : écriture directe dans le journal d''audit';
exception when insufficient_privilege then null;
end $$;
select public.log_audit('consultation', 'profile', '00000000-0000-0000-0000-00000000000a');
reset role;
select test.check(
  (select actor_id = '00000000-0000-0000-0000-00000000000a' from public.audit_log where action = 'consultation'),
  'log_audit enregistre l''auteur réel');

-- ---------------------------------------------------------------------------
-- Admin sans double authentification : aucun droit d'admin
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-0000000000ad', 'aal1');
select test.check(not public.is_admin(), 'is_admin est faux sans 2FA');
select test.check(not public.is_facilitator(), 'is_facilitator est faux sans 2FA');
select test.check((select count(*) = 1 from public.profiles), 'un admin sans 2FA ne voit que son profil');
select test.check((select count(*) = 0 from public.settings), 'un admin sans 2FA ne voit pas les paramètres');
select test.check((select count(*) = 2 from public.user_roles), 'un admin sans 2FA voit seulement ses propres rôles');
do $$ begin
  insert into public.user_roles (user_id, role, granted_by)
  values ('00000000-0000-0000-0000-0000000000e1', 'expert', auth.uid());
  raise exception 'ÉCHEC : un admin sans 2FA attribue un rôle';
exception when insufficient_privilege then null;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- Admin avec double authentification : crée un expert
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-0000000000ad', 'aal2');
select test.check(public.is_admin(), 'is_admin est vrai avec 2FA');
select test.check((select count(*) >= 6 from public.profiles), 'un admin avec 2FA voit tous les profils');
select test.check((select count(*) > 0 from public.settings), 'un admin avec 2FA voit les paramètres');

insert into public.user_roles (user_id, role, granted_by) values
  ('00000000-0000-0000-0000-0000000000e1', 'expert', auth.uid()),
  ('00000000-0000-0000-0000-0000000000e2', 'expert', auth.uid());
insert into public.expert_profiles (user_id, domains, fee_per_session_fcfa, nda_signed, nda_signed_at) values
  ('00000000-0000-0000-0000-0000000000e1', '{strategie,rh}', 50000, true, '2026-10-01'),
  ('00000000-0000-0000-0000-0000000000e2', '{innovation}', 40000, false, null);
insert into public.expert_conflicts (expert_id, organization_id)
  select '00000000-0000-0000-0000-0000000000e1', organization_id
  from public.profiles where id = '00000000-0000-0000-0000-00000000000a';

do $$ begin
  insert into public.user_roles (user_id, role, granted_by)
  values ('00000000-0000-0000-0000-00000000000b', 'expert', '00000000-0000-0000-0000-00000000000a');
  raise exception 'ÉCHEC : un admin attribue un rôle au nom d''un autre';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  insert into public.expert_profiles (user_id, nda_signed) values ('00000000-0000-0000-0000-00000000000b', true);
  raise exception 'ÉCHEC : NDA signé sans date accepté';
exception when check_violation then null;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- Expert : ne voit que sa propre fiche
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-0000000000e2');
select test.check((select count(*) = 1 from public.expert_profiles), 'un expert ne voit que sa fiche');
select test.check((select count(*) = 0 from public.expert_conflicts), 'un expert ne voit pas les conflits des autres');
select test.check((select count(*) = 0 from public.organizations), 'un expert ne voit pas les organisations des dirigeants');
select test.check((select count(*) = 1 from public.profiles), 'un expert ne voit pas les profils des dirigeants');
reset role;

select test.as_user('00000000-0000-0000-0000-0000000000e1');
select test.check((select count(*) = 1 from public.expert_conflicts), 'un expert voit ses propres conflits déclarés');
reset role;

