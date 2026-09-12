import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { getMessageOverrides } from "@/lib/cms";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

// Published edits from the backoffice Pages editor arrive as a flat
// { "Hero.title": "…" } map and are laid over the built-in copy, so a page
// keeps its default text for anything that was never edited.
function applyOverrides(base: Messages, overrides: Record<string, string>): Messages {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return base;
  const merged = structuredClone(base);
  for (const key of keys) {
    const path = key.split(".");
    let node: Record<string, unknown> = merged;
    for (const part of path.slice(0, -1)) {
      const next = node[part];
      if (typeof next !== "object" || next === null) node[part] = {};
      node = node[part] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = overrides[key];
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const base = (await import(`../messages/${locale}.json`)).default as Messages;
  const overrides = await getMessageOverrides(locale);

  return {
    locale,
    messages: applyOverrides(base, overrides),
  };
});
