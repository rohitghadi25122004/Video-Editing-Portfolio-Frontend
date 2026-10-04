"use client";

import { useItems } from "@/lib/content-context";

/** " Videos in Hindi and English." from the spoken languages across the live work list. */
export function WorkLanguages() {
  const langs = [...new Set(useItems().map((i) => i.language).filter((l): l is string => Boolean(l)))];
  if (langs.length === 0) return null;
  const joined = langs.length < 2 ? langs[0] : `${langs.slice(0, -1).join(", ")} and ${langs[langs.length - 1]}`;
  return <>{` Videos in ${joined}.`}</>;
}
