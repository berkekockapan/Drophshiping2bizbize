#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Kullanım: $0 <service-name> <command...>" >&2
  exit 1
fi

service_name="$1"
shift

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
runtime_dir="$repo_root/.state/macos-dev"
pids_dir="$runtime_dir/pids"
logs_dir="$runtime_dir/logs"
pid_file="$pids_dir/${service_name}.pid"
log_file="$logs_dir/${service_name}.log"

mkdir -p "$pids_dir" "$logs_dir"
cd "$repo_root"

exec > >(tee -a "$log_file") 2>&1

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

printf '\033]0;%s\007' "dropshiping2bizbize:${service_name}"
printf '\033]1;%s\007' "dropshiping2bizbize:${service_name}"

echo "[$(timestamp)] ${service_name} servisi hazırlanıyor..."
echo "[$(timestamp)] Repo: $repo_root"
echo "[$(timestamp)] Komut: $*"
echo "[$(timestamp)] Log: $log_file"

"$@" &
service_pid=$!

echo "$service_pid" > "$pid_file"
echo "[$(timestamp)] PID: $service_pid"

cleanup() {
  local exit_code="$1"

  if [[ -f "$pid_file" ]]; then
    local current_pid
    current_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ "$current_pid" == "$service_pid" ]]; then
      rm -f "$pid_file"
    fi
  fi

  echo "[$(timestamp)] ${service_name} durdu. Çıkış kodu: $exit_code"
}

forward_signal() {
  local signal="$1"

  if kill -0 "$service_pid" 2>/dev/null; then
    kill "-$signal" "$service_pid" 2>/dev/null || kill -s "$signal" "$service_pid" 2>/dev/null || true
  fi
}

trap 'forward_signal TERM' TERM
trap 'forward_signal INT' INT

set +e
wait "$service_pid"
exit_code=$?
set -e

cleanup "$exit_code"
exit "$exit_code"
