import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

// Next 16 "proxy" (formerly middleware): detects the locale and redirects
// bare paths to /en, /fr or /es.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, and any request for a file (has a dot).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
