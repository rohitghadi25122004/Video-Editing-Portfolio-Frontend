# Vasant Gawade, Video Editor: portfolio site

Static Next.js site (App Router, TypeScript, Tailwind v4) for video editor Vasant Gawade. It builds to plain HTML, CSS and JS (`output: "export"`), so any static host can serve it.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
```

## Build

```bash
npm run build   # static site in ./out
```

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site, used for canonical, Open Graph, sitemap and JSON-LD URLs. Not needed on Vercel. |
| `NEXT_PUBLIC_API_URL` | URL of the backend. The page loads the current video list from `GET /api/content` when it opens. Leave it empty to show only the built-in list. |

## Content

- The built-in video list is `content/vasant.json`, read through `src/lib/content.ts`.
- Web-ready media lives in `public/media/`.
- In the browser, `src/lib/content-context.tsx` swaps in the live list from the backend. Videos added in the admin panel appear without a rebuild.
- Video item fields mirror the backend schema. Change both together.
