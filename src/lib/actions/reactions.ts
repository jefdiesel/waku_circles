"use server";

import { db, reactions, posts, comments } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import type { Reaction, ReactionTargetType } from "@/lib/db/types";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProfileByClerkId } from "@/lib/db/queries";

/**
 * Toggle a reaction on a post or comment
 * If the reaction exists, remove it. If it doesn't exist, add it.
 * Updates the likesCount on the target post/comment.
 */
export async function toggleReaction(
  targetType: ReactionTargetType,
  targetId: string,
  reactionType: string = "like"
): Promise<
  | { success: true; action: "added" | "removed"; reaction?: Reaction }
  | { success: false; error: string }
> {
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Find the user's profile
    const profile = await getProfileByClerkId(user.id);

    if (!profile) {
      return { success: false, error: "User profile not found" };
    }

    // Check if reaction already exists
    const existingReaction = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.userId, profile.id),
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.reactionType, reactionType)
      ),
    });

    if (existingReaction) {
      // Remove the reaction
      await db
        .delete(reactions)
        .where(eq(reactions.id, existingReaction.id));

      // Decrement likesCount on the target
      if (targetType === "post") {
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} - 1` })
          .where(eq(posts.id, targetId));
      } else if (targetType === "comment") {
        await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} - 1` })
          .where(eq(comments.id, targetId));
      }

      // Revalidate paths
      revalidatePath(`/[community]/[space]`);

      return { success: true, action: "removed" };
    } else {
      // Add the reaction
      const [newReaction] = await db
        .insert(reactions)
        .values({
          userId: profile.id,
          targetType,
          targetId,
          reactionType,
        })
        .returning();

      // Increment likesCount on the target
      if (targetType === "post") {
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, targetId));
      } else if (targetType === "comment") {
        await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, targetId));
      }

      // Revalidate paths
      revalidatePath(`/[community]/[space]`);

      return { success: true, action: "added", reaction: newReaction };
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return { success: false, error: "Failed to toggle reaction" };
  }
}

/**
 * Get all reactions for a specific post or comment
 */
export async function getReactions(
  targetType: ReactionTargetType,
  targetId: string
): Promise<
  | { success: true; reactions: (Reaction & { user: { id: string; username: string | null; fullName: string | null; avatarUrl: string | null } })[] }
  | { success: false; error: string }
> {
  try {
    const targetReactions = await db.query.reactions.findMany({
      where: and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId)
      ),
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
      orderBy: (reactions, { desc }) => [desc(reactions.createdAt)],
    });

    return { success: true, reactions: targetReactions as any };
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return { success: false, error: "Failed to fetch reactions" };
  }
}

/**
 * Check if the current user has reacted to a post or comment
 */
export async function getUserReaction(
  userId: string,
  targetType: ReactionTargetType,
  targetId: string
): Promise<
  | { success: true; reaction: Reaction | null }
  | { success: false; error: string }
> {
  try {
    const reaction = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.userId, userId),
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId)
      ),
    });

    return { success: true, reaction: reaction || null };
  } catch (error) {
    console.error("Error fetching user reaction:", error);
    return { success: false, error: "Failed to fetch user reaction" };
  }
}

/**
 * Get reaction counts grouped by reaction type for a post or comment
 */
export async function getReactionCounts(
  targetType: ReactionTargetType,
  targetId: string
): Promise<
  | { success: true; counts: Record<string, number> }
  | { success: false; error: string }
> {
  try {
    const targetReactions = await db.query.reactions.findMany({
      where: and(
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId)
      ),
    });

    // Group by reaction type and count
    const counts: Record<string, number> = {};
    for (const reaction of targetReactions) {
      const type = reaction.reactionType;
      counts[type] = (counts[type] || 0) + 1;
    }

    return { success: true, counts };
  } catch (error) {
    console.error("Error fetching reaction counts:", error);
    return { success: false, error: "Failed to fetch reaction counts" };
  }
}
