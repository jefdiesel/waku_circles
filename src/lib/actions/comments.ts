"use server";

import { db } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProfileByClerkId, incrementPostComments } from "@/lib/db/queries";

/**
 * Create a new comment on a post
 */
export async function createComment(
  postId: string,
  content: string,
  parentId?: string
) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's profile
  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Verify post exists
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // If parentId is provided, verify it exists
  if (parentId) {
    const parentComment = await db.query.comments.findFirst({
      where: eq(comments.id, parentId),
    });

    if (!parentComment) {
      throw new Error("Parent comment not found");
    }
  }

  // Create comment
  const result = await db
    .insert(comments)
    .values({
      postId,
      parentId: parentId || null,
      authorId: profile.id,
      content,
    })
    .returning() as { id: string; postId: string }[];
  const comment = result[0];

  // Increment post comment count
  await incrementPostComments(postId);

  // Revalidate the post page
  revalidatePath(`/[community]/[space]/discussion/${postId}`);

  return comment;
}

/**
 * Update a comment
 */
export async function updateComment(commentId: string, content: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's profile
  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if user is the author or has moderator role
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  const isAuthor = comment.authorId === profile.id;
  const isModerator = ["moderator", "admin", "owner"].includes(profile.role);

  if (!isAuthor && !isModerator) {
    throw new Error("Unauthorized");
  }

  // Update comment
  const [updatedComment] = await db
    .update(comments)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId))
    .returning();

  // Revalidate the post page
  revalidatePath(`/[community]/[space]/discussion/${comment.postId}`);

  return updatedComment;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's profile
  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if user is the author or has moderator role
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  const isAuthor = comment.authorId === profile.id;
  const isModerator = ["moderator", "admin", "owner"].includes(profile.role);

  if (!isAuthor && !isModerator) {
    throw new Error("Unauthorized");
  }

  // Delete comment (cascade will handle replies)
  await db.delete(comments).where(eq(comments.id, commentId));

  // Decrement post comment count
  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} - 1` })
    .where(eq(posts.id, comment.postId));

  // Revalidate the post page
  revalidatePath(`/[community]/[space]/discussion/${comment.postId}`);

  return { success: true };
}

/**
 * Get all comments for a post (threaded structure)
 */
export async function getComments(postId: string) {
  const commentsData = await db.query.comments.findMany({
    where: and(eq(comments.postId, postId), isNull(comments.parentId)),
    with: {
      author: {
        columns: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          role: true,
        },
      },
      replies: {
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: [comments.createdAt],
      },
    },
    orderBy: [comments.createdAt],
  });

  return commentsData;
}
