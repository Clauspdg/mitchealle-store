"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/providers/auth-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { CompareProvider } from "@/features/compare/context/compare-context"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <CompareProvider>
            {children}
            <Toaster />
          </CompareProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
