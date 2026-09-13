const fs = require("fs");
const path = require("path");

const { contentSeedDir } = require("../config/env");
const { LOCALES, NAV_ITEMS, PAGE_SLUGS, LEGAL_SLUGS } = require("../config/content");
const { PAGES, defaultSections } = require("../config/pageSchema");
const { SiteSetting, Program, TeamMember, ImpactMetric, Page, LegalPage } = require("../models");

// First-run content. Everything comes from the site's launch copy (the
// message files snapshotted in backend/seed/messages) — nothing invented.
// Each block only runs while its table is empty, so it is safe at every start.

function loadMessages() {
  const messages = {};
  for (const locale of LOCALES) {
    const file = path.join(contentSeedDir, `${locale}.json`);
    messages[locale] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  }
  return messages;
}

function get(obj, keyPath) {
  return keyPath.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

const localized = (messages, keyPath) => Object.fromEntries(LOCALES.map((l) => [l, String(get(messages[l], keyPath) ?? get(messages.en, keyPath) ?? "")]));

const PROGRAM_SEED = [
  { slug: "health-and-hope", icon: "heart-pulse", tint: "lavender" },
  { slug: "care", icon: "hand-heart", tint: "coral" },
  { slug: "empowerment", icon: "graduation-cap", tint: "lavender" },
  { slug: "faith-and-community-outreach", icon: "users", tint: "coral" },
];

const TEAM_SEED = [
  { name: "Desmond Nkemzi", roleKey: "founder" },
  { name: "Christian Fohtung", roleKey: "treasurer" },
  { name: "Joel Nyaghu", roleKey: "secretary" },
  { name: "Mildred Fomengia", roleKey: "director" },
  { name: "Pst Joan Emeadi", roleKey: "counselor" },
];

const METRIC_SEED = [
  { key: "people", icon: "users" },
  { key: "supplies", icon: "package" },
  { key: "communities", icon: "map-pin" },
  { key: "volunteers", icon: "clock" },
  { key: "spending", icon: "wallet" },
];

async function ensureContentDefaults() {
  const messages = loadMessages();

  if ((await SiteSetting.count()) === 0) {
    await SiteSetting.create({
      id: 1,
      legalName: get(messages.en, "Brand.legalName") || "Be Real Humanitarian Works Inc.",
      shortName: get(messages.en, "Brand.name") || "Be Real",
      tagline: localized(messages, "Brand.tagline"),
      statusLine: localized(messages, "Brand.statusLine"),
      neutralityStatement: localized(messages, "Footer.political"),
      fiscalYear: localized(messages, "About.facts.fiscalYearValue"),
      ein: "42-4496023",
      showEin: true,
      // Public email and phone are [TO CONFIRM] in the brief — left empty.
      contactEmail: null,
      contactPhone: null,
      addressLine: "Greater Houston Area, Texas",
      addressNote: localized(messages, "ContactPage.details.mailingNote"),
      socialLinks: [{ platform: "facebook", url: "https://www.facebook.com/share/17zNHepmRv/" }],
      navigation: NAV_ITEMS.map((item) => ({ ...item, visible: true })),
      donateEnabled: true,
      donateDisabledMessage: { en: "", fr: "", es: "" },
      enabledLocales: [...LOCALES],
      seoDescription: localized(messages, "Meta.description"),
      brandPrimary: "#5626a6",
      brandAccent: "#f26058",
    });
    console.log("[seed] site settings created");
  }

  if ((await Program.count()) === 0) {
    for (const [index, seed] of PROGRAM_SEED.entries()) {
      const focusItems = Object.fromEntries(
        LOCALES.map((l) => [l, ["item1", "item2", "item3", "item4"].map((k) => get(messages[l], `ProgramsPage.programs.${seed.slug}.${k}`)).filter(Boolean)]),
      );
      await Program.create({
        slug: seed.slug,
        order: index,
        visible: true,
        icon: seed.icon,
        tint: seed.tint,
        name: localized(messages, `ProgramsPage.programs.${seed.slug}.name`),
        cardLine1: localized(messages, `Programs.items.${seed.slug}.line1`),
        cardLine2: localized(messages, `Programs.items.${seed.slug}.line2`),
        summary: localized(messages, `Programs.items.${seed.slug}.purpose`),
        purpose: localized(messages, `ProgramsPage.programs.${seed.slug}.purpose`),
        focusItems,
      });
    }
    console.log("[seed] programs created");
  }

  if ((await TeamMember.count()) === 0) {
    for (const [index, seed] of TEAM_SEED.entries()) {
      await TeamMember.create({
        order: index,
        visible: true,
        name: seed.name,
        role: localized(messages, `About.leadership.roles.${seed.roleKey}`),
        bio: { en: "", fr: "", es: "" },
      });
    }
    console.log("[seed] team members created");
  }

  if ((await ImpactMetric.count()) === 0) {
    for (const [index, seed] of METRIC_SEED.entries()) {
      await ImpactMetric.create({
        key: seed.key,
        order: index,
        icon: seed.icon,
        label: localized(messages, `ImpactPage.metrics.items.${seed.key}`),
        value: null,
        published: false,
      });
    }
    console.log("[seed] impact metrics created");
  }

  for (const slug of PAGE_SLUGS) {
    const schema = PAGES.find((p) => p.slug === slug);
    const empty = { messages: {}, images: {}, sections: schema ? defaultSections(schema) : [] };
    await Page.findOrCreate({ where: { slug }, defaults: { draft: empty, published: empty } });
  }

  for (const slug of LEGAL_SLUGS) {
    const title = localized(messages, slug === "privacy-policy" ? "Nav.privacy" : "Nav.terms");
    await LegalPage.findOrCreate({
      where: { slug },
      defaults: { title, body: { en: "", fr: "", es: "" }, publishedTitle: title, publishedBody: { en: "", fr: "", es: "" }, version: 0 },
    });
  }
}

module.exports = { ensureContentDefaults, loadMessages };
