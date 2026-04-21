import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const apiDir = resolve(repoRoot, "apps", "api");
const authEnvPath = resolve(apiDir, ".cloudflare.env");
const wranglerEntrypoint = resolve(
  apiDir,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);

if (!existsSync(authEnvPath)) {
  console.error(
    [
      "Cloudflare auth dosyasi bulunamadi:",
      `  ${authEnvPath}`,
      "",
      "Su dosyayi olusturun:",
      "  apps/api/.cloudflare.env",
      "",
      "Ornek dosya:",
      "  apps/api/.cloudflare.env.example",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(wranglerEntrypoint)) {
  console.error(
    [
      "Wrangler giris dosyasi bulunamadi:",
      `  ${wranglerEntrypoint}`,
      "",
      "Once bagimliliklari yukleyin:",
      "  pnpm install",
    ].join("\n"),
  );
  process.exit(1);
}

const parsedEnv = parseEnvFile(readFileSync(authEnvPath, "utf8"));

const requiredKeys = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"];
const missingKeys = requiredKeys.filter((key) => !parsedEnv[key]);

if (missingKeys.length > 0) {
  console.error(
    `Cloudflare auth dosyasinda eksik alanlar var: ${missingKeys.join(", ")}`,
  );
  process.exit(1);
}

const wranglerArgs = process.argv.slice(2);

if (wranglerArgs.length === 0) {
  console.error("Kullanim: node scripts/cloudflare-auth-run.mjs <wrangler-args>");
  process.exit(1);
}

const child = spawn(process.execPath, [wranglerEntrypoint, ...wranglerArgs], {
  cwd: apiDir,
  env: {
    ...process.env,
    ...parsedEnv,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("Wrangler komutu baslatilamadi:", error.message);
  process.exit(1);
});

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
