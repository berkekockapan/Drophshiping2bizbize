import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import type { D1Database, D1PreparedStatement, Env } from "../../src/config/bindings";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));
const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

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

function createEnv() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(migrationPath, "utf8"));

  const env: Env = {
    DB: new SQLiteD1Database(sqlite),
    REFRESH_QUEUE: {
      async send() {
        return;
      },
    },
  };

  return { env, sqlite };
}

describe("draft flows", () => {
  it("persists manual edits and protects fields from silent overwrite", async () => {
    const { env } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const app = createApp();

    const draftResponse = await app.request(`http://localhost/drafts/${seeded.product.id}`, undefined, env);
    expect(draftResponse.status).toBe(200);

    const editResponse = await app.request(
      `http://localhost/drafts/${seeded.product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishTitle: "Custom title", shortDescription: "Custom short" }),
      },
      env,
    );

    expect(editResponse.status).toBe(200);

    const generateNoOverwrite = await app.request(
      `http://localhost/drafts/${seeded.product.id}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overwrite: false,
          generated: {
            englishTitle: "Generated title",
            shortDescription: "Generated short",
            longDescription: "Generated long",
            tags: ["etsy", "gift"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "generated seo",
            policyNotes: "generated policy",
          },
        }),
      },
      env,
    );

    const noOverwriteJson = await generateNoOverwrite.json();
    expect(noOverwriteJson.englishTitle).toBe("Custom title");

    const generateOverwrite = await app.request(
      `http://localhost/drafts/${seeded.product.id}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overwrite: true,
          generated: {
            englishTitle: "Generated title",
            shortDescription: "Generated short",
            longDescription: "Generated long",
            tags: ["etsy", "gift"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "generated seo",
            policyNotes: "generated policy",
          },
        }),
      },
      env,
    );

    const overwriteJson = await generateOverwrite.json();
    expect(overwriteJson.englishTitle).toBe("Generated title");
  });

  it("syncs connector profile metadata into API storage", async () => {
    const { env } = createEnv();
    const app = createApp();

    const syncResponse = await app.request(
      "http://localhost/ai-profiles/sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorStatus: {
            status: "online",
            provider: "chatgpt-web",
          },
          profiles: [
            {
              id: "profile_primary",
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
              provider: "chatgpt-web",
              isActive: true,
            },
          ],
        }),
      },
      env,
    );

    expect(syncResponse.status).toBe(200);
    const syncJson = await syncResponse.json();
    expect(syncJson.items).toHaveLength(1);
    expect(syncJson.items[0]).toEqual(
      expect.objectContaining({
        id: "profile_primary",
        isActive: true,
      }),
    );
  });
});
