'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle, ShieldCheck } from 'lucide-react'

import { signInAction, type AuthFormState } from '@/lib/actions/auth'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/input'

export function AdminLoginPanel() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signInAction, undefined)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 rcx-shadow-lg">
        <Link href="/" aria-label="RCX home">
          <Logo />
        </Link>

        <div className="mt-8 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">RCX platform administration</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in with a platform-administrator account. Customer workspace roles do not grant access to this control plane.
        </p>

        {state?.error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value="/admin" />
          <Field>
            <Label htmlFor="admin-email">Admin email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="admin@company.com"
            />
          </Field>
          <Field>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••••••"
            />
          </Field>
          <Button type="submit" className="mt-2 w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in to admin'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground hover:underline">
            Return to workspace sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
