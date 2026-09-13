// What the Pages editor can edit, page by page. Every text on the public site
// lives in the site's message files (EN source + FR/ES); the editor stores
// overrides per message key and per language. Sections map 1:1 to the
// components each page renders, so hiding/reordering here is honoured by the
// site. Photos are "image slots" with the site's built-in default.
//
// Keys managed elsewhere are deliberately absent: program copy (Programs
// screen), leadership roles (Team), metric labels (Impact), legal name /
// tagline / status line / political statement (Site settings).

const CTA_SECTION = { key: "cta", title: "Call to action band", description: "The purple “Be part of something real” band shared by several pages. Its text and photo are edited under Global.", shared: true };

const PAGES = [
  {
    slug: "home",
    title: "Home",
    path: "/",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["Hero."], images: [{ slot: "hero", label: "Hero photo", default: "/images/hero-embrace.png" }] },
      { key: "welcome", title: "Welcome", messageKeys: ["Welcome."], images: [{ slot: "welcome", label: "Welcome photo", default: "/images/welcome-family.png" }] },
      { key: "programs", title: "Programs cards", description: "The four cards come from the Programs screen; only the heading is edited here.", messageKeys: ["Programs.eyebrow", "Programs.title", "Programs.intro", "Programs.viewAll"] },
      { key: "impact", title: "Why it matters", messageKeys: ["Impact."] },
      CTA_SECTION,
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.title", "Meta.description"], seo: true },
    ],
  },
  {
    slug: "about",
    title: "About",
    path: "/about",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["About.eyebrow", "About.title", "About.lead", "About.heroImageAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/about-team-school.png" }] },
      { key: "mission", title: "Mission & vision", messageKeys: ["About.mission.", "About.vision."] },
      { key: "values", title: "Core values", messageKeys: ["About.values."] },
      { key: "faith", title: "Faith & service", messageKeys: ["About.faith."], images: [{ slot: "faith", label: "Faith & service photo", default: "/images/program-faith-outreach.png" }] },
      { key: "leadership", title: "Leadership", description: "Names, roles, bios and photos are managed on the Team screen.", messageKeys: ["About.leadership.eyebrow", "About.leadership.title", "About.leadership.intro"] },
      { key: "facts", title: "Transparency & Accountability", description: "Legal name, EIN and the public location come from Site settings.", messageKeys: ["About.facts."] },
      CTA_SECTION,
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.aboutTitle", "Meta.aboutDescription"], seo: true },
    ],
  },
  {
    slug: "programs",
    title: "Programs",
    path: "/programs",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["ProgramsPage.eyebrow", "ProgramsPage.title", "ProgramsPage.lead", "ProgramsPage.heroAlt", "ProgramsPage.quickNavLabel", "ProgramsPage.programLabel", "ProgramsPage.purposeLabel", "ProgramsPage.includesLabel"], images: [{ slot: "hero", label: "Hero photo", default: "/images/programs-hero.png" }] },
      { key: "programs", title: "Program details", description: "One block per program, managed on the Programs screen.", messageKeys: [] },
      { key: "growth", title: "Growing responsibly note", messageKeys: ["ProgramsPage.growth."] },
      CTA_SECTION,
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.programsTitle", "Meta.programsDescription"], seo: true },
    ],
  },
  {
    slug: "impact",
    title: "Impact",
    path: "/impact",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["ImpactPage.eyebrow", "ImpactPage.title", "ImpactPage.lead", "ImpactPage.heroAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/impact-hero.png" }] },
      { key: "metrics", title: "Metrics", description: "Values, dates and publish switches are on the Impact screen.", messageKeys: ["ImpactPage.metrics.eyebrow", "ImpactPage.metrics.title", "ImpactPage.metrics.intro", "ImpactPage.metrics.documentedOn"] },
      { key: "stories", title: "Stories", description: "Shown only when at least one story is published (Impact screen).", messageKeys: ["ImpactPage.stories."] },
      { key: "updates", title: "Stewardship updates", description: "Shown only when at least one update is published (Impact screen).", messageKeys: ["ImpactPage.updates."] },
      { key: "principles", title: "How we report", messageKeys: ["ImpactPage.principles."], images: [{ slot: "principles", label: "Side photo", default: "/images/welcome-family.png" }] },
      CTA_SECTION,
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.impactTitle", "Meta.impactDescription"], seo: true },
    ],
  },
  {
    slug: "get-involved",
    title: "Get Involved",
    path: "/get-involved",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["GetInvolvedPage.eyebrow", "GetInvolvedPage.title", "GetInvolvedPage.lead", "GetInvolvedPage.heroAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/cta-community.png" }] },
      { key: "ways", title: "Ways to help", messageKeys: ["GetInvolvedPage.ways."] },
      { key: "volunteerForm", title: "Volunteer form intro", messageKeys: ["GetInvolvedPage.volunteerForm."] },
      { key: "partnerForm", title: "Partnership form intro", messageKeys: ["GetInvolvedPage.partnerForm."] },
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.getInvolvedTitle", "Meta.getInvolvedDescription"], seo: true },
    ],
  },
  {
    slug: "request-assistance",
    title: "Request Assistance",
    path: "/request-assistance",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["AssistancePage.eyebrow", "AssistancePage.title", "AssistancePage.lead", "AssistancePage.heroAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/program-health-hope.png" }] },
      { key: "steps", title: "How requests are reviewed", messageKeys: ["AssistancePage.steps."] },
      { key: "form", title: "Request form intro & notices", messageKeys: ["AssistancePage.form.", "AssistancePage.emergency.", "AssistancePage.privacy."] },
      { key: "otherHelp", title: "Other ways we can help", messageKeys: ["AssistancePage.otherHelp."] },
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.assistanceTitle", "Meta.assistanceDescription"], seo: true },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    path: "/contact",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["ContactPage.eyebrow", "ContactPage.title", "ContactPage.lead", "ContactPage.heroAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/contact-hero.png" }] },
      { key: "message", title: "Contact details & message form", description: "Email, phone, address and socials come from Site settings.", messageKeys: ["ContactPage.details.", "ContactPage.form."] },
      { key: "newsletter", title: "Newsletter band", messageKeys: ["ContactPage.newsletter."] },
      CTA_SECTION,
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.contactTitle", "Meta.contactDescription"], seo: true },
    ],
  },
  {
    slug: "donate",
    title: "Donate",
    path: "/donate",
    sections: [
      { key: "hero", title: "Hero", locked: true, messageKeys: ["DonatePage.eyebrow", "DonatePage.title", "DonatePage.lead", "DonatePage.heroAlt"], images: [{ slot: "hero", label: "Hero photo", default: "/images/hero-embrace.png" }] },
      { key: "form", title: "Donation form", description: "Suggested amounts, minimum, the thank-you message and receipt wording are in Donation settings.", messageKeys: ["DonatePage.form.", "DonatePage.paused.", "DonatePage.cancelled."] },
      { key: "why", title: "Why give", messageKeys: ["DonatePage.why."] },
      { key: "thankYou", title: "Thank-you page", messageKeys: ["DonatePage.thankYou."] },
      { key: "manage", title: "Manage a monthly gift", description: "The page donors reach from the link in their monthly receipt.", messageKeys: ["DonatePage.manage."] },
      { key: "seo", title: "Search & social preview", messageKeys: ["Meta.donateTitle", "Meta.donateDescription"], seo: true },
    ],
  },
  {
    slug: "global",
    title: "Global (header, footer, forms)",
    path: null,
    sections: [
      { key: "brand", title: "Brand lockup", description: "Legal name, tagline and status line are in Site settings.", messageKeys: ["Brand.name", "Brand.sub"] },
      { key: "nav", title: "Navigation labels", messageKeys: ["Nav."] },
      { key: "footer", title: "Footer", description: "The political-neutrality statement is in Site settings.", messageKeys: ["Footer.quickLinks", "Footer.getInvolved", "Footer.connect", "Footer.together", "Footer.rights", "Footer.location"] },
      { key: "cta", title: "Call to action band", messageKeys: ["GetInvolved."], images: [{ slot: "cta", label: "Background photo", default: "/images/cta-community.png" }] },
      { key: "forms", title: "Form labels & messages", messageKeys: ["Forms."] },
      { key: "unsubscribe", title: "Unsubscribe page", messageKeys: ["Unsubscribe."] },
      { key: "legal", title: "Legal pages chrome", messageKeys: ["LegalPage."] },
      { key: "languages", title: "Language names", messageKeys: ["Languages."] },
    ],
  },
];

