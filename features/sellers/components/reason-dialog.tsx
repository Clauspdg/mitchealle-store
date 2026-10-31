"use client"

import { useState, type ReactElement } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ReasonDialogProps {
  trigger: ReactElement
  title: string
  description: string
  confirmLabel: string
  /** Returns true when the dialog can close. */
  onConfirm: (reason: string) => Promise<boolean>
}

/** A destructive decision that must be explained: refusal, suspension. */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ReasonDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const tooShort = reason.trim().length < 10

  async function handleConfirm() {
    setPending(true)
    try {
      if (await onConfirm(reason.trim())) {
        setOpen(false)
        setReason("")
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision-reason">Motif</Label>
          <Textarea
            id="decision-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={1000}
          />
          <p className="text-muted-foreground text-xs">
            10 caractères minimum. Le motif est conservé dans l&apos;historique.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || tooShort}
            onClick={handleConfirm}
          >
            {pending ? "..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
