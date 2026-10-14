#!/usr/bin/env bash
# Applique les migrations non encore appliquées sur la base indiquée par SUPABASE_TEST_DB_URL.
# Usage : bash scripts/db-apply.sh   (environnement de test uniquement)
set -euo pipefail
: "${SUPABASE_TEST_DB_URL:?Variable SUPABASE_TEST_DB_URL absente (voir docs/01-acces-et-secrets.md)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "$SUPABASE_TEST_DB_URL" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -c "create table if not exists public.bs_schema_migrations (version text primary key, applied_at timestamptz not null default now()); alter table public.bs_schema_migrations enable row level security; revoke all on public.bs_schema_migrations from anon, authenticated;"

for f in "$ROOT"/supabase/migrations/*.sql; do
  v="$(basename "$f" .sql)"
  if [ "$("${PSQL[@]}" -tAc "select 1 from public.bs_schema_migrations where version = '$v'")" = "1" ]; then
    echo "Déjà appliquée : $v"
    continue
  fi
  echo "Application : $v"
  # Chaque migration et son enregistrement dans une seule transaction.
  { echo "begin;"; cat "$f"; echo; echo "insert into public.bs_schema_migrations (version) values ('$v');"; echo "commit;"; } | "${PSQL[@]}"
done
echo "Base de test à jour."
