import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { schemaTableNames } from "../../src/db/schema";
import { applyMigrations } from "../support/sqlite";

describe("schema integration", () => {
  it("creates all MVP tables", () => {
    const database = new DatabaseSync(":memory:");
    applyMigrations(database);

    const tables = database
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as Array<{ name: string }>;
    const columns = database
      .prepare("pragma table_info(products)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const priceColumns = database.prepare("pragma table_info(price_history)").all() as Array<{ name: string }>;
    const stockColumns = database.prepare("pragma table_info(stock_history)").all() as Array<{ name: string }>;
    const aiProfileColumns = database.prepare("pragma table_info(ai_profiles)").all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining([...schemaTableNames]));
    expect(tables).toEqual(
      expect.arrayContaining([
        { name: "manual_refresh_runs" },
        { name: "manual_refresh_run_items" },
        { name: "product_refresh_audits" },
        { name: "product_content_history" },
      ]),
    );
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "is_favorite", dflt_value: "0" }),
      ]),
    );
    expect(priceColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "refresh_audit_id" })]));
    expect(stockColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "refresh_audit_id" })]));
    expect(aiProfileColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "status" }),
        expect.objectContaining({ name: "last_validated_at" }),
        expect.objectContaining({ name: "last_error" }),
        expect.objectContaining({ name: "updated_at" }),
      ]),
    );
  });
});
