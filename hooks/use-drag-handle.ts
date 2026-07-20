import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

/**
 * Thin wrapper over `@dnd-kit/sortable`'s `useSortable` — used by every
 * admin drag-and-drop reorder list (categories, collections, banners,
 * homepage sections) so each one doesn't re-derive the transform/transition
 * style boilerplate.
 */
export function useDragHandle(id: string) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    },
  }
}
