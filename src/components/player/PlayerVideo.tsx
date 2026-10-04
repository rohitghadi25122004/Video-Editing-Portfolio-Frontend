"use client";

import { PauseIcon, PlayIcon, SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type Ref,
} from "react";
import { formatTime, type PortfolioItem } from "@/lib/content";

export type PlayerVideoHandle = {
  toggle: () => void;
  toggleMute: () => void;
  seekBy: (seconds: number) => void;
};

/** BCP 47 codes for the spoken languages that appear in the content file. */
const LANG_CODES: Record<string, string> = { English: "en", Hindi: "hi" };

/**
 * Native MP4 playback with sound inside the player dialog. Starts with
 * play() on mount (the opening click is the user gesture); if the browser
 * refuses, it stays paused with the play button in view.
 */
export function PlayerVideo({
  item,
  src,
  active,
  aspectClass,
  ref,
}: {
  item: PortfolioItem;
  src: string;
  /** False while the dialog is closing: playback stops at once. */
  active: boolean;
  aspectClass: string;
  ref?: Ref<PlayerVideoHandle>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(item.durationSeconds ?? 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  // Stop and release the stream when the item changes or the dialog closes.
  // Restores src on (re)mount so a mount, cleanup, mount cycle keeps playing.
  useEffect(() => {
    const v = videoRef.current;
    if (v && !v.getAttribute("src")) {
      v.setAttribute("src", src);
      if (active) v.play().catch(() => {});
    }
    return () => {
      if (!v) return;
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only; src changes remount via key
  }, []);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play()
        .then(() => setPlaying(!v.paused))
        .catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  }

  function seekTo(t: number) {
    const v = videoRef.current;
    if (!v) return;
    const end = Number.isFinite(v.duration) ? v.duration : duration;
    const next = Math.min(Math.max(0, t), end || 0);
    v.currentTime = next;
    setTime(next);
  }

  useImperativeHandle(ref, () => ({
    toggle,
    toggleMute,
    seekBy: (seconds: number) => seekTo((videoRef.current?.currentTime ?? 0) + seconds),
  }));

  function syncDuration() {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
  }

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const captionsLang = item.language ? LANG_CODES[item.language] : undefined;

  return (
    <>
      <div
        className={`relative w-full overflow-hidden rounded-media-sm bg-[#0b0c0e] md:rounded-media ${aspectClass}`}
      >
        <video
          ref={videoRef}
          src={src}
          poster={item.cover}
          playsInline
          preload="auto"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={syncDuration}
          onDurationChange={syncDuration}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onError={() => setFailed(true)}
          className="size-full cursor-pointer object-contain"
        >
          {item.captionsVtt && (
            <track kind="captions" src={item.captionsVtt} srcLang={captionsLang} label={item.language ?? "Captions"} default />
          )}
        </video>

        {!playing && !failed && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 flex size-[76px] -translate-1/2 items-center justify-center rounded-pill bg-field text-field-ink"
          >
            <PlayIcon weight="fill" className="size-7 translate-x-px" />
          </span>
        )}

        {failed && (
          <p role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-[15px] text-[#a7a9a3]">
            This video could not be loaded. Try again later.
          </p>
        )}
      </div>

      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-pill bg-[#23252a] px-2">
        <button
          type="button"
          data-focus="play"
          aria-label={playing ? "Pause" : "Play"}
          onClick={toggle}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill bg-field text-field-ink transition-transform duration-[160ms] active:scale-[0.96]"
        >
          {playing ? <PauseIcon weight="fill" className="size-[18px]" /> : <PlayIcon weight="fill" className="size-[18px] translate-x-px" />}
        </button>

        <input
          type="range"
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
          min={0}
          max={duration || 0}
          step="any"
          value={Math.min(time, duration || 0)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => seekTo(Number(e.currentTarget.value))}
          style={{ "--p": `${pct}%` } as CSSProperties}
          className="h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-offset-0 [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-field [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#efefea] [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[#6c6f75] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--field)_var(--p),#6c6f75_var(--p))] [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#efefea]"
        />

        <span aria-hidden="true" className="text-[13px] whitespace-nowrap text-[#a7a9a3] tabular-nums">
          {formatTime(time)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill text-[#efefea] transition-colors duration-[160ms] hover:bg-[#2e3036] active:scale-[0.96]"
        >
          {muted ? <SpeakerSlashIcon className="size-5" /> : <SpeakerHighIcon className="size-5" />}
        </button>
      </div>
    </>
  );
}
