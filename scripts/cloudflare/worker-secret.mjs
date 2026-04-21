import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_FILTER = "@dropshiping2bizbize/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log("Kullanim:");
  console.log("  pnpm cf:secret -- SECRET_NAME");
  console.log("  pnpm cf:secret -- SECRET_NAME --env dev");
  process.exit(args.length === 0 ? 1 : 0);
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, '$1$1\\"')}"`;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [resolve(__dirname, "ensure-target-account.mjs")]);

if (process.platform === "win32") {
  const commandLine = [
    "pnpm.cmd",
    "--filter",
    API_FILTER,
    "exec",
    "wrangler",
    "secret",
    "put",
    ...args,
  ].map(quoteWindowsArg).join(" ");

  run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine]);
} else {
  run("pnpm", [
    "--filter",
    API_FILTER,
    "exec",
    "wrangler",
    "secret",
    "put",
    ...args,
  ]);
}
