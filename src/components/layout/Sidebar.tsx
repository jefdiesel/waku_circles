'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Hash, Calendar, BookOpen, Settings, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface Space {
  id: string
  name: string
  slug: string
  emoji?: string | null
  spaceType: string
}

interface SidebarProps {
  communitySlug: string
  spaces: Space[]
}

export function Sidebar({ communitySlug, spaces }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { icon: Home, label: 'Home', href: `/${communitySlug}` },
    { icon: MessageSquare, label: 'Messages', href: `/messages` },
    { icon: Calendar, label: 'Events', href: `/${communitySlug}/events` },
    { icon: BookOpen, label: 'Courses', href: `/${communitySlug}/courses` },
    { icon: Settings, label: 'Settings', href: `/${communitySlug}/settings` },
  ]

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4">
        <h2 className="font-semibold text-lg">{communitySlug}</h2>
      </div>

      <Separator />

      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Separator className="my-2" />

      <div className="px-4 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Spaces
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {spaces.map((space) => {
            const href = `/${communitySlug}/${space.slug}`
            const isActive = pathname === href

            return (
              <Link
                key={space.id}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <span>{space.emoji || <Hash className="h-4 w-4" />}</span>
                {space.name}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
