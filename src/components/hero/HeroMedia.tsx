"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionMediaAllowed } from "@/lib/use-media-preferences";

/**
 * Hero 9:16 media box. The poster (passed as children, server rendered) is
 * the base layer and the LCP element. When motion and data allow it, a muted
 * loop mounts over it and fades in once it actually plays. The loop pauses
 * off-screen and resumes when visible, unless the visitor paused it.
 *
 * Renders a fragment: the box, plus the pause/play control positioned against
 * the nearest positioned ancestor (the chartreuse field), outside the frame.
 */
export function HeroMedia({
  loopSrc,
  children,
  className = "",
  controlClassName = "",
}: {
  loopSrc?: string;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
}) {
  const allowed = useMotionMediaAllowed();
  const showLoop = allowed && Boolean(loopSrc);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedByVisitor = useRef(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!showLoop || !video) return;

    // Belt and braces for autoplay policies: the loop is always silent.
    video.muted = true;
    video.defaultMuted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!pausedByVisitor.current) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [showLoop]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByVisitor.current = false;
      video.play().catch(() => {});
    } else {
      pausedByVisitor.current = true;
      video.pause();
    }
  }

  return (
    <>
      <div className={`relative overflow-hidden bg-player ${className}`}>
        {children}
        {showLoop ? (
          <video
            ref={videoRef}
            src={loopSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            disablePictureInPicture
            aria-hidden
            tabIndex={-1}
            onLoadStart={() => setReady(false)}
            onPlaying={() => setReady(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-(--dur-cut) ease-out-expo ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
      </div>

      {showLoop ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause preview" : "Play preview"}
          className={`btn-icon absolute text-field-ink shadow-[inset_0_0_0_1.5px_var(--field-ink)] hover:bg-field-ink hover:text-field ${controlClassName}`}
        >
          {playing ? (
            <PauseIcon size={18} weight="fill" aria-hidden />
          ) : (
            <PlayIcon size={18} weight="fill" aria-hidden />
          )}
        </button>
      ) : null}
    </>
  );
}
