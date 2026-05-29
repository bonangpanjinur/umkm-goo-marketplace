#!/usr/bin/env bash
# =============================================================================
# UMKMgo — Fresh Schema Runner
# Jalankan ke-6 SQL file secara berurutan ke Supabase (via psql).
#
# Prasyarat:
#   - psql terinstall (brew install postgresql atau apt install postgresql-client)
#   - SUPABASE_DB_URL sudah di-set (lihat: Supabase → Settings → Database → URI)
#
# Cara pakai:
#   export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
#   bash scripts/fresh_schema/run_fresh_schema.sh
#
# Atau satu file saja:
#   psql "$SUPABASE_DB_URL" -f scripts/fresh_schema/04_policies_and_storage.sql
# =============================================================================

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "❌  Set SUPABASE_DB_URL terlebih dahulu."
  echo "    Contoh: export SUPABASE_DB_URL=\"postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres\""
  exit 1
fi

FILES=(
  "01_core_schema.sql"
  "02_indexes_views_triggers.sql"
  "03_constraints_foreign_keys.sql"
  "04_policies_and_storage.sql"
  "05_seed_reference_data.sql"
  "06_post_consolidation.sql"
)

echo "🚀  Memulai fresh schema UMKMgo..."
echo "    Target: $SUPABASE_DB_URL"
echo ""

for f in "${FILES[@]}"; do
  echo "▶  $f"
  psql "$SUPABASE_DB_URL" \
    --single-transaction \
    --set ON_ERROR_STOP=1 \
    -f "$DIR/$f" \
    2>&1 | grep -v "^SET$\|^ALTER TABLE$\|^CREATE$\|^INSERT 0\|^NOTICE:" || true
  echo "   ✓ Selesai"
  echo ""
done

echo "✅  Semua file berhasil diaplikasikan!"
