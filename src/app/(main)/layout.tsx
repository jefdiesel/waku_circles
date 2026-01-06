import { AppShell } from '@/components/layout/AppShell'
import { WakuProvider } from '@/components/waku/WakuProvider'
import { db, communities, spaces } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// This is a placeholder - in a real app, you'd determine the community from the route
const DEMO_COMMUNITY_SLUG = 'demo'

async function getCommunityAndSpaces(communitySlug: string) {
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
      columns: {
        id: true,
        name: true,
        slug: true,
        emoji: true,
        spaceType: true,
      },
    })

    return { community, spaces: communitySpaces }
  } catch (error) {
    console.error('Failed to fetch community and spaces:', error)
    return { community: null, spaces: [] }
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { community, spaces: communitySpaces } = await getCommunityAndSpaces(DEMO_COMMUNITY_SLUG)

  return (
    <WakuProvider>
      <AppShell communitySlug={DEMO_COMMUNITY_SLUG} spaces={communitySpaces}>
        {children}
      </AppShell>
    </WakuProvider>
  )
}
