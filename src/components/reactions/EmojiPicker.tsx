"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

// Common emoji reactions
const EMOJI_OPTIONS = [
  { emoji: "❤️", label: "Love" },
  { emoji: "👍", label: "Like" },
  { emoji: "👏", label: "Applause" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "💯", label: "100" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "😍", label: "Heart eyes" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "💡", label: "Idea" },
  { emoji: "🚀", label: "Rocket" },
];

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handleSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onEmojiSelect(emoji);
  };

  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg",
        className
      )}
      role="grid"
      aria-label="Emoji picker"
    >
      {EMOJI_OPTIONS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => handleSelect(emoji)}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-md text-2xl",
            "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2",
            selectedEmoji === emoji && "bg-gray-100 dark:bg-gray-800"
          )}
          aria-label={label}
          title={label}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
