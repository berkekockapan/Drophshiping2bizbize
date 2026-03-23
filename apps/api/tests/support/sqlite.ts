import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import type { D1Database, D1PreparedStatement, Env, Queue, RefreshJob } from "../../src/config/bindings";

type SQLiteBindValue = string | number | bigint | Uint8Array | null;

function normalizeBindingValue(value: unknown): SQLiteBindValue {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return value as SQLiteBindValue;
}

class SQLitePreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly query: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new SQLitePreparedStatement(this.database, this.query, values);
  }

  async first<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return (statement.get(...this.values.map(normalizeBindingValue)) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return { results: statement.all(...this.values.map(normalizeBindingValue)) as T[] };
  }

  async run() {
    const statement = this.database.prepare(this.query);
    statement.run(...this.values.map(normalizeBindingValue));
    return {};
  }
}

class SQLiteD1Database implements D1Database {
  constructor(private readonly database: DatabaseSync) {}

  prepare(query: string) {
    return new SQLitePreparedStatement(this.database, query);
  }
}

export class InMemoryRefreshQueue implements Queue<RefreshJob> {
  public readonly sent: string[] = [];

  async send(body: RefreshJob) {
    this.sent.push(body.productId);
  }
}

export function applyMigrations(database: DatabaseSync) {
  const drizzleDir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
  const migrations = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    database.exec(readFileSync(join(drizzleDir, migration), "utf8"));
  }
}

export function createTestEnv(
  options: {
    queue?: Queue<RefreshJob>;
  } = {},
) {
  const sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);

  const queue = options.queue ?? new InMemoryRefreshQueue();
  const env: Env = {
    DB: new SQLiteD1Database(sqlite),
    REFRESH_QUEUE: queue,
  };

  return { env, sqlite, queue };
}
