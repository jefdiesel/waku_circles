import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const roleEnum = pgEnum("role", ["member", "moderator", "admin", "owner"]);

export const spaceTypeEnum = pgEnum("space_type", [
  "discussion",
  "chat",
  "course",
  "events",
  "resources",
]);

export const visibilityEnum = pgEnum("visibility", ["public", "private", "paid"]);

export const billingPeriodEnum = pgEnum("billing_period", [
  "monthly",
  "yearly",
  "lifetime",
]);

export const contentFormatEnum = pgEnum("content_format", ["markdown", "json"]);

export const reactionTargetTypeEnum = pgEnum("reaction_target_type", [
  "post",
  "comment",
]);

export const lessonTypeEnum = pgEnum("lesson_type", [
  "video",
  "text",
  "audio",
  "download",
  "quiz",
  "assignment",
]);

export const accessTypeEnum = pgEnum("access_type", [
  "free",
  "membership",
  "purchase",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "online",
  "in_person",
  "livestream",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "going",
  "maybe",
  "not_going",
  "waitlist",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "mention",
  "reply",
  "event_reminder",
  "course_unlocked",
  "membership_renewal",
  "new_post",
  "new_follower",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "unpaid",
  "incomplete",
  "trialing",
]);

// ============================================================================
// TABLES
// ============================================================================

// Communities - ownerId FK is defined in relations to avoid circular reference
export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  brandColor: text("brand_color").default("#6366f1"),
  ownerId: uuid("owner_id"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Profiles - synced from Clerk via webhook
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(), // Clerk user ID
  username: text("username").unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: text("location"),
  socialLinks: jsonb("social_links"), // {twitter, linkedin, etc.}
  role: roleEnum("role").default("member").notNull(),
  membershipTierId: uuid("membership_tier_id").references(() => membershipTiers.id),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

// Membership Tiers
export const membershipTiers = pgTable("membership_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id")
    .references(() => communities.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0), // 0 for free tier
  billingPeriod: billingPeriodEnum("billing_period").default("monthly").notNull(),
  stripePriceId: text("stripe_price_id"),
  features: jsonb("features"), // Array of feature strings for display
  spaceAccess: uuid("space_access").array(), // Array of space IDs this tier can access
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Spaces
export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  communityId: uuid("community_id")
    .references(() => communities.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  coverUrl: text("cover_url"),
  spaceType: spaceTypeEnum("space_type").notNull(),
  visibility: visibilityEnum("visibility").default("public").notNull(),
  requiredTierIds: uuid("required_tier_ids").array(), // Tiers that can access if paid
  settings: jsonb("settings"), // Post permissions, notification defaults, etc.
  sortOrder: integer("sort_order").default(0).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Posts - for discussion spaces only
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  authorId: uuid("author_id")
    .references(() => profiles.id)
    .notNull(),
  title: text("title"),
  content: text("content").notNull(),
  contentFormat: contentFormatEnum("content_format").default("markdown").notNull(),
  attachments: jsonb("attachments"), // Array of {type, url, name, size}
  poll: jsonb("poll"), // {question, options[], votes{}}
  isPinned: boolean("is_pinned").default(false).notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  commentsCount: integer("comments_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Comments - threaded replies on posts
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id"), // Self-reference for nested replies (FK in relations)
  authorId: uuid("author_id")
    .references(() => profiles.id)
    .notNull(),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Reactions - likes/emoji on posts and comments
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    targetType: reactionTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reactionType: text("reaction_type").default("like").notNull(), // like, ❤️, 🎉, etc.
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueReaction: unique().on(
      table.userId,
      table.targetType,
      table.targetId,
      table.reactionType
    ),
  })
);

// Courses
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  isPublished: boolean("is_published").default(false).notNull(),
  accessType: accessTypeEnum("access_type").default("free").notNull(),
  priceCents: integer("price_cents"), // For standalone purchase
  settings: jsonb("settings"), // Drip settings, sequential unlock, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Course Modules
export const courseModules = pgTable("course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

// Course Lessons
export const courseLessons = pgTable("course_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .references(() => courseModules.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  lessonType: lessonTypeEnum("lesson_type").notNull(),
  content: jsonb("content").notNull(), // Varies by type
  durationMinutes: integer("duration_minutes"),
  isPreview: boolean("is_preview").default(false).notNull(), // Free preview
  sortOrder: integer("sort_order").default(0).notNull(),
  dripDelayDays: integer("drip_delay_days"), // Days after enrollment to unlock
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Course Progress
export const courseProgress = pgTable(
  "course_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id)
      .notNull(),
    lessonId: uuid("lesson_id")
      .references(() => courseLessons.id)
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    progressSeconds: integer("progress_seconds"), // For video playback position
  },
  (table) => ({
    uniqueProgress: unique().on(table.userId, table.lessonId),
  })
);

// Course Enrollments
export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    courseId: uuid("course_id")
      .references(() => courses.id)
      .notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueEnrollment: unique().on(table.userId, table.courseId),
  })
);

