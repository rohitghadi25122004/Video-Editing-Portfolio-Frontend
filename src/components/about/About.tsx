import Image from "next/image";
import { CutIn } from "@/components/shared/CutIn";
import { profile } from "@/lib/content";
import { WorkLanguages } from "./WorkLanguages";

function ToolGroup({ label, tools }: { label: string; tools: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[13px] font-semibold md:text-sm">{label}</h3>
      <ul className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <li key={tool} className="pill-tag px-3.5 text-[15px] md:px-[18px] md:text-base">
            {tool}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * About: one chartreuse field (ink on chartreuse in both themes).
 * Mobile order: heading, portrait, bio, tools. Desktop: portrait in
 * columns 1 to 4, heading and copy in columns 6 to 12.
 */
export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="pb-14 md:pb-[clamp(4rem,10dvh,7.5rem)]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        {/* Sized against the viewport height too, so the whole card fits one screen below the nav. */}
        <div className="flex flex-col gap-[22px] rounded-field-sm bg-field px-5 py-7 text-field-ink md:grid md:grid-cols-12 md:grid-rows-[auto_1fr] md:items-start md:gap-x-6 md:gap-y-[clamp(1rem,3dvh,2rem)] md:rounded-field md:p-[clamp(1.75rem,min(4.5vw,6dvh),4.5rem)]">
          <h2
            id="about-title"
            className="font-display text-headline font-extrabold md:col-span-7 md:col-start-6 md:row-start-1"
          >
            About
          </h2>

          <CutIn className="md:col-span-4 md:col-start-1 md:row-span-2 md:row-start-1">
            <Image
              src={profile.photo}
              alt="Portrait of Vasant Gawade"
              width={800}
              height={800}
              sizes="(min-width: 768px) 30vw, 100vw"
              className="aspect-[4/5] h-auto w-full rounded-media-sm object-cover md:max-w-[calc((100dvh-14rem)*4/5)] md:rounded-media"
            />
          </CutIn>

          <div className="flex flex-col gap-[22px] md:col-span-7 md:col-start-6 md:row-start-2 md:gap-[clamp(1rem,3.4dvh,2rem)]">
            <p className="max-w-[40ch] text-lg leading-[1.5] md:text-[clamp(1rem,min(1.45vw,2.75dvh),1.5rem)]">{profile.bio}</p>

            <div className="flex flex-col gap-5 md:gap-[clamp(0.875rem,2.4dvh,1.5rem)]">
              <ToolGroup label="Editing software" tools={profile.software} />
              <ToolGroup label="AI tools" tools={profile.aiTools} />
            </div>

            <p className="text-sm md:text-[15px]">
              Based in {profile.country}.<WorkLanguages />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
