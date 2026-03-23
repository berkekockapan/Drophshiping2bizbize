#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
runtime_dir="$repo_root/.state/macos-dev"
pids_dir="$runtime_dir/pids"
logs_dir="$runtime_dir/logs"
connector_env="$repo_root/apps/connector/.env"
connector_env_example="$repo_root/apps/connector/.env.example"
api_dir="$repo_root/apps/api"
local_migrations_table="d1_local_migrations"

mkdir -p "$pids_dir" "$logs_dir"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*"
}

fail() {
  log "HATA: $*"
  exit 1
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "'$command_name' komutu bulunamadı."
  fi
}

ensure_dependencies() {
  if [[ ! -d "$repo_root/node_modules" ]]; then
    fail "node_modules bulunamadı. Önce repo kökünde 'pnpm install' çalıştır."
  fi
}

ensure_connector_env() {
  if [[ -f "$connector_env" ]]; then
    return
  fi

  cp "$connector_env_example" "$connector_env"
  log "apps/connector/.env oluşturuldu. Varsayılan provider: mock"
}

run_local_d1() {
  (
    cd "$api_dir" &&
      pnpm exec wrangler d1 execute trendyol-etsy --local "$@"
  )
}

run_local_d1_json() {
  (
    cd "$api_dir" &&
      pnpm exec wrangler d1 execute trendyol-etsy --local --json "$@"
  )
}

ensure_local_migration_table() {
  run_local_d1 --command "CREATE TABLE IF NOT EXISTS $local_migrations_table (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);" \
    >/dev/null || fail "Yerel migration kayıt tablosu oluşturulamadı."
}

mark_local_migration_applied() {
  local migration_name="$1"

  run_local_d1 \
    --command "INSERT OR IGNORE INTO $local_migrations_table (name, applied_at) VALUES ('$migration_name', unixepoch());" \
    >/dev/null || fail "'$migration_name' migration kaydı yazılamadı."
}

local_migration_is_applied() {
  local migration_name="$1"
  local query_output

  if ! query_output="$(run_local_d1_json --command "SELECT name FROM $local_migrations_table WHERE name = '$migration_name' LIMIT 1;")"; then
    fail "'$migration_name' migration durumu okunamadı."
  fi

  [[ "$query_output" == *"\"name\": \"$migration_name\""* ]] || [[ "$query_output" == *"\"name\":\"$migration_name\""* ]]
}

bootstrap_existing_local_migrations() {
  local products_table_output
  local favorite_column_output

  if ! products_table_output="$(run_local_d1_json --command "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products' LIMIT 1;")"; then
    fail "Yerel D1 products tablosu kontrolü başarısız oldu."
  fi

  if [[ "$products_table_output" == *'"name": "products"'* ]] || [[ "$products_table_output" == *'"name":"products"'* ]]; then
    mark_local_migration_applied "0000_initial.sql"
  fi

  if ! favorite_column_output="$(run_local_d1_json --command "SELECT name FROM pragma_table_info('products') WHERE name = 'is_favorite' LIMIT 1;")"; then
    fail "Yerel D1 is_favorite kolonu kontrolü başarısız oldu."
  fi

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

    log "Migration uygulanıyor: $migration_name"
    run_local_d1 --file "./drizzle/$migration_name" >/dev/null || fail "'$migration_name' uygulanamadı."
    mark_local_migration_applied "$migration_name"
  done
}

ensure_local_api_db() {
  log "Yerel API veritabanı kontrol ediliyor..."
  ensure_local_migration_table
  bootstrap_existing_local_migrations
  apply_pending_local_migrations
  log "Yerel D1 veritabanı hazır."
}

build_service_command() {
  local service_name="$1"
  shift

  local command_text
  printf -v command_text '%q ' bash "$script_dir/run-service.sh" "$service_name" "$@"
  printf '%s' "$command_text"
}

open_terminal_tab() {
  local command_text="$1"

  osascript - "$command_text" <<'OSA'
on run argv
  set commandText to item 1 of argv
  tell application "Terminal"
    activate
    do script commandText
  end tell
end run
OSA
}

main() {
  require_command bash
  require_command node
  require_command pnpm
  require_command osascript
  require_command open

  ensure_dependencies
  ensure_connector_env

  bash "$script_dir/stop-dev.sh" --quiet || true
  ensure_local_api_db

  log "Terminal sekmeleri açılıyor..."
  open_terminal_tab "$(build_service_command api pnpm dev:api)"
  sleep 0.5
  open_terminal_tab "$(build_service_command connector pnpm dev:connector)"
  sleep 0.5
  open_terminal_tab "$(build_service_command web pnpm dev:web)"
  sleep 1

  open "http://127.0.0.1:5173"

  log "Başlatma tamamlandı."
  log "Web: http://127.0.0.1:5173"
  log "API health: http://127.0.0.1:8787/health"
  log "Connector health: http://127.0.0.1:4317/health"
}

main "$@"
