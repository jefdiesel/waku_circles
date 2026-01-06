'use client'

import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Waku
const Trollbox = dynamic(
  () => import('waku-trollbox').then((mod) => mod.Trollbox),
  { ssr: false, loading: () => <div className="p-4 text-muted-foreground">Loading chat...</div> }
)

interface ChatRoomProps {
  spaceId: string
  currentUserId: string
}

export function ChatRoom({ spaceId }: ChatRoomProps) {
  return (
    <div className="h-full">
      <Trollbox
        appId={`opencircle-${spaceId}`}
        primaryColor="indigo"
        accentColor="purple"
      />
    </div>
  )
}
