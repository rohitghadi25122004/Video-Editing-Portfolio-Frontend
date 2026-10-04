"use client";

import { PlayIcon } from "@phosphor-icons/react";
import { heroItem, pickHero } from "@/lib/content";
import { useItems } from "@/lib/content-context";
import { openPlayer } from "@/lib/player-events";

/** Opens the full player (with sound) for the hero item; focus returns here on close. */
export function WatchWithSoundButton({ className = "" }: { className?: string }) {
  const itemId = (pickHero(useItems()) ?? heroItem).id;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={`btn btn-outline ${className}`}
      onClick={(event) => openPlayer(itemId, event.currentTarget)}
    >
      <PlayIcon size={18} weight="fill" aria-hidden />
      Watch reel
    </button>
  );
}
