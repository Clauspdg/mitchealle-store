import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Envoyer</Button>)
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Envoyer</Button>)

    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Envoyer
      </Button>
    )

    await userEvent.click(screen.getByRole("button", { name: "Envoyer" }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
