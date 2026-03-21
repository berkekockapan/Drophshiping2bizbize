#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
pids_dir="$repo_root/.state/macos-dev/pids"
quiet_mode=0

if [[ "${1:-}" == "--quiet" ]]; then
  quiet_mode=1
fi

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  if [[ "$quiet_mode" -eq 0 ]]; then
    printf '[%s] %s\n' "$(timestamp)" "$*"
  fi
}

stop_pid() {
  local service_name="$1"
  local pid="$2"

  if ! kill -0 "$pid" 2>/dev/null; then
    log "${service_name}: PID yaşamıyor, dosya temizleniyor."
    return
  fi

  log "${service_name}: PID $pid durduruluyor..."
  kill -TERM "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      log "${service_name}: durdu."
      return
    fi
    sleep 0.5
  done

  log "${service_name}: TERM sonrası hâlâ açık, KILL gönderiliyor."
  kill -KILL "$pid" 2>/dev/null || true
}

main() {
  shopt -s nullglob

  if [[ ! -d "$pids_dir" ]]; then
    log "PID klasörü yok. Durdurulacak servis bulunamadı."
    return 0
  fi

  local pid_files=("$pids_dir"/*.pid)

  if [[ "${#pid_files[@]}" -eq 0 ]]; then
    log "PID dosyası bulunamadı."
    return 0
  fi

  for pid_file in "${pid_files[@]}"; do
    local service_name
    local pid
    service_name="$(basename "$pid_file" .pid)"
    pid="$(cat "$pid_file" 2>/dev/null || true)"

    if [[ -z "$pid" ]]; then
      rm -f "$pid_file"
      continue
    fi

    stop_pid "$service_name" "$pid"
    rm -f "$pid_file"
  done

  log "Tüm kayıtlı servisler durduruldu."
}

main "$@"
