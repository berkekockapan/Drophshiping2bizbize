import type { D1Database } from "../../config/bindings";
import { listStoredProfiles } from "../ai/syncProfileMetadata";
import { createDraftsRepo, type EtsyDraftRecord } from "../../db/repositories/draftsRepo";
import { buildProductDetailView } from "../tracking/buildProductDetailView";

export interface EtsyPrepConnectorProfileSnapshot {
  id: string;
  label: string;
}

export interface EtsyPrepView {
  product: NonNullable<Awaited<ReturnType<typeof buildProductDetailView>>>["product"];
  draft: EtsyDraftRecord;
  connectorProfileSnapshot: EtsyPrepConnectorProfileSnapshot | null;
}

export async function buildEtsyPrepView(db: D1Database, productId: string): Promise<EtsyPrepView | null> {
  const detail = await buildProductDetailView(db, productId);
  if (!detail) {
    return null;
  }

  const draftsRepo = createDraftsRepo(db);
  const draft = await draftsRepo.ensureForProduct(productId);
  const activeProfile = (await listStoredProfiles(db)).find((profile) => profile.isActive);

  return {
    product: detail.product,
    draft,
    connectorProfileSnapshot: activeProfile
      ? {
          id: activeProfile.id,
          label: activeProfile.label,
        }
      : null,
  };
}
