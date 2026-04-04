import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";

import type { SourceProductCategory, SourceProductItem } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { SourceProductCard } from "./SourceProductCard";
import type { SourceProductSection } from "../lib/groupSourceProductsByCategory";

interface SortableSourceProductSectionProps {
  ownerKey: OwnerKey;
  section: SourceProductSection;
  categories: SourceProductCategory[];
  onCategoryChange: (item: SourceProductItem, categoryId: string | null) => void;
  onDelete: (item: SourceProductItem) => void;
  onReorder: (categoryId: string | null, orderedIds: string[]) => void;
}

function SortableSourceProductCard({
  ownerKey,
  item,
  categories,
  onCategoryChange,
  onDelete,
}: {
  ownerKey: OwnerKey;
  item: SourceProductItem;
  categories: SourceProductCategory[];
  onCategoryChange: (item: SourceProductItem, categoryId: string | null) => void;
  onDelete: (item: SourceProductItem) => void;
}) {
  const sortable = useSortable({ id: item.id });

  return (
    <SourceProductCard
      ownerKey={ownerKey}
      item={item}
      categories={categories}
      onCategoryChange={onCategoryChange}
      onDelete={onDelete}
      sortable={{
        setNodeRef: sortable.setNodeRef,
        attributes: sortable.attributes,
        listeners: sortable.listeners,
        setActivatorNodeRef: sortable.setActivatorNodeRef,
        transform: sortable.transform,
        transition: sortable.transition,
        isDragging: sortable.isDragging,
      }}
    />
  );
}

export function SortableSourceProductSection({
  ownerKey,
  section,
  categories,
  onCategoryChange,
  onDelete,
  onReorder,
}: SortableSourceProductSectionProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const itemIds = section.items.map((item) => item.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) {
          return;
        }

        const oldIndex = itemIds.indexOf(String(active.id));
        const newIndex = itemIds.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) {
          return;
        }

        onReorder(section.categoryId, arrayMove(itemIds, oldIndex, newIndex));
      }}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className="grid gap-4 xl:grid-cols-2">
          {section.items.map((item) => (
            <SortableSourceProductCard
              key={item.id}
              ownerKey={ownerKey}
              item={item}
              categories={categories}
              onCategoryChange={onCategoryChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
