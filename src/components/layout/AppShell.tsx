'use client'

import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { type ReactNode } from 'react'

interface Space {
  id: string
  name: string
  slug: string
  emoji?: string
  spaceType: string
}

interface AppShellProps {
  children: ReactNode
  communitySlug: string
  spaces: Space[]
}

export function AppShell({ children, communitySlug, spaces }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar communitySlug={communitySlug} spaces={spaces} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
