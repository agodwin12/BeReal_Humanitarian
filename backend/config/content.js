// Shared vocab for Phase C content. Mirrored in backoffice/src/lib/content.ts
// and used by the public site — keep the three in sync.
const LOCALES = ["en", "fr", "es"];

const PAGE_SLUGS = ["home", "about", "programs", "impact", "get-involved", "request-assistance", "contact", "donate", "global"];
const LEGAL_SLUGS = ["privacy-policy", "terms"];

// lucide icon names the public site knows how to render for a program card.
const PROGRAM_ICONS = [
  "heart-pulse",
  "hand-heart",
  "graduation-cap",
  "users",
  "hand-helping",
  "sprout",
  "home",
  "book-open",
  "stethoscope",
  "package",
];
const PROGRAM_TINTS = ["lavender", "coral"];

const METRIC_ICONS = ["users", "package", "map-pin", "clock", "wallet", "heart", "sprout", "home"];

const SOCIAL_PLATFORMS = ["facebook", "instagram", "youtube", "x", "linkedin", "tiktok", "whatsapp"];

// Header navigation entries the site can show, in their default order. Labels
// come from the Nav.* messages (translated); only order/visibility is data.
const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "impact", href: "/impact" },
  { key: "getInvolved", href: "/get-involved" },
  { key: "requestAssistance", href: "/request-assistance" },
  { key: "contact", href: "/contact" },
];

module.exports = {
  LOCALES,
  PAGE_SLUGS,
  LEGAL_SLUGS,
  PROGRAM_ICONS,
  PROGRAM_TINTS,
  METRIC_ICONS,
  SOCIAL_PLATFORMS,
  NAV_ITEMS,
};
