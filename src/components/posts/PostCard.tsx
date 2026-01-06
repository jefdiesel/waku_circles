"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Pin } from "lucide-react";
import Link from "next/link";
import type { PostWithAuthor } from "@/lib/db/types";

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

interface PostCardProps {
  post: PostWithAuthor;
  communitySlug: string;
  spaceSlug: string;
}

export function PostCard({ post, communitySlug, spaceSlug }: PostCardProps) {
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
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(new Date(post.createdAt))}
            </span>
            {post.isPinned && (
              <Pin className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>
      </CardHeader>
      <Link href={`/${communitySlug}/${spaceSlug}/discussion/${post.id}`}>
        <CardContent className="pb-3 cursor-pointer">
          {post.title && (
            <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.content}
          </p>
        </CardContent>
      </Link>
      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{post.commentsCount}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
