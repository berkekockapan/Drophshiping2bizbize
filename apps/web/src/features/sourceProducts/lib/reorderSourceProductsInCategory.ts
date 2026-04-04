import type { SourceProductItem } from "../../../app/api";

function isInCategory(item: SourceProductItem, categoryId: string | null) {
  return (item.sourceCategory?.id ?? null) === categoryId;
}

export function reorderSourceProductsInCategory(
  items: SourceProductItem[],
  categoryId: string | null,
  orderedIds: string[],
) {
  const targetItems = items.filter((item) => isInCategory(item, categoryId));
  if (targetItems.length !== orderedIds.length || targetItems.some((item) => !orderedIds.includes(item.id))) {
    return items;
  }

  const byId = new Map(targetItems.map((item) => [item.id, item]));
  const reordered = orderedIds.map((id, index) => {
    const current = byId.get(id);
    if (!current) {
      return null;
    }

    return {
      ...current,
      sortOrder: index,
    };
  });

  if (reordered.some((item) => item === null)) {
    return items;
  }

  let cursor = 0;
  return items.map((item) => {
    if (!isInCategory(item, categoryId)) {
      return item;
    }

    const nextItem = reordered[cursor];
    cursor += 1;
    return nextItem ?? item;
  });
}
