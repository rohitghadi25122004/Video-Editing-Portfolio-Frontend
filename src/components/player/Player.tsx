"use client";

import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { PlayFacade } from "@/components/work/PlayFacade";
import { formatLine, formatTime, profile, type PortfolioItem } from "@/lib/content";
import { useItems } from "@/lib/content-context";
import { PLAYER_OPEN_EVENT, type PlayerOpenDetail } from "@/lib/player-events";
import { usePrefersReducedMotion } from "@/lib/use-media-preferences";
import { PlayerVideo, type PlayerVideoHandle } from "./PlayerVideo";

const CLOSE_MS = 280;

/* Viewing-room palette: the player stays ink with light text in both themes. */
const CHALK = "text-[#efefea]";
const FOG = "text-[#a7a9a3]";

/**
 * Media width per aspect. The box keeps its true ratio and fits both the
 * viewport width and the height left after the control bar.
 */
const MEDIA_WIDTH: Record<PortfolioItem["aspect"], { sm: string; lg: string }> = {
  "9:16": {
    sm: "min(100%, (100dvh - 12rem) * 9 / 16)",
    lg: "min((100dvh - 10.5rem) * 9 / 16, 100vw - 46rem)",
  },
  "16:9": {
    sm: "min(100%, (100dvh - 12rem) * 16 / 9)",
    lg: "min(100vw - 46rem, (100dvh - 10.5rem) * 16 / 9)",
  },
};

let scrollLock: { overflow: string; paddingRight: string } | null = null;

function lockScroll() {
  if (scrollLock) return;
  const html = document.documentElement;
  const gap = window.innerWidth - html.clientWidth;
  scrollLock = { overflow: html.style.overflow, paddingRight: document.body.style.paddingRight };
  html.style.overflow = "hidden";
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
}

function unlockScroll() {
  if (!scrollLock) return;
  document.documentElement.style.overflow = scrollLock.overflow;
  document.body.style.paddingRight = scrollLock.paddingRight;
  scrollLock = null;
}

