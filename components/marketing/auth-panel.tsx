'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input, Label, Field } from '@/components/ui/input'

export function AuthPanel({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const isSignup = mode === 'signup'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push('/app')
  }

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
              ? 'Start building RCS journeys with local demo data — no carrier credentials required.'
              : 'Sign in to your RCX operating workspace.'}
          </p>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            {isSignup && (
              <Field>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jordan Rivera" autoComplete="name" />
              </Field>
            )}
            <Field>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} />
            </Field>
            <Button type="submit" className="mt-2 w-full">
              {isSignup ? 'Create workspace' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-primary hover:underline">
              {isSignup ? 'Sign in' : 'Get started free'}
            </Link>
          </p>
          <p className="mt-8 text-xs text-muted-foreground">
            This is a demonstration prototype. Any credentials open the demo workspace.
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
