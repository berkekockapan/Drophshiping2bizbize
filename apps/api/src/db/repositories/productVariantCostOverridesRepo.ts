import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

export interface VariantCostOverrideRow {
  variantId: string;
  productId: string;
  ownerKey: string;
  manualProductCostAmount: number | null;
  manualProductCostCurrency: string | null;
  manualShippingCostAmount: number | null;
  manualShippingCostCurrency: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface UpsertVariantCostOverrideInput {
  variantId: string;
  productId: string;
  ownerKey: string;
  manualProductCostAmount: number | null;
  manualProductCostCurrency: string | null;
  manualShippingCostAmount: number | null;
  manualShippingCostCurrency: string | null;
  updatedAt?: number;
}

export function createProductVariantCostOverridesRepo(db: D1Database) {
  return {
    async upsert(input: UpsertVariantCostOverrideInput) {
      const now = input.updatedAt ?? Date.now();

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into product_variant_cost_overrides
             (variant_id, product_id, owner_key, manual_product_cost_amount, manual_product_cost_currency, manual_shipping_cost_amount, manual_shipping_cost_currency, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?)
             on conflict(variant_id) do update set
               product_id = excluded.product_id,
               owner_key = excluded.owner_key,
               manual_product_cost_amount = excluded.manual_product_cost_amount,
               manual_product_cost_currency = excluded.manual_product_cost_currency,
               manual_shipping_cost_amount = excluded.manual_shipping_cost_amount,
               manual_shipping_cost_currency = excluded.manual_shipping_cost_currency,
               updated_at = excluded.updated_at`,
          )
          .bind(
            input.variantId,
            input.productId,
            input.ownerKey,
            input.manualProductCostAmount,
            input.manualProductCostCurrency,
            input.manualShippingCostAmount,
            input.manualShippingCostCurrency,
            now,
            now,
          )
          .run();
      });

      return this.getByVariantId(input.variantId);
    },
    async getByVariantId(variantId: string) {
      return db
        .prepare(
          `select variant_id as variantId, product_id as productId, owner_key as ownerKey,
                  manual_product_cost_amount as manualProductCostAmount,
                  manual_product_cost_currency as manualProductCostCurrency,
                  manual_shipping_cost_amount as manualShippingCostAmount,
                  manual_shipping_cost_currency as manualShippingCostCurrency,
                  created_at as createdAt, updated_at as updatedAt
           from product_variant_cost_overrides
           where variant_id = ?
           limit 1`,
        )
        .bind(variantId)
        .first<VariantCostOverrideRow>();
    },
    async listByProductId(productId: string) {
      const rows = await db
        .prepare(
          `select variant_id as variantId, product_id as productId, owner_key as ownerKey,
                  manual_product_cost_amount as manualProductCostAmount,
                  manual_product_cost_currency as manualProductCostCurrency,
                  manual_shipping_cost_amount as manualShippingCostAmount,
                  manual_shipping_cost_currency as manualShippingCostCurrency,
                  created_at as createdAt, updated_at as updatedAt
           from product_variant_cost_overrides
           where product_id = ?
           order by variant_id asc`,
        )
        .bind(productId)
        .all<VariantCostOverrideRow>();

      return rows.results;
    },
  };
}
