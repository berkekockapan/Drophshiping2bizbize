import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import type { D1Database, D1PreparedStatement, Env, RefreshJob } from "../../src/config/bindings";

function normalizeSqliteValue(value: unknown) {
  return typeof value === "boolean" ? Number(value) : value;
}

function normalizeSqliteValues(values: unknown[]) {
  return values.map(normalizeSqliteValue);
}

class SQLitePreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly query: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new SQLitePreparedStatement(this.database, this.query, normalizeSqliteValues(values));
  }

  async first<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return (statement.get(...(this.values as any[])) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return { results: statement.all(...(this.values as any[])) as T[] };
  }

  async run() {
    const statement = this.database.prepare(this.query);
    statement.run(...(this.values as any[]));
    return {};
  }
}

class SQLiteD1Database implements D1Database {
  constructor(private readonly database: DatabaseSync) {}

  prepare(query: string) {
    return new SQLitePreparedStatement(this.database, query);
  }
}

export function applyMigrations(database: DatabaseSync) {
  const drizzleDir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
  const sql = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(drizzleDir, name), "utf8"))
    .join("\n");

  database.exec(sql);
}

export function createTestEnv() {
  const sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);

  return {
    sqlite,
    env: {
      DB: new SQLiteD1Database(sqlite),
      REFRESH_QUEUE: { async send(_body: RefreshJob) {} },
    } satisfies Env,
  };
}
