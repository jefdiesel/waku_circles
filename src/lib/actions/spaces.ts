"use server";

import { db, spaces, communities } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import type { Space, NewSpace } from "@/lib/db/types";
import { revalidatePath } from "next/cache";

/**
 * Create a new space in a community
 */
export async function createSpace(
  communityId: string,
  data: Omit<NewSpace, "id" | "communityId" | "createdAt">
): Promise<{ success: true; space: Space } | { success: false; error: string }> {
  try {
    // Verify community exists
    const community = await db.query.communities.findFirst({
      where: eq(communities.id, communityId),
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check for slug uniqueness within the community
    const existingSpace = await db.query.spaces.findFirst({
      where: and(
        eq(spaces.communityId, communityId),
        eq(spaces.slug, data.slug)
      ),
    });

    if (existingSpace) {
      return { success: false, error: "A space with this slug already exists" };
    }

    // Create the space
    const [newSpace] = await db
      .insert(spaces)
      .values({
        communityId,
        ...data,
      })
      .returning();

    // Revalidate the community page
    revalidatePath(`/[community]`);
    revalidatePath(`/[community]/spaces`);

    return { success: true, space: newSpace };
  } catch (error) {
    console.error("Error creating space:", error);
    return { success: false, error: "Failed to create space" };
  }
}

/**
 * Update an existing space
 */
export async function updateSpace(
  spaceId: string,
  data: Partial<Omit<NewSpace, "id" | "communityId" | "createdAt">>
): Promise<{ success: true; space: Space } | { success: false; error: string }> {
  try {
    // Verify space exists
    const existingSpace = await db.query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
    });

    if (!existingSpace) {
      return { success: false, error: "Space not found" };
    }

    // If updating slug, check uniqueness within the community
    if (data.slug && data.slug !== existingSpace.slug) {
      const slugExists = await db.query.spaces.findFirst({
        where: and(
          eq(spaces.communityId, existingSpace.communityId),
          eq(spaces.slug, data.slug)
        ),
      });

      if (slugExists) {
        return { success: false, error: "A space with this slug already exists" };
      }
    }

    // Update the space
    const [updatedSpace] = await db
      .update(spaces)
      .set(data)
      .where(eq(spaces.id, spaceId))
      .returning();

    // Revalidate relevant paths
    revalidatePath(`/[community]`);
    revalidatePath(`/[community]/[space]`);
    revalidatePath(`/[community]/spaces`);

    return { success: true, space: updatedSpace };
  } catch (error) {
    console.error("Error updating space:", error);
    return { success: false, error: "Failed to update space" };
  }
}

/**
 * Soft delete a space (set isArchived to true)
 */
export async function deleteSpace(
  spaceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Verify space exists
    const existingSpace = await db.query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
    });

    if (!existingSpace) {
      return { success: false, error: "Space not found" };
    }

    // Soft delete by setting isArchived to true
    await db
      .update(spaces)
      .set({ isArchived: true })
      .where(eq(spaces.id, spaceId));

    // Revalidate relevant paths
    revalidatePath(`/[community]`);
    revalidatePath(`/[community]/spaces`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting space:", error);
    return { success: false, error: "Failed to delete space" };
  }
}

/**
 * Get all non-archived spaces for a community
 */
export async function getSpaces(
  communityId: string
): Promise<{ success: true; spaces: Space[] } | { success: false; error: string }> {
  try {
    const communitySpaces = await db.query.spaces.findMany({
      where: and(
        eq(spaces.communityId, communityId),
        eq(spaces.isArchived, false)
      ),
      orderBy: (spaces, { asc }) => [asc(spaces.sortOrder), asc(spaces.name)],
    });

    return { success: true, spaces: communitySpaces };
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return { success: false, error: "Failed to fetch spaces" };
  }
}

/**
 * Get a single space by community slug and space slug
 */
export async function getSpace(
  communitySlug: string,
  spaceSlug: string
): Promise<{ success: true; space: Space } | { success: false; error: string }> {
  try {
    // First find the community
    const community = await db.query.communities.findFirst({
      where: eq(communities.slug, communitySlug),
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Then find the space within that community
    const space = await db.query.spaces.findFirst({
      where: and(
        eq(spaces.communityId, community.id),
        eq(spaces.slug, spaceSlug),
        eq(spaces.isArchived, false)
      ),
      with: {
        community: true,
      },
    });

    if (!space) {
      return { success: false, error: "Space not found" };
    }

    return { success: true, space };
  } catch (error) {
    console.error("Error fetching space:", error);
    return { success: false, error: "Failed to fetch space" };
  }
}

/**
 * Get a community by slug
 */
export async function getCommunityBySlug(
  slug: string
): Promise<{ success: true; community: any } | { success: false; error: string }> {
  try {
    const community = await db.query.communities.findFirst({
      where: eq(communities.slug, slug),
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    return { success: true, community };
  } catch (error) {
    console.error("Error fetching community:", error);
    return { success: false, error: "Failed to fetch community" };
  }
}
