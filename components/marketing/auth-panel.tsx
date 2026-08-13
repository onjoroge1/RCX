'use client'

import * as React from 'react'
import Link from 'next/link'
import { useActionState } from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'

import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input, Label, Field } from '@/components/ui/input'
import { signInAction, signUpAction, signInAsDemoAction, type AuthFormState } from '@/lib/actions/auth'

export function AuthPanel({
  mode,
  next,
  demoEnabled,
}: {
  mode: 'login' | 'signup'
  next?: string
  demoEnabled: boolean
}) {
  const isSignup = mode === 'signup'
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignup ? signUpAction : signInAction,
    undefined,
  )
  const [demoState, demoAction, demoPending] = useActionState<AuthFormState, FormData>(
    signInAsDemoAction,
    undefined,
  )

  const error = state?.error ?? demoState?.error

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" aria-label="RCX home">
            <Logo />
          </Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight">
            {isSignup ? 'Create your workspace' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? 'Set up a workspace for your team. No carrier credentials required.'
              : 'Sign in to your RCX operating workspace.'}
          </p>

          {demoEnabled && (
            <>
              <form action={demoAction} className="mt-8">
                <Button type="submit" variant="outline" className="w-full" disabled={demoPending}>
                  {demoPending ? 'Opening demo…' : 'Explore the demo workspace'}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form action={formAction} className={demoEnabled ? 'flex flex-col gap-4' : 'mt-8 flex flex-col gap-4'}>
            {next && <input type="hidden" name="next" value={next} />}
            {isSignup && (
              <>
                <Field>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" name="name" required placeholder="Jordan Rivera" autoComplete="name" />
                </Field>
                <Field>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" required placeholder="Northstar Auto" autoComplete="organization" />
                </Field>
              </>
            )}
            <Field>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={isSignup ? 10 : undefined}
                placeholder="••••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
              {isSignup && (
                <p className="mt-1 text-xs text-muted-foreground">At least 10 characters.</p>
              )}
            </Field>
            <Button type="submit" className="mt-2 w-full" disabled={pending}>
              {pending ? 'Working…' : isSignup ? 'Create workspace' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-primary hover:underline">
              {isSignup ? 'Sign in' : 'Get started free'}
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 flex flex-col justify-center px-12 text-primary-foreground">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">
            The operating platform for business RCS
          </p>
          <p className="mt-4 text-balance text-3xl font-semibold leading-tight">
            Turn ordinary customer messages into completed bookings, payments, and purchases.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-primary-foreground/85">
            <li>Branded, verified sender identity</li>
            <li>RCS with intelligent SMS fallback</li>
            <li>Two-way conversations and human takeover</li>
            <li>Analytics and attributed outcomes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
