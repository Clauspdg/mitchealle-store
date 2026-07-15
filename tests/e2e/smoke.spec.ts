import { expect, test } from "@playwright/test"

test("home page loads and shows the site name", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("link", { name: "Mitchaella Store" })
  ).toBeVisible()
})

test("login page renders the login form", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.getByLabel("Mot de passe")).toBeVisible()
})

test("an unprotected unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist")
  await expect(page.getByText("Page introuvable")).toBeVisible()
})

test("visiting /account while signed out redirects to /login", async ({
  page,
}) => {
  await page.goto("/account")
  await expect(page).toHaveURL(/\/login/)
})
