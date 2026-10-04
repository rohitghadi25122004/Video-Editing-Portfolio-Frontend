import data from "../../content/vasant.json";

export type Aspect = "16:9" | "9:16";
export type Format = "long-form" | "short";

export type DriveSource = { type: "drive"; embedUrl: string };
export type Mp4Source = { type: "mp4"; src: string; loopSrc?: string };
export type ItemSource = DriveSource | Mp4Source;

/** Mirrors itemSchema in backend/src/schema.ts. Keep both in step. */
export type PortfolioItem = {
  id: string;
  /** Only on items imported from Malloy. */
  malloyId?: string | null;
  format: Format;
  aspect: Aspect;
  label: string;
  description: string | null;
  categories: string[];
  language: string | null;
  tools: string[];
  source: ItemSource;
  cover: string;
  /** Width and height of the cover file in public/media. */
  coverSize: { width: number; height: number };
  /** Measured from the local MP4 file; null when unknown (Drive). */
  durationSeconds: number | null;
  /** Reserved for future caption files. Never fabricated. */
  captionsVtt: string | null;
  approved: boolean;
};

export type Profile = {
  name: string;
  role: string;
  country: string;
  language: string;
  availableForWork: boolean;
  bio: string;
  photo: string;
  software: string[];
  aiTools: string[];
  contact: {
    email: string;
    instagram: { handle: string; url: string };
    discord: string;
    malloy: string;
  };
};

export type Content = { profile: Profile; items: PortfolioItem[] };

const content = data as Content;

export const profile: Profile = content.profile;
export const items: PortfolioItem[] = content.items;

/** The hero piece: the approved (admin "Hero") MP4, else the first MP4. */
export function pickHero(list: PortfolioItem[]): PortfolioItem | undefined {
  return list.find((i) => i.approved && i.source.type === "mp4") ?? list.find((i) => i.source.type === "mp4") ?? list[0];
}

/** Built-in hero, used for the server-rendered poster and the muted loop. */
export const heroItem: PortfolioItem = pickHero(items)!;

/** Long-form and shorts, each in list order. */
export function byFormat(list: PortfolioItem[]) {
  return {
    longForms: list.filter((i) => i.format === "long-form"),
    shorts: list.filter((i) => i.format === "short"),
  };
}

/**
 * Keeps only well-formed items from the backend's GET /api/content. Returns
 * null when the response carries no list at all (backend not seeded yet).
 */
export function parseItems(value: unknown): PortfolioItem[] | null {
  if (!Array.isArray(value)) return null;
  const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  return value.filter((v): v is PortfolioItem => {
    const i = v as Partial<PortfolioItem> | null;
    if (!i || !isText(i.id) || !isText(i.label) || !isText(i.cover)) return false;
    if (i.format !== "short" && i.format !== "long-form") return false;
    if (i.aspect !== "9:16" && i.aspect !== "16:9") return false;
    if (!Array.isArray(i.categories) || !Array.isArray(i.tools)) return false;
    if (!i.coverSize || !(i.coverSize.width > 0) || !(i.coverSize.height > 0)) return false;
    const src = i.source;
    return (src?.type === "mp4" && isText(src.src)) || (src?.type === "drive" && isText(src.embedUrl));
  });
}

/** "0:15" style readout from seconds. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Plain-language format line, e.g. "Vertical short in Hindi". */
export function formatLine(item: PortfolioItem): string {
  const shape = item.format === "short" ? "Vertical short" : "Horizontal 16:9 long-form";
  return item.language ? `${shape} in ${item.language}` : shape;
}

/** Tools without the "Adobe " prefix for compact captions. */
export function shortTools(item: PortfolioItem): string {
  return item.tools.map((t) => t.replace(/^Adobe /, "")).join(", ");
}
