"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatLine } from "@/lib/content";
import { useContent } from "@/lib/content-context";
import { openPlayer } from "@/lib/player-events";
import { usePrefersReducedMotion } from "@/lib/use-media-preferences";
import { HeroMedia } from "./HeroMedia";

// The WebGL globe is code-split: it never weighs on first load or LCP.
const VideoSphere = dynamic(() => import("./VideoSphere"), { ssr: false });

type Mode = "pending" | "sphere" | "loop";

function supportsWebGL2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * What fills the hero field:
 * - first paint (server): the poster frame, which is the LCP element;
 * - WebGL2 and motion allowed: the video globe fades in over it once its
 *   covers are on the GPU, then the poster steps back;
 * - otherwise: the muted hero loop (HeroMedia decides on Save-Data and
 *   reduced motion, falling back to the still poster).
 */
export function HeroStage({
  loopSrc,
  mediaClassName,
  controlClassName,
  children,
}: {
  loopSrc?: string;
  mediaClassName: string;
  controlClassName: string;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const { items: list, settled } = useContent();
  const items = useMemo(
    () => list.map((item) => ({ id: item.id, label: item.label, line: formatLine(item), cover: item.cover })),
    [list],
  );
  // A changed list rebuilds the globe (its covers live in one GPU texture).
  const listKey = items.map((i) => `${i.id}:${i.cover}`).join("|");
  const [mode, setMode] = useState<Mode>("pending");
  const [sphereReady, setSphereReady] = useState(false);

  useEffect(() => {
    // Decided after hydration: the server render is always the poster.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe
    setMode(!reduced && items.length > 0 && supportsWebGL2() ? "sphere" : "loop");
  }, [reduced, items.length]);

  const onOpen = useCallback((id: string, trigger: HTMLElement | null) => openPlayer(id, trigger), []);
  const onReady = useCallback(() => setSphereReady(true), []);
  const onFail = useCallback(() => {
    setSphereReady(false);
    setMode("loop");
  }, []);

  return (
    <>
      <HeroMedia
        loopSrc={mode === "loop" ? loopSrc : undefined}
        className={`${mediaClassName} transition-opacity duration-(--dur-cut) ease-out-expo ${sphereReady ? "opacity-0" : "opacity-100"}`}
        controlClassName={controlClassName}
      >
        {children}
      </HeroMedia>
      {mode === "sphere" && settled ? (
        <VideoSphere key={listKey} items={items} onOpen={onOpen} onReady={onReady} onFail={onFail} />
      ) : null}
    </>
  );
}