// Message keys that must never be overridden through the Pages editor because
// another screen owns them.
const RESERVED_PREFIXES = [
  "Programs.items.",
  "ProgramsPage.programs.",
  "About.leadership.roles.",
  "ImpactPage.metrics.items.",
  "Brand.legalName",
  "Brand.tagline",
  "Brand.statusLine",
  "Footer.political",
];

function getPageSchema(slug) {
  return PAGES.find((p) => p.slug === slug) || null;
}

function sectionAllowsKey(section, key) {
  return (section.messageKeys || []).some((prefix) => (prefix.endsWith(".") ? key.startsWith(prefix) : key === prefix));
}

// Is this message key editable on this page?
function pageAllowsKey(page, key) {
  if (RESERVED_PREFIXES.some((prefix) => (prefix.endsWith(".") ? key.startsWith(prefix) : key === prefix))) return false;
  return page.sections.some((section) => !section.shared && sectionAllowsKey(section, key));
}

function defaultSections(page) {
  return page.sections.filter((s) => !s.seo).map((s) => ({ key: s.key, visible: true }));
}

function imageSlots(page) {
  return page.sections.filter((s) => !s.shared).flatMap((s) => s.images || []);
}

module.exports = { PAGES, RESERVED_PREFIXES, getPageSchema, pageAllowsKey, sectionAllowsKey, defaultSections, imageSlots };
