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
    const notificationsColumns = database
      .prepare("pragma table_info(notifications)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const manualRunColumns = database
      .prepare("pragma table_info(manual_refresh_runs)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const categoryColumns = database
      .prepare("pragma table_info(product_categories)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const sourceProductColumns = database
      .prepare("pragma table_info(source_products)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const sourceProductEtsyLinkColumns = database
      .prepare("pragma table_info(source_product_etsy_links)")
      .all() as Array<{ name: string; dflt_value: string | null }>;
    const productIndexes = database
      .prepare("pragma index_list(products)")
      .all() as Array<{ name: string; partial: number }>;
    const sourceProductIndexes = database
      .prepare("pragma index_list(source_products)")
      .all() as Array<{ name: string; partial: number }>;
    const sourceProductEtsyLinkIndexes = database
      .prepare("pragma index_list(source_product_etsy_links)")
      .all() as Array<{ name: string; partial: number }>;
    const priceColumns = database.prepare("pragma table_info(price_history)").all() as Array<{ name: string }>;
    const stockColumns = database.prepare("pragma table_info(stock_history)").all() as Array<{ name: string }>;
    const aiProfileColumns = database.prepare("pragma table_info(ai_profiles)").all() as Array<{ name: string }>;
    const settingsColumns = database.prepare("pragma table_info(app_settings)").all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining([...schemaTableNames]));
    expect(tables).toEqual(
      expect.arrayContaining([
        { name: "manual_refresh_runs" },
        { name: "manual_refresh_run_items" },
        { name: "product_refresh_audits" },
        { name: "product_content_history" },
        { name: "product_categories" },
        { name: "tariff_master_us_entries" },
        { name: "product_variant_cost_overrides" },
      ]),
    );
    expect(columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "is_favorite", dflt_value: "0" }),
        expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" }),
        expect.objectContaining({ name: "deleted_at" }),
        expect.objectContaining({ name: "deleted_reason" }),
        expect.objectContaining({ name: "user_category_id" }),
      ]),
    );
    expect(categoryColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "owner_key" }),
        expect.objectContaining({ name: "name" }),
        expect.objectContaining({ name: "created_at" }),
        expect.objectContaining({ name: "updated_at" }),
      ]),
    );
    expect(sourceProductColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "owner_key" }),
        expect.objectContaining({ name: "source_url_normalized" }),
        expect.objectContaining({ name: "source_platform" }),
        expect.objectContaining({ name: "note" }),
      ]),
    );
    expect(sourceProductEtsyLinkColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "source_product_id" }),
        expect.objectContaining({ name: "etsy_url_normalized" }),
        expect.objectContaining({ name: "etsy_listing_id" }),
      ]),
    );
    expect(notificationsColumns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" })]),
    );
    expect(manualRunColumns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" })]),
    );
    expect(productIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "products_owner_trendyol_active_unique", partial: 1 }),
        expect.objectContaining({ name: "products_owner_deleted_created_idx" }),
        expect.objectContaining({ name: "products_owner_category_created_idx" }),
      ]),
    );
    expect(sourceProductIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "source_products_owner_source_url_unique" }),
        expect.objectContaining({ name: "source_products_owner_updated_at_idx" }),
      ]),
    );
    expect(sourceProductEtsyLinkIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "source_product_etsy_links_owner_etsy_url_unique" }),
        expect.objectContaining({ name: "source_product_etsy_links_source_product_id_idx" }),
        expect.objectContaining({ name: "source_product_etsy_links_owner_listing_id_idx" }),
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
    expect(settingsColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "ai_target_base_url" }),
        expect.objectContaining({ name: "ai_target_management_key" }),
        expect.objectContaining({ name: "ai_target_label" }),
        expect.objectContaining({ name: "ai_target_api_key" }),
        expect.objectContaining({ name: "etsy_cost_calculator_json" }),
      ]),
    );
    expect(database.prepare("pragma table_info(tariff_classification_catalog)").all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "profile_name" }),
        expect.objectContaining({ name: "confidence_mode" }),
        expect.objectContaining({ name: "master_entry_id" }),
        expect.objectContaining({ name: "default_shipentegra_usd" }),
      ]),
    );
  });
});
