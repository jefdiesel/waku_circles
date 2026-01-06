import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db, communities, spaces } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import Link from 'next/link'
import { MessageSquare, BookOpen, Calendar, FolderOpen, MessageCircle } from 'lucide-react'

interface CommunityPageProps {
  params: Promise<{
    community: string
  }>
}

const spaceTypeIcons = {
  discussion: MessageSquare,
  chat: MessageCircle,
  course: BookOpen,
  events: Calendar,
  resources: FolderOpen,
}

async function getCommunityData(communitySlug: string) {
  try {
    // Fetch community by slug
    const community = await db.query.communities.findFirst({
      where: eq(communities.slug, communitySlug),
    })

    if (!community) {
      return { community: null, spaces: [] }
    }

    // Fetch non-archived spaces for the community
    const communitySpaces = await db.query.spaces.findMany({
      where: and(
        eq(spaces.communityId, community.id),
        eq(spaces.isArchived, false)
      ),
      orderBy: (spaces, { asc }) => [asc(spaces.sortOrder), asc(spaces.name)],
    })

    return { community, spaces: communitySpaces }
  } catch (error) {
    console.error('Failed to fetch community data:', error)
    return { community: null, spaces: [] }
  }
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { community: communitySlug } = await params
  const { community, spaces: communitySpaces } = await getCommunityData(communitySlug)

  if (!community) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Community not found</h1>
        <p className="text-muted-foreground">The community you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to {community.name}</h1>
          {community.description && (
            <p className="text-muted-foreground">{community.description}</p>
          )}
        </div>
        <Link href={`/${communitySlug}/spaces/new`}>
          <Button>Create Space</Button>
        </Link>
      </div>

      {communitySpaces.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Spaces</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communitySpaces.map((space) => {
              const Icon = spaceTypeIcons[space.spaceType] || FolderOpen
              return (
                <Link key={space.id} href={`/${communitySlug}/${space.slug}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {space.emoji ? (
                          <span className="text-2xl">{space.emoji}</span>
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                        {space.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {space.description ? (
                        <p className="text-muted-foreground">{space.description}</p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          {space.spaceType === 'discussion' && 'Join the discussion'}
                          {space.spaceType === 'chat' && 'Start chatting'}
                          {space.spaceType === 'course' && 'Start learning'}
                          {space.spaceType === 'events' && 'View upcoming events'}
                          {space.spaceType === 'resources' && 'Browse resources'}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded-md capitalize">
                          {space.spaceType}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Spaces Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first space. Spaces help organize your community content.
            </p>
            <Link href={`/${communitySlug}/spaces/new`}>
              <Button>Create Your First Space</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
