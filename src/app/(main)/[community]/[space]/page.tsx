import { ChatRoom } from '@/components/waku/ChatRoom'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSpace } from '@/lib/actions/spaces'
import { getPosts } from '@/lib/actions/posts'
import { PostCard } from '@/components/posts/PostCard'
import { NewPostButton } from '@/components/posts/NewPostButton'

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

  // For discussion spaces, show posts
  if (space.spaceType === 'discussion') {
    const posts = await getPosts(space.id)

    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {space.emoji && <span className="text-3xl">{space.emoji}</span>}
              {space.name}
            </h1>
            {space.description && (
              <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
            )}
          </div>
          <NewPostButton spaceId={space.id} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No posts yet. Be the first to post!</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  communitySlug={communitySlug}
                  spaceSlug={spaceSlug}
                />
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // For chat spaces, show real-time chat
  if (space.spaceType === 'chat') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {space.emoji && <span className="text-3xl">{space.emoji}</span>}
            {space.name}
          </h1>
          {space.description && (
            <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatRoom spaceId={space.id} currentUserId={user.id} />
        </div>
      </div>
    )
  }

  // Other space types - coming soon
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {space.emoji && <span className="text-3xl">{space.emoji}</span>}
          {space.name}
        </h1>
        {space.description && (
          <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{space.spaceType} spaces coming soon</p>
      </div>
    </div>
  )
}
