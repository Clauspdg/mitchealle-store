import type { Metadata } from "next"

import { requirePermission } from "@/lib/session.server"
import { listUsers } from "@/services/firestore/users"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { UserRoleSelect } from "@/features/users/components/user-role-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = { title: "Utilisateurs" }
export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  await requirePermission("users")
  const users = await listUsers()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">
            Attribuez un rôle à chaque utilisateur — Support, Staff, Manager,
            Admin ou Super Admin.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">
                    {user.displayName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <UserRoleSelect uid={user.uid} role={user.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