/** "A", "A and B", "A, B and C". */
function joinAnd(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The viewing room. One native <dialog> for the whole page, opened with
 * showModal() whenever PLAYER_OPEN_EVENT fires (hero button, work cards).
 * The modal makes the page inert and keeps Tab inside; Esc closes through
 * the native cancel event; focus returns to whatever opened it.
 */
export function Player() {
  const [itemId, setItemId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const reduced = usePrefersReducedMotion();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoApi = useRef<PlayerVideoHandle>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const focusOnOpenRef = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);

  const items = useItems();
  const item = itemId ? (items.find((i) => i.id === itemId) ?? null) : null;
  // The open-event listener is registered once; it reads the live list through this ref.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const index = item ? items.findIndex((i) => i.id === item.id) : -1;

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<PlayerOpenDetail>).detail;
      if (!detail || !itemsRef.current.some((i) => i.id === detail.itemId)) return;
      window.clearTimeout(closeTimer.current);
      triggerRef.current =
        detail.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      focusOnOpenRef.current = true;
      setClosing(false);
      setAnnouncement("");
      setItemId(detail.itemId);
    }
    window.addEventListener(PLAYER_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(PLAYER_OPEN_EVENT, onOpen);
      window.clearTimeout(closeTimer.current);
      unlockScroll();
    };
  }, []);

  // Open the dialog once its content has rendered, then place focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    const current = itemId ? itemsRef.current.find((i) => i.id === itemId) : undefined;
    if (!dialog || !current) return;
    if (!dialog.open) {
      lockScroll();
      dialog.showModal();
    }
    if (focusOnOpenRef.current) {
      focusOnOpenRef.current = false;
      const selector = current.source.type === "mp4" ? '[data-focus="play"]' : '[data-focus="close"]';
      const target = Array.from(dialog.querySelectorAll<HTMLElement>(selector)).find(
        (el) => el.getClientRects().length > 0,
      );
      target?.focus();
    }
  }, [itemId]);

  function requestClose() {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (reduced) {
      dialog.close();
      return;
    }
    if (closing) return;
    setClosing(true); // pauses video and unmounts the Drive iframe right away
    closeTimer.current = window.setTimeout(() => dialog.close(), CLOSE_MS);
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    requestClose();
  }

  function onClose() {
    window.clearTimeout(closeTimer.current);
    unlockScroll();
    setClosing(false);
    setItemId(null);
    setAnnouncement("");
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }

  function step(delta: number) {
    if (index < 0) return;
    const next = items[(index + delta + items.length) % items.length];
    setItemId(next.id);
    setAnnouncement(`Now showing ${next.label}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (!item || item.source.type !== "mp4" || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const api = videoApi.current;
    if (!api) return;
    const target = event.target as HTMLElement;
    // Space keeps its native meaning on buttons, links and text fields.
    const spaceIsNative = target.closest("button, a, select, textarea, input:not([type='range'])");
    // Physical keys for K and M so non-Latin keyboard layouts work too.
    const key = event.code === "KeyK" ? "k" : event.code === "KeyM" ? "m" : event.key;
    switch (key) {
      case " ":
        if (spaceIsNative) return;
        event.preventDefault();
        api.toggle();
        break;
      case "k":
      case "K":
        event.preventDefault();
        api.toggle();
        break;
      case "m":
      case "M":
        event.preventDefault();
        api.toggleMute();
        break;
      case "ArrowLeft":
        event.preventDefault();
        api.seekBy(-5);
        break;
      case "ArrowRight":
        event.preventDefault();
        api.seekBy(5);
        break;
    }
  }

  const width = item ? MEDIA_WIDTH[item.aspect] : MEDIA_WIDTH["9:16"];
  const aspectClass = item?.aspect === "16:9" ? "aspect-video" : "aspect-[9/16]";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={item ? "player-title" : undefined}
      onCancel={onCancel}
      onClose={onClose}
      onKeyDown={onKeyDown}
      data-closing={closing ? "true" : undefined}
      className={`scroll-dark group/player m-0 h-full max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-player p-0 opacity-100 transition-opacity duration-[280ms] ease-out-expo [--focus:#d4dd3f] backdrop:bg-transparent starting:open:opacity-0 data-[closing=true]:opacity-0 lg:overflow-hidden ${CHALK}`}
    >
      {item && (
        <div className="flex min-h-full scale-100 flex-col gap-5 px-4 pt-4 pb-10 transition-[scale] duration-[280ms] ease-out-expo group-data-[closing=true]/player:scale-[0.98] starting:scale-[0.98] lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-10 lg:px-12 lg:py-0">
          {/* Phone top bar: close sits top right. */}
          <div className="flex justify-end lg:hidden">
            <CloseButton onClick={requestClose} />
          </div>

          {/* Metadata: left column on desktop, below everything on phones. */}
          <div className="order-last flex max-w-[380px] flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-1 lg:self-end lg:justify-self-end lg:pb-16">
            <h2
              id="player-title"
              className="font-display text-[clamp(1.75rem,min(2.8vw,5.5dvh),3rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance"
            >
              {item.label}
            </h2>
            <p className={`text-base leading-relaxed ${FOG}`}>
              {formatLine(item)}
              {item.durationSeconds !== null ? `, ${formatTime(item.durationSeconds)}` : ""}.
              {item.tools.length > 0 && (
                <>
                  <br />
                  Edited in {joinAnd(item.tools)}.
                </>
              )}
            </p>
            {item.categories.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Categories">
                {item.categories.map((c) => (
                  <li
                    key={c}
                    className="inline-flex h-[34px] items-center rounded-pill px-3.5 text-sm shadow-[inset_0_0_0_1px_#3a3c42]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {item.captionsVtt === null && <p className={`text-sm ${FOG}`}>No captions.</p>}
          </div>

          {/* Media flanked by carousel arrows: beside it on desktop, over its edges on phones. */}
          <div className="relative flex w-full items-center justify-center gap-4 self-center lg:col-start-2 lg:row-start-1 lg:w-auto xl:gap-6">
          {items.length > 1 && (
            <NavButton label="Previous video" side="prev" onClick={() => step(-1)}>
              <CaretLeftIcon className="size-5" weight="bold" />
            </NavButton>
          )}
          <div
            key={item.id}
            style={{ "--media-w": width.sm, "--media-w-lg": width.lg } as CSSProperties}
            className="flex w-(--media-w) flex-col gap-4 lg:w-(--media-w-lg)"
          >
            {item.source.type === "mp4" ? (
              <PlayerVideo
                ref={videoApi}
                item={item}
                src={item.source.src}
                active={!closing}
                aspectClass={aspectClass}
              />
            ) : (
              <>
                <div
                  className={`relative w-full overflow-hidden rounded-media-sm bg-[#0b0c0e] md:rounded-media ${aspectClass}`}
                >
                  <PlayerCover item={item} />
                  <PlayFacade size="long" />
                  {!closing && (
                    <iframe
                      src={item.source.embedUrl}
                      title={`${item.label} video player`}
                      allow="autoplay; fullscreen"
                      loading="eager"
                      className="absolute inset-0 size-full border-0"
                    />
                  )}
                </div>
                <p className={`text-sm ${FOG}`}>Playback controls are Google Drive&apos;s.</p>
              </>
            )}
          </div>
          {items.length > 1 && (
            <NavButton label="Next video" side="next" onClick={() => step(1)}>
              <CaretRightIcon className="size-5" weight="bold" />
            </NavButton>
          )}
          </div>

          {/* Close and email. Right column on desktop. */}
          <div className="flex items-center justify-end gap-3 lg:col-start-3 lg:row-start-1 lg:h-full lg:flex-col lg:items-end lg:justify-between lg:pt-10 lg:pb-16">
            <CloseButton onClick={requestClose} className="hidden lg:inline-flex" />
            <a href={`mailto:${profile.contact.email}`} className="btn btn-field btn-sm lg:h-[3.25rem] lg:px-[1.625rem] lg:text-base">
              Email me
            </a>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </dialog>
  );
}

function CloseButton({ onClick, className = "inline-flex" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      data-focus="close"
      onClick={onClick}
      className={`h-12 cursor-pointer items-center gap-2 rounded-pill px-5 text-[15px] font-semibold text-[#efefea] shadow-[inset_0_0_0_1px_#6c6f75] transition-[background-color,color,scale] duration-[160ms] hover:bg-[#efefea] hover:text-[#15161a] active:scale-[0.98] ${className}`}
    >
      <XIcon className="size-4" weight="bold" />
      Close
    </button>
  );
}

function NavButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string;
  side: "prev" | "next";
  onClick: () => void;
  children: ReactNode;
}) {
  // Phones: float over the media edges, centred on the frame (above the control bar).
  const phone =
    side === "prev"
      ? "max-lg:absolute max-lg:left-2 max-lg:top-[calc(50%-2.25rem)] max-lg:-translate-y-1/2"
      : "max-lg:absolute max-lg:right-2 max-lg:top-[calc(50%-2.25rem)] max-lg:-translate-y-1/2";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`z-10 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill bg-[rgb(21_22_26/0.72)] shadow-[inset_0_0_0_1px_#6c6f75] backdrop-blur-sm transition-[background-color,scale] duration-[160ms] hover:bg-[#2e3036] active:scale-[0.96] lg:size-14 lg:bg-transparent lg:backdrop-blur-none ${phone} ${CHALK}`}
    >
      {children}
    </button>
  );
}

/** Drive cover shown under the iframe while Google's player loads. */
function PlayerCover({ item }: { item: PortfolioItem }) {
  const [broken, setBroken] = useState(!item.cover);
  if (broken) return null;
  return (
    <Image
      src={item.cover}
      alt=""
      fill
      sizes="(min-width: 1024px) 60vw, 100vw"
      className="object-cover"
      onError={() => setBroken(true)}
    />
  );
}
