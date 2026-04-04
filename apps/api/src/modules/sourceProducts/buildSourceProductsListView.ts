import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo, type SourceProductRecord } from "../../db/repositories/sourceProductsRepo";

function toSourceProductCards(items: SourceProductRecord[]) {
  return items.map(({ sourceCategoryId, sourceCategoryName, ...item }) => ({
    ...item,
    sourceCategory:
      sourceCategoryId && sourceCategoryName
        ? {
            id: sourceCategoryId,
            name: sourceCategoryName,
          }
        : null,
  }));
}

export async function buildSourceProductsListView(
  db: D1Database,
  ownerKey: OwnerKey,
  filters: { search?: string | null; categoryId?: string | "uncategorized" | null } = {},
) {
  const repo = createSourceProductsRepo(db);
  const items = await repo.listActive(ownerKey, filters);

  return {
    items: toSourceProductCards(items),
    filters,
  };
}

export async function buildSourceProductsTrashView(db: D1Database, ownerKey: OwnerKey) {
  const items = await createSourceProductsRepo(db).listTrash(ownerKey);

  return {
    items: toSourceProductCards(items),
    total: items.length,
  };
}
