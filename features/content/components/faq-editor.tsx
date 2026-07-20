"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { updateFaqPageAction } from "@/features/content/actions/content-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { FaqItem, FaqPage } from "@/types/content-page"

export function FaqEditor({ page }: { page: FaqPage }) {
  const router = useRouter()
  const [title, setTitle] = useState(page.title)
  const [items, setItems] = useState<FaqItem[]>(page.items)
  const [saving, setSaving] = useState(false)

  function updateItem(index: number, patch: Partial<FaqItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function addItem() {
    setItems((current) => [...current, { question: "", answer: "" }])
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateFaqPageAction({ title, items })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("FAQ enregistrée.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="faq-title">Titre</Label>
        <Input
          id="faq-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                value={item.question}
                onChange={(event) =>
                  updateItem(index, { question: event.target.value })
                }
                placeholder="Question"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeItem(index)}
                aria-label="Supprimer la question"
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </div>
            <Textarea
              rows={3}
              value={item.answer}
              onChange={(event) =>
                updateItem(index, { answer: event.target.value })
              }
              placeholder="Réponse..."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <PlusIcon />
          Ajouter une question
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
