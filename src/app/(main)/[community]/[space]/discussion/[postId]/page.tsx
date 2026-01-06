import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentThread } from "@/components/posts/CommentThread";
import { CommentForm } from "@/components/posts/CommentForm";
import { getPost } from "@/lib/actions/posts";
import { getComments } from "@/lib/actions/comments";
import { getProfileByClerkId } from "@/lib/db/queries";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PostPageProps {
  params: Promise<{
    community: string;
    space: string;
    postId: string;
  }>;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}

export default async function PostPage({ params }: PostPageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { community, space, postId } = await params;

  // Get post data
  const post = await getPost(postId);

  if (!post) {
    notFound();
  }

  // Get comments
  const comments = await getComments(postId);

  // Get current user's profile
  const profile = await getProfileByClerkId(user.id);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = post.author.fullName || post.author.username || "Anonymous";

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <Link
          href={`/${community}/${space}/discussion`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to discussions
        </Link>
        <h1 className="text-2xl font-bold">Discussion</h1>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Post */}
          <Card>
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.author.avatarUrl || undefined} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{displayName}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(new Date(post.createdAt))}
                  </span>
                  {post.updatedAt !== post.createdAt && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>
                {post.title && (
                  <h2 className="text-xl font-semibold">{post.title}</h2>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>
            </CardContent>
          </Card>

          {/* Comment form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Comments ({comments.length})
            </h3>
            <CommentForm postId={postId} />
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <CommentThread
              comments={comments as any}
              postId={postId}
              currentUserId={profile?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
