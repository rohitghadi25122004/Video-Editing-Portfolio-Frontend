import { PlayIcon } from "@phosphor-icons/react/ssr";

/**
 * Centered chartreuse play disc drawn over a cover. Purely visual: the
 * surrounding button carries the accessible name.
 */
export function PlayFacade({
  size = "short",
  className = "flex",
}: {
  size?: "short" | "long";
  /** Display utilities; pass a media-query variant to hide it on hover devices. */
  className?: string;
}) {
  const box = size === "long" ? "size-[60px] md:size-[88px]" : "size-16 md:size-[76px]";
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 items-center justify-center rounded-pill bg-field text-field-ink transition-[transform,opacity] duration-[160ms] ease-out-expo group-hover:scale-[1.06] ${box} ${className}`}
    >
      <PlayIcon weight="fill" className="size-6 translate-x-px md:size-7" />
    </span>
  );
}
