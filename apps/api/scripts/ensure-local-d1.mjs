import { readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, "..");
const localMigrationsTable = "d1_local_migrations";

function runWrangler(args, { allowFailure = false } = {}) {
  const result =
    process.platform === "win32"
      ? spawnSync(
          ["pnpm", "exec", "wrangler", "d1", "execute", "DB", "--local", ...args]
            .map((part) => quoteWindowsArg(part))
            .join(" "),
          [],
          {
            cwd: apiDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            shell: true,
          },
        )
      : spawnSync("pnpm", ["exec", "wrangler", "d1", "execute", "DB", "--local", ...args], {
          cwd: apiDir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "Local D1 komutu basarisiz oldu.").trim());
  }

  return result;
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, "$1$1\\\"")}"`;
}

function runLocalD1(command) {
  return runWrangler(["--command", command]).stdout ?? "";
}

function runLocalD1Json(command) {
  return runWrangler(["--json", "--command", command]).stdout ?? "";
}

function ensureLocalMigrationTable() {
  runLocalD1(
    `CREATE TABLE IF NOT EXISTS ${localMigrationsTable} (name TEXT PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);`,
  );
}

function markLocalMigrationApplied(migrationName) {
  runLocalD1(
    `INSERT OR IGNORE INTO ${localMigrationsTable} (name, applied_at) VALUES ('${migrationName}', unixepoch());`,
  );
}

function localMigrationIsApplied(migrationName) {
  const queryOutput = runLocalD1Json(
    `SELECT name FROM ${localMigrationsTable} WHERE name = '${migrationName}' LIMIT 1;`,
  );

  return (
    queryOutput.includes(`"name": "${migrationName}"`) || queryOutput.includes(`"name":"${migrationName}"`)
  );
}

function bootstrapExistingLocalMigrations() {
  const productsTableOutput = runLocalD1Json(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products' LIMIT 1;",
  );
  if (productsTableOutput.includes('"name": "products"') || productsTableOutput.includes('"name":"products"')) {
    markLocalMigrationApplied("0000_initial.sql");
  }

  const favoriteColumnOutput = runLocalD1Json(
    "SELECT name FROM pragma_table_info('products') WHERE name = 'is_favorite' LIMIT 1;",
  );
  if (
    favoriteColumnOutput.includes('"name": "is_favorite"') ||
    favoriteColumnOutput.includes('"name":"is_favorite"')
  ) {
    markLocalMigrationApplied("0001_products_is_favorite.sql");
  }
}

function applyPendingLocalMigrations() {
  const drizzleDir = resolve(apiDir, "drizzle");
  const migrations = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const migrationName of migrations) {
    if (localMigrationIsApplied(migrationName)) {
      continue;
    }

    runWrangler(["--file", `./drizzle/${basename(migrationName)}`]);
    markLocalMigrationApplied(migrationName);
  }
}

function main() {
  ensureLocalMigrationTable();
  bootstrapExistingLocalMigrations();
  applyPendingLocalMigrations();
}

main();
