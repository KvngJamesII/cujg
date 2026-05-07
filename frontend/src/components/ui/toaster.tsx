import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="dark"
      toastOptions={{
        style: {
          background: 'var(--bg-secondary, #111827)',
          border: '1px solid var(--border, #1F2937)',
          color: 'var(--text-primary, #F9FAFB)',
        },
      }}
    />
  )
}
