# Reactions System - Usage Guide

This directory contains the Reactions (likes/emoji) system for OpenCircle posts and comments.

## Components

### ReactionButton

A client-side button component that displays a heart icon with the reaction count. Supports optimistic UI updates.

**Props:**
- `targetType`: `"post" | "comment"` - Type of content being reacted to
- `targetId`: `string` - ID of the post or comment
- `initialCount`: `number` - Initial number of reactions
- `initialUserReacted`: `boolean` - Whether the current user has already reacted
- `reactionType?`: `string` - Type of reaction (default: "like")
- `className?`: `string` - Additional CSS classes

**Example:**
```tsx
import { ReactionButton } from "@/components/reactions";

export function PostCard({ post, userReaction }) {
  return (
    <div>
      <h2>{post.title}</h2>
      <p>{post.content}</p>

      <ReactionButton
        targetType="post"
        targetId={post.id}
        initialCount={post.likesCount}
        initialUserReacted={!!userReaction}
      />
    </div>
  );
}
```

### EmojiPicker

A client-side component that displays a grid of emoji options for reactions. Designed for future emoji reaction support beyond just likes.

**Props:**
- `onEmojiSelect`: `(emoji: string) => void` - Callback when an emoji is selected
- `className?`: `string` - Additional CSS classes

**Example:**
```tsx
import { useState } from "react";
import { EmojiPicker } from "@/components/reactions";
import { toggleReaction } from "@/lib/actions/reactions";

export function ReactionPicker({ targetType, targetId }) {
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiSelect = async (emoji: string) => {
    await toggleReaction(targetType, targetId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setShowPicker(!showPicker)}>
        Add Reaction
      </button>

      {showPicker && (
        <div className="absolute bottom-full mb-2">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
      )}
    </div>
  );
}
```

## Server Actions

The Reactions system provides four server actions located at `/src/lib/actions/reactions.ts`:

### toggleReaction

Add or remove a reaction. Automatically updates the `likesCount` on the target post/comment.

```typescript
import { toggleReaction } from "@/lib/actions/reactions";

const result = await toggleReaction("post", postId, "like");

if (result.success) {
  console.log(result.action); // "added" or "removed"
}
```

### getReactions

Get all reactions for a post or comment, including user details.

```typescript
import { getReactions } from "@/lib/actions/reactions";

const result = await getReactions("post", postId);

if (result.success) {
  result.reactions.forEach(reaction => {
    console.log(`${reaction.user.fullName} reacted with ${reaction.reactionType}`);
  });
}
```

### getUserReaction

Check if a specific user has reacted to a post or comment.

```typescript
import { getUserReaction } from "@/lib/actions/reactions";

const result = await getUserReaction(userId, "comment", commentId);

if (result.success && result.reaction) {
  console.log("User has reacted with:", result.reaction.reactionType);
}
```

### getReactionCounts

Get reaction counts grouped by reaction type.

```typescript
import { getReactionCounts } from "@/lib/actions/reactions";

const result = await getReactionCounts("post", postId);

if (result.success) {
  console.log(result.counts);
  // { "like": 42, "❤️": 15, "🎉": 8 }
}
```

## Complete Example: Post with Reactions

Here's a complete example showing how to implement reactions on a post:

```tsx
// app/(main)/[community]/[space]/posts/[postId]/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { getPost } from "@/lib/actions/posts";
import { getUserReaction, getReactionCounts } from "@/lib/actions/reactions";
import { getProfileByClerkId } from "@/lib/db/queries";
import { ReactionButton } from "@/components/reactions";

export default async function PostPage({ params }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfileByClerkId(user.id);
  const { postId } = await params;

  const post = await getPost(postId);
  if (!post) notFound();

  // Get user's reaction status
  const userReactionResult = await getUserReaction(
    profile.id,
    "post",
    postId
  );

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>

      <div className="flex items-center gap-4 mt-4">
        <ReactionButton
          targetType="post"
          targetId={post.id}
          initialCount={post.likesCount}
          initialUserReacted={!!userReactionResult.reaction}
        />
      </div>
    </article>
  );
}
```

## Database Schema

The reactions table has the following structure:

- `id`: UUID primary key
- `userId`: UUID reference to profiles table
- `targetType`: Enum ("post" | "comment")
- `targetId`: UUID of the post or comment
- `reactionType`: String (default: "like")
- `createdAt`: Timestamp

**Unique constraint:** A user can only have one reaction of each type per target (userId, targetType, targetId, reactionType).

## Features

- Optimistic UI updates for instant feedback
- Automatic `likesCount` synchronization
- Support for multiple reaction types (emoji)
- Type-safe with TypeScript
- Accessible with proper ARIA labels
- Dark mode support

## Future Enhancements

- Display list of users who reacted
- Real-time reaction updates via WebSocket
- Reaction animations
- Custom emoji reactions per community
- Reaction analytics
