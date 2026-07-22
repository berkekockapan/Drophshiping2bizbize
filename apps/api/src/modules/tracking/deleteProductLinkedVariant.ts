import type { D1Database } from "../../config/bindings";
import type { OwnerKey } from "../../contracts/owners";
import { createProductLinkedVariantsRepo } from "../../db/repositories/productLinkedVariantsRepo";

export async function deleteProductLinkedVariant(
  db: D1Database,
  ownerKey: OwnerKey,
  parentProductId: string,
  linkedVariantId: string,
) {
  return createProductLinkedVariantsRepo(db).delete(ownerKey, parentProductId, linkedVariantId);
}
