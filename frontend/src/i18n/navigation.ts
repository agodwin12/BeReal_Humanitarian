import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware drop-ins for next/link + next/navigation. Every internal link
// in the site must use this Link so the /en /fr /es prefix is preserved.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
