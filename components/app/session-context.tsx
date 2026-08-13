'use client'

import * as React from 'react'

export type AppSession = {
  userName: string
  userEmail: string
  workspaceId: string
  workspaceName: string
  isDemo: boolean
  environment: 'test' | 'live'
  workspaces: { id: string; name: string; slug: string; isDemo: boolean }[]
}

const SessionContext = React.createContext<AppSession | null>(null)

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession
  children: React.ReactNode
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

/**
 * Resolved server-side in app/app/layout.tsx and passed down, rather than fetched
 * on the client. Nothing here is an authorization decision — the server re-checks
 * scope on every query.
 */
export function useSession(): AppSession {
  const value = React.useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside the app shell')
  return value
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
