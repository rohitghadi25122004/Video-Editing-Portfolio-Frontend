import Image from "next/image";
import { heroItem, profile } from "@/lib/content";
import { HeroStage } from "./HeroStage";
import { FieldReveal, Rise } from "./HeroReveal";
import { WatchWithSoundButton } from "./WatchWithSoundButton";

/*
 * Media box width, derived so the 9:16 frame never shifts and always fits:
 * - mobile: copy comes first, then the field; height 160 to 340px from what the viewport leaves
 * - md to xl: up to 360px, capped by viewport height; the control sits in the field's bottom lane
 * - xl and up: 72px side lanes keep the control beside the frame, never over it
 */
const mediaWidth = [
  "w-[calc(min(max(160px,100svh_-_470px),340px)*9/16)]",
  "md:w-[min(360px,100%,max(200px,calc((100dvh_-_288px)*9/16)))]",
  "xl:w-[min(400px,calc(100%_-_144px),max(200px,calc((100dvh_-_260px)*9/16)))]",
].join(" ");

export function Hero() {
  const [firstName, ...rest] = profile.name.split(" ");
  const lastName = rest.join(" ");
  const mailto = `mailto:${profile.contact.email}`;
  const loopSrc = heroItem.source.type === "mp4" ? heroItem.source.loopSrc : undefined;
  const offset = profile.availableForWork ? 1 : 0;

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-[1440px] gap-5 px-4 pt-2 pb-12 md:min-h-[calc(100dvh-76px)] md:grid-cols-12 md:gap-x-6 md:gap-y-0 md:px-16 md:pt-[clamp(1rem,3dvh,1.5rem)] md:pb-[clamp(1.5rem,5dvh,4rem)]"
    >
      <div className="flex flex-col gap-4 md:col-span-7 md:justify-center md:gap-[clamp(1rem,3.4dvh,2.25rem)] md:pr-4">
        {profile.availableForWork ? (
          <Rise index={0}>
            <p className="inline-flex h-8 items-center gap-2.5 rounded-pill border border-line px-3.5 text-[0.8125rem] font-medium md:h-9 md:px-4 md:text-sm">
              <span aria-hidden className="size-2 rounded-full bg-field ring-1 ring-field-ink" />
              Available for work
            </p>
          </Rise>
        ) : null}

        <Rise index={offset}>
          <h1 id="hero-title" className="font-display text-display font-extrabold">
            <span className="block">{firstName}</span>{" "}
            <span className="block">{lastName}</span>
          </h1>
        </Rise>

        <Rise index={offset + 1}>
          <p className="text-lg leading-[1.45] text-muted md:max-w-[30ch] md:text-[clamp(1.125rem,min(1.65vw,3dvh),1.5rem)] md:leading-[1.4]">
            Video editor for short-form, 3D-style edits, YouTube videos and Instagram Reels.
          </p>
        </Rise>

        <Rise index={offset + 2}>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-3">
            <a href={mailto} className="btn btn-primary max-md:h-[3.25rem] max-md:px-3 max-md:text-base">
              Email me
            </a>
            <WatchWithSoundButton
              className="max-md:h-[3.25rem] max-md:gap-2 max-md:px-3 max-md:text-base"
            />
          </div>
        </Rise>
      </div>

      <FieldReveal className="relative flex items-center justify-center rounded-field-sm bg-field p-6 [--focus:var(--field-ink)] overflow-hidden md:col-span-5 md:col-start-8 md:rounded-field md:px-6 md:pt-12 md:pb-[76px] xl:px-0 xl:py-12">
        <HeroStage
          loopSrc={loopSrc}
          mediaClassName={`aspect-[9/16] rounded-media-sm shadow-media md:rounded-media ${mediaWidth}`}
          controlClassName="right-4 bottom-4"
        >
          <Image
            src={heroItem.cover}
            width={heroItem.coverSize.width}
            height={heroItem.coverSize.height}
            sizes="(min-width: 768px) 360px, 192px"
            loading="eager"
            fetchPriority="high"
            alt={`${heroItem.label}, by ${profile.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        </HeroStage>
      </FieldReveal>
    </section>
  );
}
