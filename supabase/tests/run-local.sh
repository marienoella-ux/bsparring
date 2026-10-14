#!/usr/bin/env bash
# Applique les migrations sur un PostgreSQL local jetable et exécute les tests de sécurité.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$BIN" ] || BIN="$(dirname "$(command -v initdb)")"
TMP="$(mktemp -d)"
PORT=54329
trap '"$BIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$TMP"
  RUN=(runuser -u postgres --)
else
  RUN=()
fi
"${RUN[@]}" "$BIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(env PGOPTIONS="-c client_min_messages=warning" psql -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -o /dev/null)
"${PSQL[@]}" -f "$ROOT/supabase/tests/auth-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Migration : $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
for f in "$ROOT"/supabase/tests/*.test.sql; do
  echo "Tests : $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "Tous les tests de base de données sont passés."
