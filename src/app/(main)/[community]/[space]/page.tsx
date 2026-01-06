import { ChatRoom } from '@/components/waku/ChatRoom'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSpace } from '@/lib/actions/spaces'
import { getPosts } from '@/lib/actions/posts'
import { getEvents } from '@/lib/actions/events'
import { getCourse } from '@/lib/actions/courses'
import { PostCard } from '@/components/posts/PostCard'
import { NewPostButton } from '@/components/posts/NewPostButton'
import { EventCard } from '@/components/events/EventCard'
import { CourseView } from '@/components/courses/CourseView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen } from 'lucide-react'
import { getResources } from '@/lib/actions/resources'
import { ResourceUpload } from '@/components/resources/ResourceUpload'
import { ResourceList } from '@/components/resources/ResourceList'

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

  // Discussion spaces - show posts
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

  // Chat spaces - show real-time Waku chat
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

  // Course spaces - show course content
  if (space.spaceType === 'course') {
    const course = await getCourse(space.id)

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
        <div className="flex-1 overflow-auto">
          {course ? (
            <CourseView course={course} />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No course content available yet.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Events spaces - show events
  if (space.spaceType === 'events') {
    const events = await getEvents(space.id)

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
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No events scheduled yet.</p>
            ) : (
              events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // Resources spaces - show files/resources
  if (space.spaceType === 'resources') {
    const resources = await getResources(space.id)

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
          <ResourceUpload spaceId={space.id} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <ResourceList resources={resources} />
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unknown types
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {space.emoji && <span className="text-3xl">{space.emoji}</span>}
          {space.name}
        </h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Unknown space type: {space.spaceType}</p>
      </div>
    </div>
  )
}
