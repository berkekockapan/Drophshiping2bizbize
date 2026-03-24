import type { D1Database } from "../../config/bindings";
import { createDraftsRepo, type EtsyDraftRecord } from "../../db/repositories/draftsRepo";
import { buildProductDetailView } from "../tracking/buildProductDetailView";

export interface EtsyPrepView {
  product: NonNullable<Awaited<ReturnType<typeof buildProductDetailView>>>["product"];
  draft: EtsyDraftRecord;
}

export async function buildEtsyPrepView(db: D1Database, productId: string): Promise<EtsyPrepView | null> {
  const detail = await buildProductDetailView(db, productId);
  if (!detail) {
    return null;
  }

  const draftsRepo = createDraftsRepo(db);
  const draft = await draftsRepo.ensureForProduct(productId);

  return {
    product: detail.product,
    draft,
  };
}
