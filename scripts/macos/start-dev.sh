#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
runtime_dir="$repo_root/.state/macos-dev"
pids_dir="$runtime_dir/pids"
logs_dir="$runtime_dir/logs"
connector_env="$repo_root/apps/connector/.env"
connector_env_example="$repo_root/apps/connector/.env.example"

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

ensure_local_api_db() {
  log "Yerel API veritabanı kontrol ediliyor..."

  local query_output
  if ! query_output="$(
    cd "$repo_root/apps/api" &&
      pnpm exec wrangler d1 execute trendyol-etsy --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='products';" --json
  )"; then
    fail "Yerel D1 veritabanı kontrolü başarısız oldu."
  fi

  if [[ "$query_output" == *'"name": "products"'* ]] || [[ "$query_output" == *'"name":"products"'* ]]; then
    log "Yerel D1 veritabanı hazır."
    return
  fi

  log "Şema bulunamadı. İlk kurulum SQL'i uygulanıyor..."

  (
    cd "$repo_root/apps/api" &&
      pnpm exec wrangler d1 execute trendyol-etsy --local --file ./drizzle/0000_initial.sql
  ) || fail "İlk D1 şeması uygulanamadı."

  log "Yerel D1 veritabanı oluşturuldu."
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
    if (count of windows) is 0 then
      do script commandText
    else
      do script commandText in front window
    end if
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
