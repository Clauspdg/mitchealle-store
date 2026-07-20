"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { updateMenuAction } from "@/features/menus/actions/menu-actions"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Menu, MenuItem } from "@/types/menu"

function reindex(
  items: MenuItem[],
  parentId: string | null,
  orderedIds: string[]
) {
  const positionById = new Map(orderedIds.map((id, index) => [id, index]))
  return items.map((item) =>
    item.parentId === parentId && positionById.has(item.id)
      ? { ...item, position: positionById.get(item.id)! }
      : item
  )
}

function ItemRow({
  item,
  onChange,
  onDelete,
}: {
  item: MenuItem
  onChange: (patch: Partial<MenuItem>) => void
  onDelete: () => void
}) {
  const { setNodeRef, attributes, listeners, style } = useDragHandle(item.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-2 rounded-md border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <Input
        value={item.label}
        onChange={(event) => onChange({ label: event.target.value })}
        placeholder="Libellé"
        className="flex-1"
      />
      <Input
        value={item.href}
        onChange={(event) => onChange({ href: event.target.value })}
        placeholder="/lien (vide = groupe)"
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="Supprimer"
      >
        <Trash2Icon className="text-destructive" />
      </Button>
    </div>
  )
}

export function MenuEditor({
  menu,
  allowGroups = false,
}: {
  menu: Menu
  allowGroups?: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>(menu.items)
  const [saving, setSaving] = useState(false)

  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.position - b.position)

  function childrenOf(parentId: string) {
    return items
      .filter((i) => i.parentId === parentId)
      .sort((a, b) => a.position - b.position)
  }

  function updateItem(id: string, patch: Partial<MenuItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  function deleteItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id && item.parentId !== id)
    )
  }

  function addTopLevel() {
    const id = `item-${Date.now()}`
    setItems((current) => [
      ...current,
      {
        id,
        label: "Nouveau lien",
        href: "/",
        position: topLevel.length,
        parentId: null,
      },
    ])
  }

  function addChild(parentId: string) {
    const id = `item-${Date.now()}`
    const siblings = childrenOf(parentId)
    setItems((current) => [
      ...current,
      {
        id,
        label: "Nouveau lien",
        href: "/",
        position: siblings.length,
        parentId,
      },
    ])
  }

  function handleTopLevelReorder(orderedIds: string[]) {
    setItems((current) => reindex(current, null, orderedIds))
  }

  function handleChildReorder(parentId: string, orderedIds: string[]) {
    setItems((current) => reindex(current, parentId, orderedIds))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateMenuAction(menu.id, items)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Menu enregistré.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SortableContainer items={topLevel} onReorder={handleTopLevelReorder}>
        <div className="flex flex-col gap-3">
          {topLevel.map((item) => {
            const children = childrenOf(item.id)
            return (
              <div key={item.id} className="flex flex-col gap-2">
                <ItemRow
                  item={item}
                  onChange={(patch) => updateItem(item.id, patch)}
                  onDelete={() => deleteItem(item.id)}
                />
                {allowGroups ? (
                  <div className="ml-6 flex flex-col gap-2">
                    <SortableContainer
                      items={children}
                      onReorder={(ids) => handleChildReorder(item.id, ids)}
                    >
                      <div className="flex flex-col gap-2">
                        {children.map((child) => (
                          <ItemRow
                            key={child.id}
                            item={child}
                            onChange={(patch) => updateItem(child.id, patch)}
                            onDelete={() => deleteItem(child.id)}
                          />
                        ))}
                      </div>
                    </SortableContainer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit"
                      onClick={() => addChild(item.id)}
                    >
                      <PlusIcon />
                      Ajouter un lien
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </SortableContainer>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addTopLevel}>
          <PlusIcon />
          {allowGroups ? "Ajouter un groupe" : "Ajouter un lien"}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
