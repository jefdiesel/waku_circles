import { ChatRoom } from '@/components/waku/ChatRoom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSpace } from '@/lib/actions/spaces'

interface SpacePageProps {
  params: Promise<{
    community: string
    space: string
  }>
}

export default async function SpacePage({ params }: SpacePageProps) {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { community: communitySlug, space: spaceSlug } = await params

  // Fetch space data from database
  const spaceResult = await getSpace(communitySlug, spaceSlug)

  if (!spaceResult.success) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Space not found</h1>
        <p className="text-muted-foreground">The space you're looking for doesn't exist.</p>
      </div>
    )
  }

  const space = spaceResult.space

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {space.emoji && <span className="text-3xl">{space.emoji}</span>}
          {space.name}
        </h1>
        {space.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {space.description}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {space.spaceType === 'chat' ? (
          <ChatRoom spaceId={space.id} currentUserId={user.id} />
        ) : (
          <div className="p-8">
            <Card>
              <CardHeader>
                <CardTitle>{space.spaceType === 'discussion' ? 'Discussions' : space.spaceType}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This {space.spaceType} space is ready to use. Content features coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
