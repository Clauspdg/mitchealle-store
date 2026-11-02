import { redirect } from "next/navigation"

import { getSession } from "@/lib/session.server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Already signed in: back to the shop, not to the account dashboard.
  if (session) {
    redirect("/")
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
