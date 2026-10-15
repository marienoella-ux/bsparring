-- Fonctions d'aide des tests, chargées avant chaque fichier *.test.sql puis supprimées.

create schema test;

create function test.as_user(p_id uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated', 'aal', p_aal)::text, false);
  execute 'set role authenticated';
end $$;

create function test.as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  execute 'set role anon';
end $$;

create function test.check(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not coalesce(cond, false) then
    raise exception 'ÉCHEC : %', msg;
  end if;
end $$;

grant usage on schema test to anon, authenticated;
grant execute on all functions in schema test to anon, authenticated;

create function test.expect_error(p_sql text, p_message text, p_label text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'ÉCHEC : % (aucune erreur levée)', p_label;
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  if position(p_message in sqlerrm) = 0 then
    raise exception 'ÉCHEC : % (erreur inattendue : %)', p_label, sqlerrm;
  end if;
end $$;

grant execute on all functions in schema test to anon, authenticated;
