# OpenCircle Database Schema

Production-quality Drizzle ORM schema for OpenCircle, adapted from the original Supabase design for use with Neon PostgreSQL.

## Architecture Decisions

### Authentication: Clerk Integration
- **Profiles table** uses `clerkId` to sync with Clerk via webhooks
- No direct auth tables - Clerk handles authentication
- Profile creation happens on first login via webhook

### Chat: Waku P2P
- **NO messages table** - all chat/DM goes through Waku (peer-to-peer, not stored)
- **NO conversations table** - DMs are handled entirely by Waku
- **NO conversation_participants table** - Waku manages participant lists
- Only persistent notifications are stored in the database

### File Storage: Cloudflare R2
- **Files table** stores metadata only (file name, type, size, R2 key)
- Actual file bytes stored in Cloudflare R2
- `r2Key` is the object key in R2
- `r2Url` is the public URL (or signed URL for private files)

## Schema Overview

### Core Tables

1. **communities** - Community settings and branding
2. **profiles** - User profiles (synced from Clerk)
3. **spaces** - Organizational units (discussion, chat, course, events, resources)
4. **posts** - Discussion posts (only for discussion spaces)
5. **comments** - Threaded replies on posts
6. **reactions** - Emoji reactions on posts/comments

### Course System

7. **courses** - Course metadata
8. **course_modules** - Course sections
9. **course_lessons** - Individual lessons
10. **course_progress** - User progress tracking
11. **course_enrollments** - User enrollments

### Events

12. **events** - Event metadata
13. **event_rsvps** - RSVP tracking

### Monetization

14. **membership_tiers** - Subscription tiers
15. **subscriptions** - Stripe subscription sync

### Supporting Tables

16. **notifications** - Persistent in-app notifications
17. **files** - R2 file metadata

## Key Patterns

### UUID Primary Keys
All tables use `uuid("id").primaryKey().defaultRandom()` for distributed-friendly IDs.

### Timestamps
All tables use `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` for consistency.

### Foreign Keys with Cascades
References use `.references(() => table.id, { onDelete: "cascade" })` where appropriate.

### Enums
Type-safe enums for all constrained fields:
- `roleEnum` - user roles
- `spaceTypeEnum` - space types
- `visibilityEnum` - access control
- `billingPeriodEnum` - subscription periods
- `notificationTypeEnum` - notification types
- etc.

### Relations
Full bidirectional relations defined for type-safe joins and includes.

## Usage Examples

### Basic Query
```typescript
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";

// Get profile by Clerk ID
const profile = await db.query.profiles.findFirst({
  where: eq(profiles.clerkId, clerkUserId),
});
```

### Query with Relations
```typescript
import { db, posts } from "@/lib/db";
import { eq } from "drizzle-orm";

// Get post with author and comments
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    author: true,
    comments: {
      with: {
        author: true,
      },
    },
  },
});
```

### Insert
```typescript
import { db, posts } from "@/lib/db";

const newPost = await db.insert(posts).values({
  spaceId: "...",
  authorId: "...",
  title: "Hello World",
  content: "My first post!",
  contentFormat: "markdown",
}).returning();
```

### Update
```typescript
import { db, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";

await db.update(profiles)
  .set({ lastSeenAt: new Date() })
  .where(eq(profiles.id, userId));
```

### Complex Query with Filters
```typescript
import { db, spaces, posts } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

// Get latest posts from a space
const latestPosts = await db.query.posts.findMany({
  where: and(
    eq(posts.spaceId, spaceId),
    eq(posts.isPinned, false)
  ),
  with: {
    author: {
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
  },
  orderBy: [desc(posts.createdAt)],
  limit: 20,
});
```

### Transaction Example
```typescript
import { db, posts, profiles } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

await db.transaction(async (tx) => {
  // Create post
  const [post] = await tx.insert(posts).values({
    spaceId: "...",
    authorId: "...",
    title: "Title",
    content: "Content",
  }).returning();

  // Increment user's post count (if you add that field)
  await tx.update(profiles)
    .set({ postsCount: sql`${profiles.postsCount} + 1` })
    .where(eq(profiles.id, authorId));
});
```

## Migrations

### Generate Migration
```bash
npm run db:generate
# or
pnpm drizzle-kit generate
```

### Apply Migration
```bash
npm run db:migrate
# or
pnpm drizzle-kit migrate
```

### View Studio
```bash
npm run db:studio
# or
pnpm drizzle-kit studio
```

## Environment Variables

```env
# Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Waku (p2p chat)
NEXT_PUBLIC_WAKU_BOOTSTRAP_PEERS=...
```

## Package Dependencies

```json
{
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "@neondatabase/serverless": "^0.9.0",
    "@clerk/nextjs": "^4.29.0",
    "@stripe/stripe-js": "^2.4.0",
    "stripe": "^14.11.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0"
  }
}
```

## Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Access Control Notes

### Membership Tiers
- `spaceAccess` array on membership tiers controls which spaces each tier can access
- `requiredTierIds` array on spaces lists which tiers grant access
- Free tier should have `priceCents: 0`

### Space Visibility
- `public` - All community members can access
- `private` - Invite only (implement via separate membership table if needed)
- `paid` - Requires specific membership tier (check `requiredTierIds`)

### Role Hierarchy
- `member` - Basic member
- `moderator` - Can moderate content
- `admin` - Can manage spaces and members
- `owner` - Full control (one per community)

## Indexes Recommendation

After initial deployment, add indexes for common queries:

```sql
-- Profiles
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Posts
CREATE INDEX idx_posts_space_id ON posts(space_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Comments
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Reactions
CREATE INDEX idx_reactions_target ON reactions(target_type, target_id);

-- Events
CREATE INDEX idx_events_space_id ON events(space_id);
CREATE INDEX idx_events_starts_at ON events(starts_at);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);

-- Course Progress
CREATE INDEX idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX idx_course_progress_course_id ON course_progress(course_id);
```

## Production Checklist

- [ ] Set up Neon database
- [ ] Configure DATABASE_URL in environment
- [ ] Run initial migration: `pnpm db:push`
- [ ] Set up Clerk webhooks for profile sync
- [ ] Configure Stripe webhooks for subscription sync
- [ ] Set up R2 bucket and CORS policies
- [ ] Add database indexes (see above)
- [ ] Enable connection pooling in production
- [ ] Set up database backups
- [ ] Monitor query performance

## Notes

- This schema is optimized for Neon's serverless architecture
- Uses `neon-http` driver for edge compatibility
- All relations are properly typed for IntelliSense
- Supports multi-tenancy via `communityId` (if needed)
- No RLS needed - implement authorization in application layer
