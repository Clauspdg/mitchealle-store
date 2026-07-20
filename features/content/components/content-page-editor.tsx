"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { updateContentPageAction } from "@/features/content/actions/content-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  ContentPage,
  ContentPageKey,
  ContentSection,
} from "@/types/content-page"

export function ContentPageEditor({
  pageKey,
  page,
}: {
  pageKey: ContentPageKey
  page: ContentPage
}) {
  const router = useRouter()
  const [title, setTitle] = useState(page.title)
  const [sections, setSections] = useState<ContentSection[]>(page.sections)
  const [saving, setSaving] = useState(false)

  function updateSection(index: number, patch: Partial<ContentSection>) {
    setSections((current) =>
      current.map((section, i) =>
        i === index ? { ...section, ...patch } : section
      )
    )
  }

  function addSection() {
    setSections((current) => [...current, { heading: "", body: "" }])
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateContentPageAction(pageKey, { title, sections })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Page enregistrée.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${pageKey}-title`}>Titre</Label>
        <Input
          id={`${pageKey}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                value={section.heading}
                onChange={(event) =>
                  updateSection(index, { heading: event.target.value })
                }
                placeholder="Sous-titre (optionnel)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeSection(index)}
                aria-label="Supprimer la section"
              >
                <Trash2Icon className="text-destructive" />
              </Button>
            </div>
            <Textarea
              rows={4}
              value={section.body}
              onChange={(event) =>
                updateSection(index, { body: event.target.value })
              }
              placeholder="Texte du paragraphe..."
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <PlusIcon />
          Ajouter une section
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  )
}
