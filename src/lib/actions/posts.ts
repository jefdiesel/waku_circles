"use server";

import { db } from "@/lib/db";
import { posts, profiles } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { NewPost, PostWithAuthor } from "@/lib/db/types";
import { getProfileByClerkId } from "@/lib/db/queries";

/**
 * Create a new discussion post
 */
export async function createPost(
  spaceId: string,
  data: {
    title?: string;
    content: string;
    contentFormat?: "markdown" | "json";
    attachments?: any;
    poll?: any;
  }
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

  // Create post
  const [post] = await db
    .insert(posts)
    .values({
      spaceId,
      authorId: profile.id,
      title: data.title,
      content: data.content,
      contentFormat: data.contentFormat || "markdown",
      attachments: data.attachments,
      poll: data.poll,
    })
    .returning();

  // Revalidate the discussion page
  revalidatePath(`/[community]/[space]/discussion`);

  return post;
}

/**
 * Update an existing post
 */
export async function updatePost(
  postId: string,
  data: {
    title?: string;
    content?: string;
    attachments?: any;
    poll?: any;
  }
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

  // Check if user is the author or has admin/moderator role
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const isAuthor = post.authorId === profile.id;
  const isModerator = ["moderator", "admin", "owner"].includes(profile.role);

  if (!isAuthor && !isModerator) {
    throw new Error("Unauthorized");
  }

  // Update post
  const [updatedPost] = await db
    .update(posts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning();

  // Revalidate pages
  revalidatePath(`/[community]/[space]/discussion`);
  revalidatePath(`/[community]/[space]/discussion/${postId}`);

  return updatedPost;
}

/**
 * Delete a post
 */
export async function deletePost(postId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's profile
  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if user is the author or has admin/moderator role
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const isAuthor = post.authorId === profile.id;
  const isModerator = ["moderator", "admin", "owner"].includes(profile.role);

  if (!isAuthor && !isModerator) {
    throw new Error("Unauthorized");
  }

  // Delete post (cascade will handle comments)
  await db.delete(posts).where(eq(posts.id, postId));

  // Revalidate the discussion page
  revalidatePath(`/[community]/[space]/discussion`);

  return { success: true };
}

/**
 * Get posts for a space
 */
export async function getPosts(spaceId: string): Promise<PostWithAuthor[]> {
  const postsData = await db.query.posts.findMany({
    where: eq(posts.spaceId, spaceId),
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
    orderBy: [desc(posts.isPinned), desc(posts.createdAt)],
  });

  return postsData as PostWithAuthor[];
}

/**
 * Get a single post with all details
 */
export async function getPost(postId: string): Promise<PostWithAuthor | null> {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
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
      space: true,
    },
  });

  return post as PostWithAuthor | null;
}

/**
 * Toggle pin status of a post (moderator only)
 */
export async function togglePinPost(postId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Get user's profile
  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if user has moderator role
  const isModerator = ["moderator", "admin", "owner"].includes(profile.role);
  if (!isModerator) {
    throw new Error("Unauthorized");
  }

  // Get current post
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  // Toggle pin status
  const [updatedPost] = await db
    .update(posts)
    .set({ isPinned: !post.isPinned })
    .where(eq(posts.id, postId))
    .returning();

  // Revalidate pages
  revalidatePath(`/[community]/[space]/discussion`);

  return updatedPost;
}
