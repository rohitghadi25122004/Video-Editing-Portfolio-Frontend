"use client";

import Image from "next/image";
import { useState } from "react";
import type { PortfolioItem } from "@/lib/content";

/**
 * Cover frame for a work card. The image sits inside a labelled button, so
 * it is decorative (empty alt). A missing or broken file falls back to a
 * calm surface with the label instead of a broken image icon.
 */
export function CoverImage({ item, sizes }: { item: PortfolioItem; sizes: string }) {
  const [broken, setBroken] = useState(!item.cover);

  if (broken) {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-end bg-surface p-5 text-left shadow-[inset_0_0_0_1px_var(--line)] md:p-6"
      >
        <span className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-muted md:text-[26px]">
          {item.label}
        </span>
      </span>
    );
  }

  return (
    <Image
      src={item.cover}
      alt=""
      fill
      sizes={sizes}
      className="object-cover"
      onError={() => setBroken(true)}
    />
  );
}
