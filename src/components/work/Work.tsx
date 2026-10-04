"use client";

import type { CSSProperties, ReactNode } from "react";
import { byFormat, formatLine, shortTools, type PortfolioItem } from "@/lib/content";
import { useItems } from "@/lib/content-context";
import { ShortsRail } from "./ShortsRail";
import { WorkMedia } from "./WorkMedia";

const GAP_PX = 24;
/** Narrowest a vertical short may get before the timeline wraps (px). */
const MIN_SHORT_W = 170;
/** Most pieces the single-row timeline holds; past this the work is grouped by format. */
const TIMELINE_MAX = { longForms: 1, shorts: 4 };

/** Width per unit of height for an item's frame. */
function ratio(item: PortfolioItem) {
  return item.aspect === "16:9" ? 16 / 9 : 9 / 16;
}

/** "A", "A and B", "A, B and C". */
function joinAnd(list: string[]) {
  if (list.length < 2) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function toolNames(item: PortfolioItem) {
  return item.tools.map((t) => t.replace(/^Adobe /, ""));
}

/** Clamp long text to fit the card; the full text shows on hover or keyboard focus. */
const EXPAND =
  "group-hover/card:line-clamp-none group-focus-within/card:line-clamp-none md:group-hover/card:line-clamp-none md:group-focus-within/card:line-clamp-none";

function Caption({ item, heading: Heading }: { item: PortfolioItem; heading: "h3" | "h4" }) {
  const long = item.format === "long-form";
  const tools = item.tools.length
    ? long
      ? ` Edited in ${joinAnd(toolNames(item))}.`
      : ` ${shortTools(item)}.`
    : "";
  return (
    <div className="min-w-0">
      <Heading
        title={item.label}
        className={`line-clamp-2 font-display leading-tight font-bold tracking-[-0.02em] text-balance md:line-clamp-1 ${
          long ? "text-[clamp(1.375rem,2.1vw,2.125rem)]" : "text-[clamp(1.125rem,1.45vw,1.625rem)]"
        } ${EXPAND}`}
      >
        {item.label}
      </Heading>
      <p className={`mt-1 line-clamp-2 text-sm leading-normal text-muted md:mt-1.5 md:text-[clamp(0.875rem,0.95vw,1rem)] ${EXPAND}`}>
        {formatLine(item)}.{tools}
      </p>
      {item.categories.length > 0 && (
        <p className={`mt-0.5 line-clamp-1 text-sm leading-normal text-muted md:text-[clamp(0.875rem,0.95vw,1rem)] ${EXPAND}`}>
          {item.categories.join(", ")}
        </p>
      )}
    </div>
  );
}

function Card({ item, heading = "h3" }: { item: PortfolioItem; heading?: "h3" | "h4" }) {
  return (
    <article className="group/card flex flex-col gap-3.5 md:gap-4">
      <WorkMedia item={item} />
      <Caption item={item} heading={heading} />
    </article>
  );
}

/** One format's block in the grouped layout, with its own small heading. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 md:gap-7">
      <h3 id={id} className="font-display text-[clamp(1.25rem,1.8vw,1.75rem)] font-bold tracking-[-0.02em]">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Work, laid out like clips on an editing timeline: every piece keeps its
 * true frame (9:16 or 16:9) and all frames in a row share one height, so
 * the row always fills the width exactly with no dead gaps. From 1280px all
 * pieces sit on one row; between 768 and 1280 the long-form takes its own
 * row and the shorts share the next; phones get the long-form, then a snap
 * rail of shorts. Past TIMELINE_MAX the timeline would get crowded, so the
 * work is grouped instead: a "Long-form" grid of 16:9 frames, then a
 * "Shorts" grid of 9:16 frames, both filled straight from content/vasant.json.
 */
export function Work() {
  const { longForms, shorts } = byFormat(useItems());
  const grouped = longForms.length > TIMELINE_MAX.longForms || shorts.length > TIMELINE_MAX.shorts;
  const ordered = [...longForms, ...shorts];
  const ratioSum = ordered.reduce((sum, item) => sum + ratio(item), 0);
  const gaps = (ordered.length - 1) * GAP_PX;
  // One-row height: the exact height at which every frame fits the width.
  // Never below the height that keeps a short at MIN_SHORT_W wide.
  const minH = Math.round((MIN_SHORT_W * 16) / 9);
  const rowHeight = `max(${minH}px, calc((100cqw - ${gaps + 2}px) / ${ratioSum.toFixed(4)}))`;

  return (
    <section
      id="work"
      aria-labelledby="work-title"
      className="mx-auto max-w-[1440px] px-4 py-14 md:px-16 md:py-[clamp(4rem,10dvh,7.5rem)]"
    >
      <h2 id="work-title" className="mb-7 font-display text-headline font-extrabold md:mb-[clamp(1.5rem,5dvh,3.5rem)]">
        Work
      </h2>

      {/* Phones: long-form first, then the shorts rail. */}
      <div className="flex flex-col gap-10 md:hidden">
        {grouped ? (
          <>
            {longForms.length > 0 && (
              <Group id="work-long-m" title="Long-form">
                {longForms.map((item) => (
                  <Card key={item.id} item={item} heading="h4" />
                ))}
              </Group>
            )}
            {shorts.length > 0 && (
              <Group id="work-shorts-m" title="Shorts">
                <ShortsRail>
                  {shorts.map((item) => (
                    <li key={item.id} className="w-[272px] shrink-0 snap-start">
                      <Card item={item} heading="h4" />
                    </li>
                  ))}
                </ShortsRail>
              </Group>
            )}
          </>
        ) : (
          <>
            {longForms.map((item) => (
              <Card key={item.id} item={item} />
            ))}
            {shorts.length > 0 && (
              <ShortsRail>
                {shorts.map((item) => (
                  <li key={item.id} className="w-[272px] shrink-0 snap-start">
                    <Card item={item} />
                  </li>
                ))}
              </ShortsRail>
            )}
          </>
        )}
      </div>

      {/* Tablet and up, many pieces: grouped by format. */}
      {grouped && (
        <div className="hidden flex-col gap-[clamp(3rem,8dvh,5rem)] md:flex">
          {longForms.length > 0 && (
            <Group id="work-long" title="Long-form">
              <ul role="list" className="grid grid-cols-2 gap-x-6 gap-y-12">
                {longForms.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <Card item={item} heading="h4" />
                  </li>
                ))}
              </ul>
            </Group>
          )}
          {shorts.length > 0 && (
            <Group id="work-shorts" title="Shorts">
              <ul role="list" className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-12 xl:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
                {shorts.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <Card item={item} heading="h4" />
                  </li>
                ))}
              </ul>
            </Group>
          )}
        </div>
      )}

      {/* Tablet and up, few pieces: the justified timeline. */}
      <div className={grouped ? "hidden" : "hidden [container-type:inline-size] md:block"}>
        <ul role="list" className="-mb-12 flex flex-wrap gap-x-6" style={{ "--row-h": rowHeight } as CSSProperties}>
          {ordered.map((item, index) => {
            const r = ratio(item);
            const breakAfter = index === longForms.length - 1 && shorts.length > 0;
            return [
              <li
                key={item.id}
                className="min-w-0 pb-12"
                style={{
                  flexGrow: r,
                  flexBasis: `calc(${r.toFixed(4)} * var(--row-h))`,
                  // A lone frame on a short row never grows taller than the screen.
                  maxWidth: `calc(${r.toFixed(4)} * 82dvh)`,
                }}
              >
                <Card item={item} />
              </li>,
              breakAfter ? (
                <li key={`${item.id}-break`} aria-hidden="true" className="h-0 basis-full min-[1280px]:hidden" />
              ) : null,
            ];
          })}
        </ul>
      </div>
    </section>
  );
}
