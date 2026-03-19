import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { D1Database, D1PreparedStatement, Env, Queue, RefreshJob } from "../../src/config/bindings";
import worker from "../../src/worker";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));
const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

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

class InMemoryQueue implements Queue<RefreshJob> {
  public readonly sent: string[] = [];

  async send(body: RefreshJob) {
    this.sent.push(body.productId);
  }
}

function createEnv() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(migrationPath, "utf8"));

  const queue = new InMemoryQueue();
  const env: Env = {
    DB: new SQLiteD1Database(sqlite),
    REFRESH_QUEUE: queue,
  };

  return { env, sqlite, queue };
}

describe("scheduler", () => {
  it("enqueues active products only when the refresh interval window has elapsed", async () => {
    const { env, sqlite, queue } = createEnv();

    sqlite
      .prepare(
        `insert into app_settings (
          id, refresh_interval_hours, prompt_preferences_json, connector_healthcheck_enabled, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?)`,
      )
      .run("default", 5, '{"tone":"balanced"}', 1, Date.parse("2026-03-19T00:00:00.000Z"), Date.parse("2026-03-19T00:00:00.000Z"));

    const dueOne = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const dueTwo = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml.replaceAll("Oversize Hoodie", "Oversize Hoodie 2"), { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-789?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml.replaceAll("Oversize Hoodie", "Oversize Hoodie 3"), { status: 200 }),
        now: new Date("2026-03-20T09:00:00.000Z"),
      },
    );

    const waits: Array<Promise<unknown>> = [];
    worker.scheduled?.(
      { cron: "0 * * * *", scheduledTime: Date.parse("2026-03-20T10:00:00.000Z") },
      env,
      {
        waitUntil(promise) {
          waits.push(promise);
        },
      },
    );

    await Promise.all(waits);

    expect(queue.sent).toEqual([dueOne.product.id, dueTwo.product.id]);
  });
});
