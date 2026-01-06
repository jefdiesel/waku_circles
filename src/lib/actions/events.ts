"use server";

import { db } from "@/lib/db";
import { events, eventRsvps, profiles } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getProfileByClerkId } from "@/lib/db/queries";

export type EventWithHost = {
  id: string;
  spaceId: string;
  hostId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  eventType: "online" | "in_person" | "livestream";
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  capacity: number | null;
  isPublished: boolean;
  recordingUrl: string | null;
  createdAt: Date;
  host: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  };
  rsvpCount?: number;
  userRsvp?: string | null;
};

/**
 * Get events for a space
 */
export async function getEvents(spaceId: string): Promise<EventWithHost[]> {
  const now = new Date();

  const eventsData = await db.query.events.findMany({
    where: and(
      eq(events.spaceId, spaceId),
      eq(events.isPublished, true)
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
      rsvps: true,
    },
    orderBy: [desc(events.startsAt)],
  });

  // Get current user's RSVPs
  const user = await currentUser();
  let userProfile = null;
  if (user) {
    userProfile = await getProfileByClerkId(user.id);
  }

  return eventsData.map((event) => ({
    ...event,
    rsvpCount: event.rsvps.length,
    userRsvp: userProfile
      ? event.rsvps.find((r) => r.userId === userProfile.id)?.status || null
      : null,
  }));
}

/**
 * Get upcoming events for a space
 */
export async function getUpcomingEvents(spaceId: string): Promise<EventWithHost[]> {
  const now = new Date();

  const eventsData = await db.query.events.findMany({
    where: and(
      eq(events.spaceId, spaceId),
      eq(events.isPublished, true),
      gte(events.startsAt, now)
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
      rsvps: true,
    },
    orderBy: [events.startsAt],
  });

  const user = await currentUser();
  let userProfile = null;
  if (user) {
    userProfile = await getProfileByClerkId(user.id);
  }

  return eventsData.map((event) => ({
    ...event,
    rsvpCount: event.rsvps.length,
    userRsvp: userProfile
      ? event.rsvps.find((r) => r.userId === userProfile.id)?.status || null
      : null,
  }));
}

/**
 * RSVP to an event
 */
export async function rsvpToEvent(
  eventId: string,
  status: "going" | "maybe" | "not_going"
) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check if already RSVPed
  const existingRsvp = await db.query.eventRsvps.findFirst({
    where: and(
      eq(eventRsvps.eventId, eventId),
      eq(eventRsvps.userId, profile.id)
    ),
  });

  if (existingRsvp) {
    // Update existing RSVP
    await db
      .update(eventRsvps)
      .set({ status })
      .where(eq(eventRsvps.id, existingRsvp.id));
  } else {
    // Create new RSVP
    await db.insert(eventRsvps).values({
      eventId,
      userId: profile.id,
      status,
    });
  }

  revalidatePath("/[community]/[space]");
  return { success: true };
}

/**
 * Remove RSVP from an event
 */
export async function removeRsvp(eventId: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const profile = await getProfileByClerkId(user.id);
  if (!profile) {
    throw new Error("Profile not found");
  }

  await db
    .delete(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, profile.id))
    );

  revalidatePath("/[community]/[space]");
  return { success: true };
}
