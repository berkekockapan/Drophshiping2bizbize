import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_EMAIL = "berkekockapan3535@gmail.com";
const EXPECTED_ACCOUNT_ID = "102eaec87235c67e6d7524d859bd92dd";
const REQUIRED_PERMISSIONS = ["workers:write", "d1:write", "queues:write"];
const API_FILTER = "@dropshiping2bizbize/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const apiDir = resolve(repoRoot, "apps", "api");
const authEnvPath = resolve(apiDir, ".cloudflare.env");

function fail(message) {
  console.error(`Cloudflare hesap dogrulamasi basarisiz: ${message}`);
  process.exit(1);
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

function runPnpm(args, options = {}) {
  let command;
  let commandArgs;

  if (process.platform === "win32") {
    command = process.env.ComSpec || "cmd.exe";
    const commandLine = ["pnpm.cmd", ...args].map(quoteWindowsArg).join(" ");
    commandArgs = ["/d", "/s", "/c", commandLine];
  } else {
    command = "pnpm";
    commandArgs = args;
  }

  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    env: {
      ...process.env,
      ...loadCloudflareAuthEnv(),
      ...options.env,
    },
    ...options,
  });

  if (result.error) {
    fail(`pnpm calistirilamadi: ${result.error.message}`);
  }

  return result;
}

function loadCloudflareAuthEnv() {
  if (!existsSync(authEnvPath)) {
    return {};
  }

  return parseEnvFile(readFileSync(authEnvPath, "utf8"));
}

function parseEnvFile(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const whoami = runPnpm([
  "--filter",
  API_FILTER,
  "exec",
  "wrangler",
  "whoami",
  "--json",
]);

if (whoami.status !== 0) {
  const stderr = (whoami.stderr || whoami.stdout || "").trim();
  fail(
    stderr ||
      "wrangler whoami --json basarisiz oldu. Dogru hesaba login oldugundan emin olun.",
  );
}

let payload;
try {
  payload = JSON.parse((whoami.stdout || "").trim());
} catch (error) {
  fail(`wrangler whoami --json ciktisi parse edilemedi: ${error.message}`);
}

if (!payload?.loggedIn) {
  fail("Wrangler oturumu acik degil.");
}

if (payload.email !== EXPECTED_EMAIL) {
  fail(
    `Yanlis email ile giris yapilmis. Beklenen: ${EXPECTED_EMAIL}, bulunan: ${payload.email ?? "yok"}`,
  );
}

const accountIds = new Set((payload.accounts ?? []).map((account) => account.id));
if (!accountIds.has(EXPECTED_ACCOUNT_ID)) {
  fail(
    `Beklenen account_id bulunamadi. Beklenen: ${EXPECTED_ACCOUNT_ID}, bulunan: ${
      [...accountIds].join(", ") || "yok"
    }`,
  );
}

const permissionSet = new Set(payload.tokenPermissions ?? []);
const missingPermissions = REQUIRED_PERMISSIONS.filter(
  (permission) => !permissionSet.has(permission),
);

if ((payload.tokenPermissions ?? []).length === 0) {
  console.warn(
    "Cloudflare guard warning: wrangler whoami token izinlerini raporlamadi; email/account_id dogrulamasi ile devam ediliyor.",
  );
} else if (missingPermissions.length > 0) {
  fail(`Token izinleri eksik: ${missingPermissions.join(", ")}`);
}

console.log(`Cloudflare guard OK: ${EXPECTED_EMAIL} / ${EXPECTED_ACCOUNT_ID}`);
