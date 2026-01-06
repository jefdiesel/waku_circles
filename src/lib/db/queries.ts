/**
 * Common database queries and utilities for OpenCircle
 *
 * This file contains reusable query patterns to avoid duplication
 * and ensure consistent data fetching across the application.
 */

import { db } from "./index";
import {
  profiles,
  posts,
  comments,
  spaces,
  communities,
  courses,
  events,
  notifications,
  reactions,
} from "./schema";
import { eq, and, desc, sql, inArray, gte } from "drizzle-orm";
import type {
  Profile,
  Post,
  Space,
  Community,
  Course,
  Event,
  PostWithAuthor,
  PostWithDetails,
} from "./types";

// ============================================================================
// COMMUNITY QUERIES
// ============================================================================

/**
 * Get community by slug
 */
export async function getCommunityBySlug(slug: string): Promise<Community | undefined> {
  return await db.query.communities.findFirst({
    where: eq(communities.slug, slug),
  });
}

/**
 * Get community by ID
 */
export async function getCommunityById(id: string): Promise<Community | undefined> {
  return await db.query.communities.findFirst({
    where: eq(communities.id, id),
  });
}

// ============================================================================
// PROFILE QUERIES
// ============================================================================

/**
 * Get or create profile from Clerk user
 */
export async function getProfileByClerkId(clerkId: string): Promise<Profile | undefined> {
  return await db.query.profiles.findFirst({
    where: eq(profiles.clerkId, clerkId),
    with: {
      membershipTier: true,
    },
  });
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
  return await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });
}

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(userId: string): Promise<void> {
  await db
    .update(profiles)
    .set({ lastSeenAt: new Date() })
    .where(eq(profiles.id, userId));
}

// ============================================================================
// SPACE QUERIES
// ============================================================================

/**
 * Get all spaces for a community, ordered by sort_order
 */
export async function getSpacesByCommunity(communityId: string): Promise<Space[]> {
  return await db.query.spaces.findMany({
    where: and(
      eq(spaces.communityId, communityId),
      eq(spaces.isArchived, false)
    ),
    orderBy: [spaces.sortOrder],
  });
}

/**
 * Get space by slug within a community
 */
export async function getSpaceBySlug(
  communityId: string,
  slug: string
): Promise<Space | undefined> {
  return await db.query.spaces.findFirst({
    where: and(
      eq(spaces.communityId, communityId),
      eq(spaces.slug, slug)
    ),
    with: {
      community: true,
    },
  });
}

/**
 * Check if user has access to a space based on their tier
 */
export async function userCanAccessSpace(
  userId: string,
  spaceId: string
): Promise<boolean> {
  const [space, profile] = await Promise.all([
    db.query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
    }),
    db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    }),
  ]);

  if (!space || !profile) return false;

  // Public spaces are accessible to all
  if (space.visibility === "public") return true;

  // Admins and owners have access to everything
  if (profile.role === "admin" || profile.role === "owner") return true;

  // Paid spaces require specific tier
  if (space.visibility === "paid" && space.requiredTierIds) {
    if (!profile.membershipTierId) return false;
    return space.requiredTierIds.includes(profile.membershipTierId);
  }

  // Private spaces require explicit permission (implement as needed)
  return false;
}

// ============================================================================
// POST QUERIES
// ============================================================================

/**
 * Get posts for a space with pagination
 */
export async function getPostsBySpace(
  spaceId: string,
  options: {
    limit?: number;
    offset?: number;
    includePinned?: boolean;
  } = {}
): Promise<PostWithAuthor[]> {
  const { limit = 20, offset = 0, includePinned = true } = options;

  const conditions = [eq(posts.spaceId, spaceId)];
  if (!includePinned) {
    conditions.push(eq(posts.isPinned, false));
  }

  const result = await db.query.posts.findMany({
    where: and(...conditions),
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
    limit,
    offset,
  });
  return result as unknown as PostWithAuthor[];
}

/**
 * Get single post with full details (author, comments, etc.)
 */
export async function getPostById(postId: string): Promise<PostWithDetails | undefined> {
  const result = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: true,
      space: true,
      comments: {
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
          },
        },
        orderBy: [comments.createdAt],
      },
    },
  });
  return result as PostWithDetails | undefined;
}

/**
 * Increment post likes count (optimistic update)
 */
