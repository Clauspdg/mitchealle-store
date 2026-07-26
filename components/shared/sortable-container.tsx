"use client"

import { useId } from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

/**
 * Generic drag-and-drop reorder wrapper — replaces the up/down-arrow
 * reordering UI with real drag-and-drop while calling the exact same
 * `onReorder(orderedIds)` backend action every existing reorder feature
 * already uses (e.g. `reorderCategoriesAction`).
 */
export function SortableContainer<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[]
  onReorder: (orderedIds: string[]) => void
  children: React.ReactNode
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )
  // dnd-kit's default id generator is a module-level counter, which can
  // diverge between the server render and the client's first render pass
  // (each has its own module instance/order) and trip a hydration
  // mismatch — React's `useId()` is specifically built to stay identical
  // across both.
  const dndId = useId()

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onReorder(arrayMove(items, oldIndex, newIndex).map((item) => item.id))
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}
