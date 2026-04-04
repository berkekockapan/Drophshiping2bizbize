import type { SourceProductItem } from "../../../app/api";

export interface SourceProductSection {
  key: string;
  title: string;
  categoryId: string | null;
  items: SourceProductItem[];
}

function getSectionKey(item: SourceProductItem) {
  return item.sourceCategory?.id ?? "uncategorized";
}

function getSectionTitle(item: SourceProductItem) {
  return item.sourceCategory?.name ?? "Kategorisiz";
}

function sortSectionItems(items: SourceProductItem[]) {
  return [...items].sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title, "tr");
  });
}

export function groupSourceProductsByCategory(
  items: SourceProductItem[],
  selectedCategoryId: string | "uncategorized" | null,
) {
  const buckets = new Map<string, SourceProductSection>();

  for (const item of items) {
    const key = getSectionKey(item);
    const current = buckets.get(key) ?? {
      key,
      title: getSectionTitle(item),
      categoryId: item.sourceCategory?.id ?? null,
      items: [],
    };

    current.items.push(item);
    buckets.set(key, current);
  }

  const orderedSections = [...buckets.values()]
    .map((section) => ({
      ...section,
      items: sortSectionItems(section.items),
    }))
    .sort((left, right) => {
      if (left.key === "uncategorized") {
        return 1;
      }

      if (right.key === "uncategorized") {
        return -1;
      }

      return left.title.localeCompare(right.title, "tr");
    });

  if (!selectedCategoryId) {
    return orderedSections.filter((section) => section.items.length > 0);
  }

  const selectedKey = selectedCategoryId === "uncategorized" ? "uncategorized" : selectedCategoryId;
  return orderedSections.filter((section) => section.key === selectedKey);
}
