"use client";

import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from "react";
import { CutIn } from "@/components/shared/CutIn";
import { formatTime, type PortfolioItem } from "@/lib/content";
import { openPlayer } from "@/lib/player-events";
import { useCanHover, usePrefersReducedMotion, useSaveData } from "@/lib/use-media-preferences";
import { CoverImage } from "./CoverImage";
import { PlayFacade } from "./PlayFacade";

type Mode = "idle" | "scrub" | "preview";

/** Always visible at rest; fades out once the scrub or preview takes over. */
const FACADE_WITH_INTENT_FADE =
  "flex group-data-[intent=on]:opacity-0 motion-reduce:transition-none";

/**
 * The media half of a work card: a button that opens the player.
 *
 * MP4 items carry the Poster Cut signature. On fine pointers the video is
 * created on first hover and pointer x maps to currentTime (the scrub); on
 * keyboard focus a muted preview plays from the start. Every per-frame
 * update goes straight to the DOM through refs, never through React state.
 * Drive items show the cover with a play facade and load nothing from Google.
 */
export function WorkMedia({ item, className = "" }: { item: PortfolioItem; className?: string }) {
  const isShort = item.aspect === "9:16";
  const canHover = useCanHover();
  const saveData = useSaveData();
  const reduced = usePrefersReducedMotion();
  const src = item.source.type === "mp4" ? item.source.src : null;
  const scrubEnabled = src !== null && canHover && !saveData && !reduced;
  const previewEnabled = src !== null && !reduced && !saveData;

  // Flips once, on the first sign of intent, to create the <video>.
  const [armed, setArmed] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<Mode>("idle");
  const pointerXRef = useRef(0);
  const rafRef = useRef(0);
  const seekPendingRef = useRef(false);
  const failedRef = useRef(false);

  useEffect(() => {
    const video = videoRef;
    const raf = rafRef;
    return () => {
      cancelAnimationFrame(raf.current);
      video.current?.pause();
    };
  }, []);

  function duration() {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) return v.duration;
    return item.durationSeconds ?? 0;
  }

  function paint(t: number) {
    const d = duration();
    if (readoutRef.current) readoutRef.current.textContent = `${formatTime(t)} / ${formatTime(d)}`;
    if (fillRef.current) {
      fillRef.current.style.transform = `scaleX(${d > 0 ? Math.min(1, t / d) : 0})`;
    }
  }

  function setFlag(name: "intent" | "video", on: boolean) {
    const b = buttonRef.current;
    if (!b) return;
    if (on) b.dataset[name] = "on";
    else delete b.dataset[name];
  }

  function cancelFrame() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }

  function stop() {
    cancelFrame();
    modeRef.current = "idle";
    seekPendingRef.current = false;
    videoRef.current?.pause();
    setFlag("intent", false);
    setFlag("video", false);
  }

  /** One rAF step of the scrub: pointer x to time, readout, then seek. */
  function scrubFrame() {
    rafRef.current = 0;
    const b = buttonRef.current;
    if (modeRef.current !== "scrub" || !b) return;
    const rect = b.getBoundingClientRect();
    const frac = rect.width > 0 ? Math.min(1, Math.max(0, (pointerXRef.current - rect.left) / rect.width)) : 0;
    const t = frac * duration();
    paint(t);

    const v = videoRef.current;
    if (!v || v.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (v.seeking) {
      // Let the current seek land first; seeked picks up the latest x.
      seekPendingRef.current = true;
      return;
    }
    if (typeof v.fastSeek === "function") v.fastSeek(t);
    else v.currentTime = t;
  }

  function scheduleScrub() {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(scrubFrame);
  }

  function startPreview() {
    const v = videoRef.current;
    if (!v || modeRef.current !== "preview" || v.readyState < HTMLMediaElement.HAVE_METADATA) return;
    v.muted = true;
    v.loop = true;
    v.currentTime = 0;
    v.play().catch(() => {
      if (modeRef.current === "preview") stop();
    });
    const tick = () => {
      if (modeRef.current !== "preview") {
        rafRef.current = 0;
        return;
      }
      paint(v.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    cancelFrame();
    rafRef.current = requestAnimationFrame(tick);
  }

  function onPointerEnter(e: PointerEvent<HTMLButtonElement>) {
    if (!scrubEnabled || failedRef.current || e.pointerType === "touch") return;
    cancelFrame();
    videoRef.current?.pause();
    modeRef.current = "scrub";
    pointerXRef.current = e.clientX;
    setFlag("intent", true);
    if (!armed) setArmed(true);
    scheduleScrub();
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (modeRef.current !== "scrub") return;
    pointerXRef.current = e.clientX;
    scheduleScrub();
  }

  function onPointerLeave() {
    if (modeRef.current === "scrub") stop();
  }

  function onFocus(e: FocusEvent<HTMLButtonElement>) {
    if (!previewEnabled || failedRef.current || modeRef.current === "scrub") return;
    // A tap or click also focuses; only keyboard focus starts the preview.
    if (!e.currentTarget.matches(":focus-visible")) return;
    modeRef.current = "preview";
    setFlag("intent", true);
    paint(0);
    if (!armed) setArmed(true);
    else startPreview();
  }

  function onBlur() {
    if (modeRef.current === "preview") stop();
  }

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    stop();
    openPlayer(item.id, e.currentTarget);
  }

  function onLoadedMetadata() {
    if (modeRef.current === "scrub") scheduleScrub();
    else if (modeRef.current === "preview") startPreview();
  }

  function onSeeked() {
    if (modeRef.current !== "scrub") return;
    setFlag("video", true);
    if (seekPendingRef.current) {
      seekPendingRef.current = false;
      scheduleScrub();
    }
  }

  function onPlaying() {
    if (modeRef.current === "preview") setFlag("video", true);
  }

  function onVideoError() {
    failedRef.current = true;
    stop();
  }

  const facadeDisplay = src === null ? "flex" : FACADE_WITH_INTENT_FADE;
  const sizes = isShort ? "(min-width: 768px) 30vw, 272px" : "(min-width: 768px) 70vw, 100vw";

  return (
    <CutIn className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Play ${item.label}`}
        aria-haspopup="dialog"
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`group relative block w-full cursor-pointer overflow-hidden rounded-media-sm bg-surface p-0 md:rounded-media ${
          isShort ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        <CoverImage item={item} sizes={sizes} />

        {src !== null && armed && (
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
            onLoadedMetadata={onLoadedMetadata}
            onSeeked={onSeeked}
            onPlaying={onPlaying}
            onError={onVideoError}
            className="pointer-events-none absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-[280ms] ease-out-expo group-data-[video=on]:opacity-100 motion-reduce:transition-none"
          />
        )}

        <PlayFacade size={isShort ? "short" : "long"} className={facadeDisplay} />

        {src !== null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 bottom-3 grid h-11 grid-cols-[1fr_auto] items-center gap-3 rounded-pill bg-[rgb(21_22_26/0.72)] px-4 text-[13px] font-medium text-[#f4f4f1] tabular-nums opacity-0 transition-opacity duration-[160ms] ease-out-expo group-data-[intent=on]:opacity-100 motion-reduce:transition-none md:inset-x-4 md:bottom-4"
          >
            <span className="relative h-[3px] overflow-hidden rounded-full bg-[rgb(244_244_241/0.3)]">
              <span
                ref={fillRef}
                className="absolute inset-0 origin-left rounded-full bg-field [transform:scaleX(0)]"
              />
            </span>
            <span ref={readoutRef} />
          </span>
        )}
      </button>
    </CutIn>
  );
}
