import { PostCard } from "@/components/posts/PostCard";
import { getPosts } from "@/lib/actions/posts";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NewPostButton } from "@/components/posts/NewPostButton";
import { db, communities, spaces } from "@/lib/db";
import { eq, and } from "drizzle-orm";

interface DiscussionPageProps {
  params: Promise<{
    community: string;
    space: string;
  }>;
}

export default async function DiscussionPage({ params }: DiscussionPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { community, space } = await params;

  // Get community by slug
  const communityData = await db.query.communities.findFirst({
    where: eq(communities.slug, community),
  });

  if (!communityData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Community not found</h1>
          <p className="text-muted-foreground">
            The community you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  // Get space by slug
  const spaceData = await db.query.spaces.findFirst({
    where: and(
      eq(spaces.communityId, communityData.id),
      eq(spaces.slug, space)
    ),
  });

  if (!spaceData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Space not found</h1>
          <p className="text-muted-foreground">
            The discussion space you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  // Get posts for this space
  const posts = await getPosts(spaceData.id);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {spaceData.emoji} {spaceData.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {spaceData.description || "Community discussions"}
            </p>
          </div>
          <NewPostButton spaceId={spaceData.id} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No posts yet. Be the first to start a discussion!
              </p>
              <NewPostButton spaceId={spaceData.id} />
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                communitySlug={community}
                spaceSlug={space}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

