"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleReaction } from "@/lib/actions/reactions";
import { cn } from "@/lib/utils";
import type { ReactionTargetType } from "@/lib/db/types";

interface ReactionButtonProps {
  targetType: ReactionTargetType;
  targetId: string;
  initialCount: number;
  initialUserReacted: boolean;
  reactionType?: string;
  className?: string;
}

export function ReactionButton({
  targetType,
  targetId,
  initialCount,
  initialUserReacted,
  reactionType = "like",
  className,
}: ReactionButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [isReacted, setIsReacted] = useState(initialUserReacted);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    // Optimistic update
    const newIsReacted = !isReacted;
    const newCount = newIsReacted ? count + 1 : count - 1;

    setIsReacted(newIsReacted);
    setCount(newCount);

    // Perform the action
    startTransition(async () => {
      const result = await toggleReaction(targetType, targetId, reactionType);

      if (!result.success) {
        // Revert on error
        setIsReacted(isReacted);
        setCount(count);
        console.error("Failed to toggle reaction:", result.error);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
        "hover:bg-pink-50 dark:hover:bg-pink-950/20",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isReacted
          ? "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/20"
          : "text-gray-600 dark:text-gray-400",
        className
      )}
      aria-label={isReacted ? "Remove like" : "Add like"}
      aria-pressed={isReacted}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-all duration-200",
          isReacted && "fill-current scale-110"
        )}
      />
      {count > 0 && (
        <span className="text-sm font-medium tabular-nums">{count}</span>
      )}
    </button>
  );
}
