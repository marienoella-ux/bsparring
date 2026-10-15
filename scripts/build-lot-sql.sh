#!/usr/bin/env bash
# Assemble le fichier SQL unique d'un lot, à coller dans le SQL Editor de Supabase.
# Usage : bash scripts/build-lot-sql.sh 2 > lot-2.sql
#
# Contenu, dans l'ordre :
#   supabase/lots/lot-N/00-*.sql      (remise à niveau éventuelle)
#   les migrations du lot (listées dans supabase/lots/lot-N/migrations.txt)
#   l'enregistrement de chaque migration dans bs_schema_migrations
#   supabase/lots/lot-N/99-controle.sql (exécuté après le commit)
set -euo pipefail
LOT="${1:?Numéro du lot attendu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/supabase/lots/lot-$LOT"
[ -d "$DIR" ] || { echo "Dossier absent : $DIR" >&2; exit 1; }

COMMIT="$(git -C "$ROOT" rev-parse --short HEAD)"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
if [ -n "$(git -C "$ROOT" status --porcelain -- supabase)" ]; then
  echo "Modifications non commitées dans supabase/ : committer avant d'assembler." >&2
  exit 1
fi
mapfile -t MIGRATIONS < <(grep -v '^\s*#' "$DIR/migrations.txt" | grep -v '^\s*$')

cat <<HEADER
-- =============================================================================
-- B-Sparring — Lot $LOT — script SQL unique
-- Version     : lot-$LOT@$COMMIT
-- Commit      : $COMMIT (branche $BRANCH, dépôt marienoella-ux/bsparring)
-- Assemblé le : $(date -u '+%Y-%m-%d %H:%M UTC')
-- Migrations  : ${MIGRATIONS[*]}
--
-- À coller en entier dans Supabase → SQL Editor (projet de TEST), puis Run.
-- Tout s'exécute en une seule transaction : en cas d'erreur, rien n'est appliqué.
-- Le tableau affiché à la fin liste chaque objet du lot : tout doit être « OK ».
-- =============================================================================

begin;
HEADER

for f in "$DIR"/0*.sql; do
  [ -e "$f" ] || continue
  echo; cat "$f"
done
for m in "${MIGRATIONS[@]}"; do
  echo; echo "-- ============================================================================="
  echo "-- Migration $m"
  echo "-- ============================================================================="
  echo; cat "$ROOT/supabase/migrations/$m.sql"
  echo; echo "insert into public.bs_schema_migrations (version) values ('$m') on conflict do nothing;"
done
echo; echo "commit;"
echo; cat "$DIR/99-controle.sql"
