import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

// ============================================================================
// SELECT TYPES (for reading from database)
// ============================================================================

export type Community = InferSelectModel<typeof schema.communities>;
export type Profile = InferSelectModel<typeof schema.profiles>;
export type MembershipTier = InferSelectModel<typeof schema.membershipTiers>;
export type Space = InferSelectModel<typeof schema.spaces>;
export type Post = InferSelectModel<typeof schema.posts>;
export type Comment = InferSelectModel<typeof schema.comments>;
export type Reaction = InferSelectModel<typeof schema.reactions>;
export type Course = InferSelectModel<typeof schema.courses>;
export type CourseModule = InferSelectModel<typeof schema.courseModules>;
export type CourseLesson = InferSelectModel<typeof schema.courseLessons>;
export type CourseProgress = InferSelectModel<typeof schema.courseProgress>;
export type CourseEnrollment = InferSelectModel<typeof schema.courseEnrollments>;
export type Event = InferSelectModel<typeof schema.events>;
export type EventRsvp = InferSelectModel<typeof schema.eventRsvps>;
export type Notification = InferSelectModel<typeof schema.notifications>;
export type Subscription = InferSelectModel<typeof schema.subscriptions>;
export type File = InferSelectModel<typeof schema.files>;

// ============================================================================
// INSERT TYPES (for writing to database)
// ============================================================================

export type NewCommunity = InferInsertModel<typeof schema.communities>;
export type NewProfile = InferInsertModel<typeof schema.profiles>;
export type NewMembershipTier = InferInsertModel<typeof schema.membershipTiers>;
export type NewSpace = InferInsertModel<typeof schema.spaces>;
export type NewPost = InferInsertModel<typeof schema.posts>;
export type NewComment = InferInsertModel<typeof schema.comments>;
export type NewReaction = InferInsertModel<typeof schema.reactions>;
export type NewCourse = InferInsertModel<typeof schema.courses>;
export type NewCourseModule = InferInsertModel<typeof schema.courseModules>;
export type NewCourseLesson = InferInsertModel<typeof schema.courseLessons>;
export type NewCourseProgress = InferInsertModel<typeof schema.courseProgress>;
export type NewCourseEnrollment = InferInsertModel<typeof schema.courseEnrollments>;
export type NewEvent = InferInsertModel<typeof schema.events>;
export type NewEventRsvp = InferInsertModel<typeof schema.eventRsvps>;
export type NewNotification = InferInsertModel<typeof schema.notifications>;
export type NewSubscription = InferInsertModel<typeof schema.subscriptions>;
export type NewFile = InferInsertModel<typeof schema.files>;

// ============================================================================
// ENUM TYPES
// ============================================================================

export type Role = "member" | "moderator" | "admin" | "owner";
export type SpaceType = "discussion" | "chat" | "course" | "events" | "resources";
export type Visibility = "public" | "private" | "paid";
export type BillingPeriod = "monthly" | "yearly" | "lifetime";
export type ContentFormat = "markdown" | "json";
export type ReactionTargetType = "post" | "comment";
export type LessonType = "video" | "text" | "audio" | "download" | "quiz" | "assignment";
export type AccessType = "free" | "membership" | "purchase";
export type EventType = "online" | "in_person" | "livestream";
export type RsvpStatus = "going" | "maybe" | "not_going" | "waitlist";
export type NotificationType =
  | "mention"
  | "reply"
  | "event_reminder"
  | "course_unlocked"
  | "membership_renewal"
  | "new_post"
  | "new_follower";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "trialing";

// ============================================================================
// EXTENDED TYPES (with relations)
// ============================================================================

export type PostWithAuthor = Post & {
  author: Profile;
};

export type PostWithDetails = Post & {
  author: Profile;
  space: Space;
  comments: CommentWithAuthor[];
};

export type CommentWithAuthor = Comment & {
  author: Profile;
};

export type CommentWithReplies = Comment & {
  author: Profile;
  replies: CommentWithAuthor[];
};

export type CourseWithModules = Course & {
  modules: CourseModuleWithLessons[];
};

export type CourseModuleWithLessons = CourseModule & {
  lessons: CourseLesson[];
};

export type EventWithRsvps = Event & {
  host: Profile;
  rsvps: (EventRsvp & { user: Profile })[];
};

export type SpaceWithCommunity = Space & {
  community: Community;
};

export type ProfileWithMembership = Profile & {
  membershipTier: MembershipTier | null;
};

// ============================================================================
// JSONB FIELD TYPES
// ============================================================================

export type SocialLinks = {
  twitter?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  instagram?: string;
  youtube?: string;
};

export type FileAttachment = {
  id: string;
  type: string; // 'image' | 'video' | 'document' | 'audio'
  url: string;
  name: string;
  size?: number;
  width?: number; // for images
  height?: number; // for images
  duration?: number; // for videos/audio
};

export type Poll = {
  question: string;
  options: string[];
  votes: Record<string, string[]>; // option index -> user IDs
  allowMultiple?: boolean;
  endsAt?: string; // ISO timestamp
};

export type FileMetadata = {
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  originalName?: string;
};

export type SpaceSettings = {
  postPermissions?: "anyone" | "admins" | "moderators";
  allowComments?: boolean;
  allowReactions?: boolean;
  notificationDefaults?: {
    newPosts?: boolean;
    newComments?: boolean;
  };
  customFields?: Array<{
    name: string;
    type: "text" | "number" | "date" | "select";
    required?: boolean;
    options?: string[]; // for select type
  }>;
};

export type CommunitySettings = {
  allowMemberInvites?: boolean;
  requireApproval?: boolean;
  allowPublicView?: boolean;
  customDomain?: string;
  emailNotifications?: boolean;
  allowGuestAccess?: boolean;
};

export type CourseSettings = {
  sequentialUnlock?: boolean; // Must complete lesson to unlock next
  dripEnabled?: boolean; // Release lessons over time
  certificateEnabled?: boolean;
  allowDownloads?: boolean;
  discussionEnabled?: boolean; // Per-lesson discussions
};

export type LessonContent =
  | {
      type: "video";
      url: string;
      duration?: number;
      thumbnail?: string;
      provider?: "youtube" | "vimeo" | "upload";
    }
  | {
      type: "text";
      body: string;
      format: "markdown" | "html";
    }
  | {
      type: "audio";
      url: string;
      duration?: number;
    }
  | {
      type: "download";
      files: FileAttachment[];
      instructions?: string;
    }
  | {
      type: "quiz";
      questions: Array<{
        question: string;
        options: string[];
        correctAnswer: number; // index
        explanation?: string;
      }>;
      passingScore?: number; // percentage
    }
  | {
      type: "assignment";
      instructions: string;
      allowedFileTypes?: string[];
      maxFileSize?: number;
    };
