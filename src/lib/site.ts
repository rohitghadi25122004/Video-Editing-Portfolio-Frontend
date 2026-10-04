import { profile } from "./content";

/**
 * Public origin used for canonical, Open Graph, sitemap and JSON-LD URLs.
 * Order: NEXT_PUBLIC_SITE_URL (set this for any host), then Vercel's
 * production domain (set automatically on Vercel builds), then localhost
 * for local builds. A production build without either prints a warning.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[site] NEXT_PUBLIC_SITE_URL is not set: canonical and social image URLs will point at localhost. Set it before deploying.",
    );
  }
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl().replace(/\/$/, "");

export const siteTitle = `${profile.name}, ${profile.role}`;

export const siteDescription =
  "Video editor in India for short-form, 3D-style edits, YouTube videos and Instagram Reels. Watch the work and email Vasant Gawade.";
