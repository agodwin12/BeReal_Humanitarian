import { defineRouting } from "next-intl/routing";

// English is the source language; French and Spanish are full translations
// (spec Section 07). Every page exists under /en, /fr and /es.
export const routing = defineRouting({
  locales: ["en", "fr", "es"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
