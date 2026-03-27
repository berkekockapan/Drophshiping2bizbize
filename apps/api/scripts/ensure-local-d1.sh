#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
api_dir="$(cd "$script_dir/.." && pwd)"
local_migrations_table="d1_local_migrations"

cd "$api_dir"

run_local_d1() {
  pnpm exec wrangler d1 execute DB --local "$@"
}

run_local_d1_json() {
  pnpm exec wrangler d1 execute DB --local --json "$@"
}

ensure_local_migration_table() {
  run_local_d1 \
    --command "CREATE TABLE IF NOT EXISTS $local_migrations_table (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);" \
    >/dev/null
}

mark_local_migration_applied() {
  local migration_name="$1"

  run_local_d1 \
    --command "INSERT OR IGNORE INTO $local_migrations_table (name, applied_at) VALUES ('$migration_name', unixepoch());" \
    >/dev/null
}

local_migration_is_applied() {
  local migration_name="$1"
  local query_output

  query_output="$(run_local_d1_json --command "SELECT name FROM $local_migrations_table WHERE name = '$migration_name' LIMIT 1;")"
  [[ "$query_output" == *"\"name\": \"$migration_name\""* ]] || [[ "$query_output" == *"\"name\":\"$migration_name\""* ]]
}

bootstrap_existing_local_migrations() {
  local products_table_output
  local favorite_column_output

  products_table_output="$(run_local_d1_json --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products' LIMIT 1;")"
  if [[ "$products_table_output" == *'"name": "products"'* ]] || [[ "$products_table_output" == *'"name":"products"'* ]]; then
    mark_local_migration_applied "0000_initial.sql"
  fi

  favorite_column_output="$(run_local_d1_json --command "SELECT name FROM pragma_table_info('products') WHERE name = 'is_favorite' LIMIT 1;")"
  if [[ "$favorite_column_output" == *'"name": "is_favorite"'* ]] || [[ "$favorite_column_output" == *'"name":"is_favorite"'* ]]; then
    mark_local_migration_applied "0001_products_is_favorite.sql"
  fi
}

apply_pending_local_migrations() {
  local migrations=("$api_dir"/drizzle/*.sql)
  local migration_path
  local migration_name

  if [[ ! -e "${migrations[0]}" ]]; then
    return
  fi

  for migration_path in "${migrations[@]}"; do
    migration_name="$(basename "$migration_path")"

    if local_migration_is_applied "$migration_name"; then
      continue
    fi

    run_local_d1 --file "./drizzle/$migration_name" >/dev/null
    mark_local_migration_applied "$migration_name"
  done
}

main() {
  ensure_local_migration_table
  bootstrap_existing_local_migrations
  apply_pending_local_migrations
}

main "$@"
