#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
desktop_dir="${HOME}/Desktop"

start_launcher="${desktop_dir}/dropshiping-win-start.command"
stop_launcher="${desktop_dir}/dropshiping-win-stop.command"

printf -v escaped_start_script '%q' "$repo_root/scripts/macos/start-dev.sh"
printf -v escaped_stop_script '%q' "$repo_root/scripts/macos/stop-dev.sh"

mkdir -p "$desktop_dir"

cat > "$start_launcher" <<EOF
#!/usr/bin/env bash
set -euo pipefail
bash $escaped_start_script
EOF

cat > "$stop_launcher" <<EOF
#!/usr/bin/env bash
set -euo pipefail
bash $escaped_stop_script
EOF

chmod +x "$start_launcher" "$stop_launcher"

printf 'Oluşturuldu:\n- %s\n- %s\n' "$start_launcher" "$stop_launcher"
printf 'Repo yolu değişirse bu scripti yeniden çalıştır.\n'
