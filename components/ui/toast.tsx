'use client'

import * as React from 'react'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

type ToastInput = Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }

type ToastContextValue = {
  toast: (titleOrToast: string | ToastInput, description?: string, variant?: ToastVariant) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const accent = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-signal-blue',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const idRef = React.useRef(0)

  const toast = React.useCallback(
    (titleOrToast: string | ToastInput, description?: string, variant?: ToastVariant) => {
      const id = idRef.current++
      const next: Toast =
        typeof titleOrToast === 'string'
          ? { id, title: titleOrToast, description, variant: variant ?? 'success' }
          : { id, title: titleOrToast.title, description: titleOrToast.description, variant: titleOrToast.variant ?? 'success' }
      setToasts((prev) => [...prev, next])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, 4000)
    },
    [],
  )

  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const Icon = icons[t.variant] ?? Info
          return (
            <div
              key={t.id}
              role="status"
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 rcx-shadow-lg animate-in slide-in-from-bottom-2 fade-in"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', accent[t.variant])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
