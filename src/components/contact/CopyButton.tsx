"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";

type Status = "idle" | "copied" | "failed";

/**
 * Copies `value` to the clipboard. Renders the button and a polite live
 * region as siblings so the parent (flex-wrap or grid) can place the
 * failure line on its own row via `statusClassName`.
 * Never queries clipboard permissions: a rejected or missing API is a failure.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedMessage,
  className = "",
  copiedClassName,
  statusClassName = "",
  iconSize = 18,
  hideLabel = false,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  failedMessage: string;
  className?: string;
  /** Classes while in the copied state (defaults to className). */
  copiedClassName?: string;
  statusClassName?: string;
  iconSize?: number;
  /** Icon-only button: the label stays for screen readers and as a tooltip. */
  hideLabel?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);

  async function copy() {
    window.clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      timer.current = window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
    }
  }

  const copied = status === "copied";
  const message = copied ? copiedLabel : status === "failed" ? failedMessage : "";

  return (
    <>
      <button
        type="button"
        title={hideLabel ? (copied ? copiedLabel : label) : undefined}
        className={copied && copiedClassName ? copiedClassName : className}
        onClick={copy}
      >
        {copied ? (
          <CheckIcon size={iconSize} weight="bold" aria-hidden />
        ) : (
          <CopyIcon size={iconSize} weight="bold" aria-hidden />
        )}
        <span className={hideLabel ? "sr-only" : undefined}>{copied ? copiedLabel : label}</span>
      </button>
      <span aria-live="polite" className={status === "failed" ? statusClassName : "sr-only"}>
        {message}
      </span>
    </>
  );
}