// Events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .references(() => spaces.id, { onDelete: "cascade" })
    .notNull(),
  hostId: uuid("host_id")
    .references(() => profiles.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  eventType: eventTypeEnum("event_type").default("online").notNull(),
  location: text("location"), // URL for online, address for in-person
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  timezone: text("timezone").default("UTC").notNull(),
  capacity: integer("capacity"), // null for unlimited
  isPublished: boolean("is_published").default(true).notNull(),
  recordingUrl: text("recording_url"), // Added post-event
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Event RSVPs
export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    status: rsvpStatusEnum("status").default("going").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueRsvp: unique().on(table.eventId, table.userId),
  })
);

// Notifications - persistent notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => profiles.id)
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"), // URL to navigate to when clicked
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Subscriptions - Stripe sync
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => profiles.id)
    .notNull(),
  tierId: uuid("tier_id")
    .references(() => membershipTiers.id)
    .notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Files - metadata for R2 uploads
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id")
    .references(() => profiles.id)
    .notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // MIME type
  fileSize: integer("file_size").notNull(), // bytes
  r2Key: text("r2_key").notNull(), // R2 object key
  r2Url: text("r2_url").notNull(), // Public URL
  metadata: jsonb("metadata"), // Width, height for images, duration for videos, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [communities.ownerId],
    references: [profiles.id],
  }),
  membershipTiers: many(membershipTiers),
  spaces: many(spaces),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  membershipTier: one(membershipTiers, {
    fields: [profiles.membershipTierId],
    references: [membershipTiers.id],
  }),
  ownedCommunities: many(communities),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
  courseProgress: many(courseProgress),
  courseEnrollments: many(courseEnrollments),
  hostedEvents: many(events),
  eventRsvps: many(eventRsvps),
  notifications: many(notifications),
  subscriptions: many(subscriptions),
  uploadedFiles: many(files),
}));

export const membershipTiersRelations = relations(membershipTiers, ({ one, many }) => ({
  community: one(communities, {
    fields: [membershipTiers.communityId],
    references: [communities.id],
  }),
  members: many(profiles),
  subscriptions: many(subscriptions),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  community: one(communities, {
    fields: [spaces.communityId],
    references: [communities.id],
  }),
  posts: many(posts),
  courses: many(courses),
  events: many(events),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  space: one(spaces, {
    fields: [posts.spaceId],
    references: [spaces.id],
  }),
  author: one(profiles, {
    fields: [posts.authorId],
    references: [profiles.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_replies",
  }),
  replies: many(comments, {
    relationName: "comment_replies",
  }),
  author: one(profiles, {
    fields: [comments.authorId],
    references: [profiles.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  user: one(profiles, {
    fields: [reactions.userId],
    references: [profiles.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  space: one(spaces, {
    fields: [courses.spaceId],
    references: [spaces.id],
  }),
  modules: many(courseModules),
  progress: many(courseProgress),
  enrollments: many(courseEnrollments),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ one, many }) => ({
  module: one(courseModules, {
    fields: [courseLessons.moduleId],
    references: [courseModules.id],
  }),
  progress: many(courseProgress),
}));

export const courseProgressRelations = relations(courseProgress, ({ one }) => ({
  user: one(profiles, {
    fields: [courseProgress.userId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [courseProgress.courseId],
    references: [courses.id],
  }),
  lesson: one(courseLessons, {
    fields: [courseProgress.lessonId],
    references: [courseLessons.id],
  }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  user: one(profiles, {
    fields: [courseEnrollments.userId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  space: one(spaces, {
    fields: [events.spaceId],
    references: [spaces.id],
  }),
  host: one(profiles, {
    fields: [events.hostId],
    references: [profiles.id],
  }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(profiles, {
    fields: [eventRsvps.userId],
    references: [profiles.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(profiles, {
    fields: [subscriptions.userId],
    references: [profiles.id],
  }),
  tier: one(membershipTiers, {
    fields: [subscriptions.tierId],
    references: [membershipTiers.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  uploader: one(profiles, {
    fields: [files.uploaderId],
    references: [profiles.id],
  }),
}));
