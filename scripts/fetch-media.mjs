// Re-fetches fresh signed media URLs from the Malloy public API and downloads
// them into media-src/ (originals, gitignored). Signed CloudFront URLs expire,
// so they are never stored in source; only the local copies are referenced.
// Usage: node scripts/fetch-media.mjs
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://api.malloy.sg/api/v1/cave/public/listing/editor/vasantgawade";
const OUT = "media-src";

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function findKey(obj, key) {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in obj && typeof obj[key] === "string") return obj[key];
  for (const v of Object.values(obj)) {
    const hit = findKey(v, key);
    if (hit) return hit;
  }
  return undefined;
}

const ext = (url) => new URL(url).pathname.split(".").pop().toLowerCase();

async function download(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(OUT, name), buf);
  console.log(`${name}\t${(buf.length / 1048576).toFixed(2)} MB`);
}

const content = JSON.parse(await readFile("content/vasant.json", "utf8"));
const profile = await getJson(`${API}/`);
const portfolios = await getJson(`${API}/portfolios/?limit=50&offset=0`);
const apiItems = portfolios.data.items;

await mkdir(OUT, { recursive: true });

const photo = findKey(profile, "profile_picture");
await download(photo, `profile.${ext(photo)}`);

for (const item of content.items) {
  const api = apiItems.find((p) => p.id === item.malloyId);
  if (!api) throw new Error(`Item ${item.id} (${item.malloyId}) missing from API`);
  await download(api.portfolio_cover, `cover-${item.id}.${ext(api.portfolio_cover)}`);
  if (item.source.type === "mp4") {
    await download(api.portfolio_link, `reel-${item.id}.mp4`);
  }
}