export async function incrementPostLikes(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ likesCount: sql`${posts.likesCount} + 1` })
    .where(eq(posts.id, postId));
}

/**
 * Decrement post likes count (optimistic update)
 */
export async function decrementPostLikes(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ likesCount: sql`${posts.likesCount} - 1` })
    .where(eq(posts.id, postId));
}

/**
 * Increment post comments count
 */
export async function incrementPostComments(postId: string): Promise<void> {
  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, postId));
}

// ============================================================================
// COMMENT QUERIES
// ============================================================================

/**
 * Get comments for a post (top-level only, with replies nested)
 */
export async function getCommentsByPost(postId: string) {
  return await db.query.comments.findMany({
    where: and(
      eq(comments.postId, postId),
      sql`${comments.parentId} IS NULL` // Only top-level comments
    ),
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
}

// ============================================================================
// REACTION QUERIES
// ============================================================================

/**
 * Toggle reaction (add if doesn't exist, remove if exists)
 */
export async function toggleReaction(
  userId: string,
  targetType: "post" | "comment",
  targetId: string,
  reactionType: string = "like"
): Promise<"added" | "removed"> {
  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.userId, userId),
      eq(reactions.targetType, targetType),
      eq(reactions.targetId, targetId),
      eq(reactions.reactionType, reactionType)
    ),
  });

  if (existing) {
    // Remove reaction
    await db.delete(reactions).where(eq(reactions.id, existing.id));

    // Decrement count
    if (targetType === "post") {
      await decrementPostLikes(targetId);
    } else {
      await db
        .update(comments)
        .set({ likesCount: sql`${comments.likesCount} - 1` })
        .where(eq(comments.id, targetId));
    }

    return "removed";
  } else {
    // Add reaction
    await db.insert(reactions).values({
      userId,
      targetType,
      targetId,
      reactionType,
    });

    // Increment count
    if (targetType === "post") {
      await incrementPostLikes(targetId);
    } else {
      await db
        .update(comments)
        .set({ likesCount: sql`${comments.likesCount} + 1` })
        .where(eq(comments.id, targetId));
    }

    return "added";
  }
}

/**
 * Get user's reactions for multiple targets
 */
export async function getUserReactions(
  userId: string,
  targetType: "post" | "comment",
  targetIds: string[]
): Promise<Record<string, string>> {
  const userReactions = await db.query.reactions.findMany({
    where: and(
      eq(reactions.userId, userId),
      eq(reactions.targetType, targetType),
      inArray(reactions.targetId, targetIds)
    ),
  });

  return Object.fromEntries(
    userReactions.map((r) => [r.targetId, r.reactionType])
  );
}

// ============================================================================
// COURSE QUERIES
// ============================================================================

/**
 * Get course with modules and lessons
 */
export async function getCourseWithContent(courseId: string) {
  return await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        with: {
          lessons: {
            orderBy: (lessons: any, { asc }: any) => [asc(lessons.sortOrder)],
          },
        },
        orderBy: (modules: any, { asc }: any) => [asc(modules.sortOrder)],
      },
    },
  });
}

/**
 * Get user's course progress
 */
export async function getUserCourseProgress(userId: string, courseId: string) {
  return await db.query.courseProgress.findMany({
    where: and(
      eq(profiles.id, userId),
      eq(courses.id, courseId)
    ),
    with: {
      lesson: true,
    },
  });
}

/**
 * Check if user is enrolled in course
 */
export async function isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(
      eq(profiles.id, userId),
      eq(courses.id, courseId)
    ),
  });

  return !!enrollment;
}

// ============================================================================
// EVENT QUERIES
// ============================================================================

/**
 * Get upcoming events for a space
 */
export async function getUpcomingEvents(spaceId: string) {
  return await db.query.events.findMany({
    where: and(
      eq(events.spaceId, spaceId),
      eq(events.isPublished, true),
      gte(events.startsAt, new Date())
    ),
    with: {
      host: {
        columns: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      rsvps: {
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: [events.startsAt],
  });
}

/**
 * Get user's RSVP status for an event
 */
export async function getUserEventRsvp(userId: string, eventId: string) {
  return await db.query.eventRsvps.findFirst({
    where: and(
      eq(profiles.id, userId),
      eq(events.id, eventId)
    ),
  });
}

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(userId: string) {
  return await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ));

  return result[0]?.count ?? 0;
}
