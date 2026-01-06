# Drizzle ORM Usage Examples for OpenCircle

Complete examples showing how to use the schema in real application code.

## Table of Contents
1. [Setup and Imports](#setup-and-imports)
2. [Profile Operations](#profile-operations)
3. [Space Operations](#space-operations)
4. [Post Operations](#post-operations)
5. [Comment Operations](#comment-operations)
6. [Reaction Operations](#reaction-operations)
7. [Course Operations](#course-operations)
8. [Event Operations](#event-operations)
9. [Notification Operations](#notification-operations)
10. [Complex Queries](#complex-queries)
11. [Next.js API Routes](#nextjs-api-routes)

---

## Setup and Imports

```typescript
import { db } from "@/lib/db";
import {
  profiles,
  spaces,
  posts,
  comments,
  reactions,
  courses,
  courseModules,
  courseLessons,
  courseProgress,
  events,
  eventRsvps,
  notifications,
} from "@/lib/db/schema";
import { eq, and, or, desc, asc, sql, inArray, gte, lte, like } from "drizzle-orm";
```

---

## Profile Operations

### Create Profile (from Clerk webhook)

```typescript
async function createProfileFromClerk(clerkUser: any) {
  const [profile] = await db
    .insert(profiles)
    .values({
      clerkId: clerkUser.id,
      username: clerkUser.username,
      fullName: `${clerkUser.firstName} ${clerkUser.lastName}`,
      avatarUrl: clerkUser.imageUrl,
      role: "member",
    })
    .returning();

  return profile;
}
```

### Get Profile by Clerk ID

```typescript
async function getProfile(clerkId: string) {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkId, clerkId),
    with: {
      membershipTier: true,
    },
  });

  return profile;
}
```

### Update Profile

```typescript
async function updateProfile(profileId: string, data: Partial<Profile>) {
  const [updated] = await db
    .update(profiles)
    .set({
      bio: data.bio,
      location: data.location,
      socialLinks: data.socialLinks,
    })
    .where(eq(profiles.id, profileId))
    .returning();

  return updated;
}
```

### Update Last Seen

```typescript
async function trackUserActivity(userId: string) {
  await db
    .update(profiles)
    .set({ lastSeenAt: new Date() })
    .where(eq(profiles.id, userId));
}
```

---

## Space Operations

### List All Spaces in Community

```typescript
async function getSpaces(communityId: string) {
  const allSpaces = await db.query.spaces.findMany({
    where: and(
      eq(spaces.communityId, communityId),
      eq(spaces.isArchived, false)
    ),
    orderBy: [asc(spaces.sortOrder)],
  });

  return allSpaces;
}
```

### Get Space with Access Check

```typescript
async function getAccessibleSpace(spaceId: string, userId: string) {
  // Get space
  const space = await db.query.spaces.findFirst({
    where: eq(spaces.id, spaceId),
  });

  if (!space) return null;

  // Get user profile with tier
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!profile) return null;

  // Check access
  if (space.visibility === "public") {
    return space;
  }

  if (space.visibility === "paid" && space.requiredTierIds) {
    if (!profile.membershipTierId) return null;
    if (!space.requiredTierIds.includes(profile.membershipTierId)) {
      return null;
    }
  }

  // Admin/owner always have access
  if (profile.role === "admin" || profile.role === "owner") {
    return space;
  }

  return space;
}
```

### Create Space

```typescript
async function createSpace(data: {
  communityId: string;
  name: string;
  slug: string;
  description?: string;
  emoji?: string;
  spaceType: SpaceType;
  visibility?: Visibility;
}) {
  const [space] = await db
    .insert(spaces)
    .values({
      communityId: data.communityId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      emoji: data.emoji,
      spaceType: data.spaceType,
      visibility: data.visibility || "public",
    })
    .returning();

  return space;
}
```

---

## Post Operations

### Create Post

```typescript
async function createPost(data: {
  spaceId: string;
  authorId: string;
  title?: string;
  content: string;
  attachments?: FileAttachment[];
}) {
  const [post] = await db
    .insert(posts)
    .values({
      spaceId: data.spaceId,
      authorId: data.authorId,
      title: data.title,
      content: data.content,
      contentFormat: "markdown",
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    })
    .returning();

  return post;
}
```

### Get Posts with Pagination

```typescript
async function getPosts(
  spaceId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const offset = (page - 1) * pageSize;

  const postList = await db.query.posts.findMany({
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
    limit: pageSize,
    offset: offset,
  });

  return postList;
}
```

### Get Post with Full Details

```typescript
async function getPostDetail(postId: string) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: true,
      space: {
        with: {
          community: true,
        },
      },
      comments: {
        where: sql`${comments.parentId} IS NULL`, // Top-level only
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
            orderBy: [asc(comments.createdAt)],
          },
        },
        orderBy: [desc(comments.createdAt)],
      },
    },
  });

  return post;
}
```

### Update Post

```typescript
async function updatePost(
  postId: string,
  authorId: string,
  data: { title?: string; content?: string }
) {
  const [updated] = await db
    .update(posts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
    .returning();

  return updated;
}
```

### Delete Post

```typescript
async function deletePost(postId: string, userId: string) {
  // Check ownership or admin
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  if (!post || !user) return false;

  const canDelete =
    post.authorId === userId ||
    user.role === "admin" ||
    user.role === "owner" ||
    user.role === "moderator";

  if (!canDelete) return false;

  await db.delete(posts).where(eq(posts.id, postId));
  return true;
}
```

### Pin/Unpin Post

```typescript
async function togglePinPost(postId: string) {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) return null;

  const [updated] = await db
    .update(posts)
    .set({ isPinned: !post.isPinned })
    .where(eq(posts.id, postId))
    .returning();

  return updated;
}
```

---

## Comment Operations

### Create Comment

```typescript
async function createComment(data: {
  postId: string;
  authorId: string;
  content: string;
  parentId?: string; // For nested replies
}) {
  const [comment] = await db
    .insert(comments)
    .values(data)
    .returning();

  // Increment post comment count
  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, data.postId));

  return comment;
}
```

### Get Comments for Post

```typescript
async function getComments(postId: string) {
  const commentList = await db.query.comments.findMany({
    where: and(
      eq(comments.postId, postId),
      sql`${comments.parentId} IS NULL` // Top-level only
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
        orderBy: [asc(comments.createdAt)],
      },
    },
    orderBy: [desc(comments.createdAt)],
  });

  return commentList;
}
```

### Update Comment

```typescript
async function updateComment(
  commentId: string,
  authorId: string,
  content: string
) {
  const [updated] = await db
    .update(comments)
    .set({
      content,
      updatedAt: new Date(),
    })
    .where(and(eq(comments.id, commentId), eq(comments.authorId, authorId)))
    .returning();

  return updated;
}
```

---

## Reaction Operations

### Toggle Reaction

```typescript
async function toggleReaction(
  userId: string,
  targetType: "post" | "comment",
  targetId: string,
  reactionType: string = "like"
) {
  // Check if reaction exists
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
    const table = targetType === "post" ? posts : comments;
    await db
      .update(table)
      .set({ likesCount: sql`${table.likesCount} - 1` })
      .where(eq(table.id, targetId));

    return { action: "removed" };
  } else {
    // Add reaction
    await db.insert(reactions).values({
      userId,
      targetType,
      targetId,
      reactionType,
    });

    // Increment count
    const table = targetType === "post" ? posts : comments;
    await db
      .update(table)
      .set({ likesCount: sql`${table.likesCount} + 1` })
      .where(eq(table.id, targetId));

    return { action: "added" };
  }
}
```

### Get User Reactions

```typescript
async function getUserReactions(userId: string, postIds: string[]) {
  const userReactions = await db.query.reactions.findMany({
    where: and(
      eq(reactions.userId, userId),
      eq(reactions.targetType, "post"),
      inArray(reactions.targetId, postIds)
    ),
  });

  // Convert to map for easy lookup
  return Object.fromEntries(
    userReactions.map((r) => [r.targetId, r.reactionType])
  );
}
```

---

## Course Operations

### Create Course with Modules and Lessons

```typescript
async function createCourse(data: {
  spaceId: string;
  title: string;
  description?: string;
  coverUrl?: string;
  modules: Array<{
    title: string;
    lessons: Array<{
      title: string;
      lessonType: LessonType;
      content: LessonContent;
      durationMinutes?: number;
      isPreview?: boolean;
    }>;
  }>;
}) {
  return await db.transaction(async (tx) => {
    // Create course
    const [course] = await tx
      .insert(courses)
      .values({
        spaceId: data.spaceId,
        title: data.title,
        description: data.description,
        coverUrl: data.coverUrl,
        isPublished: false,
      })
      .returning();

    // Create modules and lessons
    for (let i = 0; i < data.modules.length; i++) {
      const moduleData = data.modules[i];

      const [module] = await tx
        .insert(courseModules)
        .values({
          courseId: course.id,
          title: moduleData.title,
          sortOrder: i,
        })
        .returning();

      for (let j = 0; j < moduleData.lessons.length; j++) {
        const lessonData = moduleData.lessons[j];

        await tx.insert(courseLessons).values({
          moduleId: module.id,
          title: lessonData.title,
          lessonType: lessonData.lessonType,
          content: lessonData.content,
          durationMinutes: lessonData.durationMinutes,
          isPreview: lessonData.isPreview || false,
          sortOrder: j,
        });
      }
    }

    return course;
  });
}
```

### Get Course with Content

```typescript
async function getCourse(courseId: string) {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        with: {
          lessons: {
            orderBy: [asc(courseLessons.sortOrder)],
          },
        },
        orderBy: [asc(courseModules.sortOrder)],
      },
    },
  });

  return course;
}
```

### Enroll in Course

```typescript
async function enrollInCourse(userId: string, courseId: string) {
  const [enrollment] = await db
    .insert(courseEnrollments)
    .values({
      userId,
      courseId,
    })
    .onConflictDoNothing()
    .returning();

  return enrollment;
}
```

### Track Lesson Progress

```typescript
async function updateLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean,
  progressSeconds?: number
) {
  const [progress] = await db
    .insert(courseProgress)
    .values({
      userId,
      courseId,
      lessonId,
      completedAt: completed ? new Date() : null,
      progressSeconds,
    })
    .onConflictDoUpdate({
      target: [courseProgress.userId, courseProgress.lessonId],
      set: {
        completedAt: completed ? new Date() : null,
        progressSeconds,
      },
    })
    .returning();

  return progress;
}
```

### Get User Course Progress

```typescript
async function getCourseProgress(userId: string, courseId: string) {
  const progress = await db.query.courseProgress.findMany({
    where: and(
      eq(courseProgress.userId, userId),
      eq(courseProgress.courseId, courseId)
    ),
    with: {
      lesson: true,
    },
  });

  // Calculate completion percentage
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        with: {
          lessons: true,
        },
      },
    },
  });

  if (!course) return null;

  const totalLessons = course.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );
  const completedLessons = progress.filter((p) => p.completedAt).length;
  const percentComplete = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return {
    progress,
    stats: {
      totalLessons,
      completedLessons,
      percentComplete: Math.round(percentComplete),
    },
  };
}
```

---

## Event Operations

### Create Event

```typescript
async function createEvent(data: {
  spaceId: string;
  hostId: string;
  title: string;
  description?: string;
  eventType: EventType;
  location?: string;
  startsAt: Date;
  endsAt?: Date;
  capacity?: number;
}) {
  const [event] = await db.insert(events).values(data).returning();
  return event;
}
```

### Get Upcoming Events

```typescript
async function getUpcomingEvents(spaceId: string) {
  const now = new Date();

  const eventList = await db.query.events.findMany({
    where: and(eq(events.spaceId, spaceId), gte(events.startsAt, now)),
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
        where: eq(eventRsvps.status, "going"),
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
    orderBy: [asc(events.startsAt)],
  });

  return eventList;
}
```

### RSVP to Event

```typescript
async function rsvpToEvent(
  eventId: string,
  userId: string,
  status: RsvpStatus
) {
  // Check capacity
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      rsvps: {
        where: eq(eventRsvps.status, "going"),
      },
    },
  });

  if (!event) throw new Error("Event not found");

  const currentRsvps = event.rsvps.length;
  const isFull = event.capacity && currentRsvps >= event.capacity;

  // If event is full and user is trying to go, put them on waitlist
  const finalStatus = isFull && status === "going" ? "waitlist" : status;

  const [rsvp] = await db
    .insert(eventRsvps)
    .values({
      eventId,
      userId,
      status: finalStatus,
    })
    .onConflictDoUpdate({
      target: [eventRsvps.eventId, eventRsvps.userId],
      set: { status: finalStatus },
    })
    .returning();

  return rsvp;
}
```

---

## Notification Operations

### Create Notification

```typescript
async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values(data)
    .returning();

  return notification;
}
```

### Get Unread Notifications

```typescript
async function getUnreadNotifications(userId: string) {
  const unread = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ),
    orderBy: [desc(notifications.createdAt)],
    limit: 50,
  });

  return unread;
}
```

### Mark Notifications as Read

```typescript
async function markAsRead(notificationIds: string[]) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(inArray(notifications.id, notificationIds));
}
```

---

## Complex Queries

### Search Posts

```typescript
async function searchPosts(query: string, spaceId?: string) {
  const conditions = [
    or(
      like(posts.title, `%${query}%`),
      like(posts.content, `%${query}%`)
    ),
  ];

  if (spaceId) {
    conditions.push(eq(posts.spaceId, spaceId));
  }

  const results = await db.query.posts.findMany({
    where: and(...conditions),
    with: {
      author: {
        columns: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      space: true,
    },
    orderBy: [desc(posts.createdAt)],
    limit: 50,
  });

  return results;
}
```

### Get User Activity Feed

```typescript
async function getUserActivity(userId: string, limit: number = 20) {
  const [userPosts, userComments] = await Promise.all([
    db.query.posts.findMany({
      where: eq(posts.authorId, userId),
      with: {
        space: true,
      },
      orderBy: [desc(posts.createdAt)],
      limit: limit / 2,
    }),
    db.query.comments.findMany({
      where: eq(comments.authorId, userId),
      with: {
        post: {
          with: {
            space: true,
          },
        },
      },
      orderBy: [desc(comments.createdAt)],
      limit: limit / 2,
    }),
  ]);

  // Combine and sort
  const activity = [
    ...userPosts.map((p) => ({ type: "post" as const, ...p })),
    ...userComments.map((c) => ({ type: "comment" as const, ...c })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return activity.slice(0, limit);
}
```

### Get Community Stats

```typescript
async function getCommunityStats(communityId: string) {
  const [totalMembers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(profiles);

  const [totalPosts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .innerJoin(spaces, eq(spaces.id, posts.spaceId))
    .where(eq(spaces.communityId, communityId));

  const [totalComments] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .innerJoin(spaces, eq(spaces.id, posts.spaceId))
    .where(eq(spaces.communityId, communityId));

  return {
    totalMembers: totalMembers.count,
    totalPosts: totalPosts.count,
    totalComments: totalComments.count,
  };
}
```

---

## Next.js API Routes

### GET /api/posts/[id]

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, params.id),
    with: {
      author: true,
      comments: {
        with: { author: true },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}
```

### POST /api/posts

```typescript
// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, posts, profiles } from "@/lib/db";
import { auth } from "@clerk/nextjs";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get profile
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkId, clerkId),
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await req.json();

  const [post] = await db
    .insert(posts)
    .values({
      spaceId: body.spaceId,
      authorId: profile.id,
      title: body.title,
      content: body.content,
      contentFormat: "markdown",
    })
    .returning();

  return NextResponse.json(post, { status: 201 });
}
```

### POST /api/reactions

```typescript
// app/api/reactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { toggleReaction } from "@/lib/db/queries";
import { auth } from "@clerk/nextjs";
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkId, clerkId),
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await req.json();

  const result = await toggleReaction(
    profile.id,
    body.targetType,
    body.targetId,
    body.reactionType || "like"
  );

  return NextResponse.json(result);
}
```

---

## Best Practices

1. **Always use transactions** for operations that modify multiple tables
2. **Use `with` relations** instead of manual joins when possible
3. **Implement pagination** for all list queries
4. **Cache frequently accessed data** (e.g., community settings)
5. **Validate user permissions** before allowing mutations
6. **Use prepared statements** for frequently executed queries
7. **Handle errors gracefully** and return appropriate HTTP status codes
8. **Log slow queries** and add indexes as needed

---

These examples demonstrate production-ready patterns for using Drizzle ORM with the OpenCircle schema!
