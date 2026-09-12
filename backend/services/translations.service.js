const crypto = require("crypto");

const { LOCALES } = require("../config/content");
const { PAGES, pageAllowsKey, sectionAllowsKey } = require("../config/pageSchema");
const { Page, Program, TeamMember, ImpactMetric, ImpactStory, StewardshipUpdate, LegalPage, SiteSetting, TranslationReview } = require("../models");
const ApiError = require("../utils/apiError");
const { sanitizeRichText } = require("../utils/sanitize");
const { normalizeContent } = require("../controllers/pages.controller");
const { loadSiteMessages } = require("./siteMessages");

// One "translation field" = one piece of text in English that must exist in
// French and Spanish: a website message key, or a localized column of a
// program / team member / metric / story / update / legal page / site setting.

const TARGET_LOCALES = ["fr", "es"];
const hashText = (text) => crypto.createHash("sha256").update(String(text ?? "").trim()).digest("hex");

function humanize(key) {
  const last = key.split(".").pop() ?? key;
  return last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

const ENTITY_FIELDS = {
  program: { name: "Name", cardLine1: "Card title, line 1", cardLine2: "Card title, line 2", summary: "Card summary", purpose: "Purpose", focusItems: "What this includes" },
  team: { role: "Role", bio: "Short bio" },
  metric: { label: "Label" },
  story: { title: "Title", body: "Text" },
  update: { title: "Title", body: "Text" },
  legal: { title: "Title", body: "Text" },
  settings: {
    tagline: "Tagline",
    statusLine: "Status line",
    neutralityStatement: "Political-neutrality statement",
    fiscalYear: "Fiscal year",
    addressNote: "Address note",
    donateDisabledMessage: "Message while donations are off",
    seoDescription: "Default search description",
  },
};
const RICH_FIELDS = new Set(["story:body", "update:body", "legal:body"]);
const MULTILINE_FIELDS = new Set(["program:summary", "program:purpose", "program:focusItems", "team:bio", "settings:neutralityStatement", "settings:statusLine", "settings:seoDescription"]);

const textOf = (localized, locale) => (localized && typeof localized === "object" && typeof localized[locale] === "string" ? localized[locale] : "");

async function collectFields() {
  const { messages, source } = await loadSiteMessages();
  const fields = [];
  const seen = new Set();
  const push = (field) => {
    if (seen.has(field.id)) return;
    seen.add(field.id);
    fields.push(field);
  };

  // Website copy (message keys), page by page.
  const pages = await Page.findAll();
  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  for (const schema of PAGES) {
    const page = pageBySlug.get(schema.slug);
    const published = normalizeContent(schema, page ? page.published : {});
    for (const section of schema.sections) {
      if (section.shared) continue;
      for (const key of Object.keys(messages.en)) {
        if (!pageAllowsKey(schema, key) || !sectionAllowsKey(section, key)) continue;
        const text = {};
        const origin = {};
        for (const locale of LOCALES) {
          const override = published.messages[locale]?.[key];
          text[locale] = override ?? messages[locale]?.[key] ?? "";
          origin[locale] = override ? "edited" : "built-in";
        }
        push({ id: `msg:${key}`, kind: "message", page: schema.slug, pageTitle: schema.title, section: section.title, label: humanize(key), key, text, origin, multiline: (text.en || "").length > 70, rich: false });
      }
    }
  }

  const entity = (kind, id, field, { page, pageTitle, section, value, extra }) =>
    push({
      id: `${kind}:${id}:${field}`,
      kind,
      page,
      pageTitle,
      section,
      label: ENTITY_FIELDS[kind][field],
      text: { en: textOf(value, "en"), fr: textOf(value, "fr"), es: textOf(value, "es") },
      origin: { en: "edited", fr: "edited", es: "edited" },
      multiline: MULTILINE_FIELDS.has(`${kind}:${field}`),
      rich: RICH_FIELDS.has(`${kind}:${field}`),
      ...extra,
    });

  for (const p of await Program.findAll({ order: [["order", "ASC"]] })) {
    const section = `Program · ${p.name?.en || p.slug}`;
    for (const field of Object.keys(ENTITY_FIELDS.program)) {
      const value = field === "focusItems" ? Object.fromEntries(LOCALES.map((l) => [l, (p.focusItems?.[l] ?? []).join("\n")])) : p[field];
      entity("program", p.id, field, { page: "programs", pageTitle: "Programs", section, value });
    }
  }
  for (const m of await TeamMember.findAll({ order: [["order", "ASC"]] })) {
    for (const field of Object.keys(ENTITY_FIELDS.team)) entity("team", m.id, field, { page: "about", pageTitle: "About", section: `Team · ${m.name}`, value: m[field] });
  }
  for (const m of await ImpactMetric.findAll({ order: [["order", "ASC"]] })) {
    entity("metric", m.id, "label", { page: "impact", pageTitle: "Impact", section: "Metrics", value: m.label });
  }
  for (const s of await ImpactStory.findAll({ order: [["order", "ASC"]] })) {
    for (const field of Object.keys(ENTITY_FIELDS.story)) entity("story", s.id, field, { page: "impact", pageTitle: "Impact", section: `Story · ${s.title?.en || `#${s.id}`}`, value: s[field] });
  }
  for (const u of await StewardshipUpdate.findAll({ order: [["date", "DESC"]] })) {
    for (const field of Object.keys(ENTITY_FIELDS.update)) entity("update", u.id, field, { page: "impact", pageTitle: "Impact", section: `Update · ${u.date}`, value: u[field] });
  }
  for (const l of await LegalPage.findAll()) {
    for (const field of Object.keys(ENTITY_FIELDS.legal)) {
      entity("legal", l.slug, field, { page: "legal", pageTitle: "Legal pages", section: l.title?.en || l.slug, value: l[field], extra: { note: "Edits go to the legal page draft — publish it from Legal pages." } });
    }
  }
  const settings = await SiteSetting.findByPk(1);
  if (settings) {
    for (const field of Object.keys(ENTITY_FIELDS.settings)) entity("settings", 1, field, { page: "global", pageTitle: "Global (header, footer, forms)", section: "Site settings", value: settings[field] });
  }

  return { fields, source };
}

function statusOf(text, review) {
  if (!String(text ?? "").trim()) return "missing";
  if (review && review.textHash === hashText(text)) return "reviewed";
  return "needs_review";
}

async function decorate(fields) {
  const reviews = await TranslationReview.findAll();
  const byKey = new Map(reviews.map((r) => [`${r.fieldId}|${r.locale}`, r]));
  return fields.map((field) => {
    const out = { id: field.id, kind: field.kind, page: field.page, pageTitle: field.pageTitle, section: field.section, label: field.label, key: field.key, multiline: field.multiline, rich: field.rich, note: field.note, en: field.text.en };
    for (const locale of TARGET_LOCALES) {
      const review = byKey.get(`${field.id}|${locale}`);
      const status = statusOf(field.text[locale], review);
      out[locale] = {
        text: field.text[locale],
        origin: field.origin[locale],
        status,
        reviewedBy: status === "reviewed" ? review.reviewedBy : null,
        reviewedAt: status === "reviewed" ? review.reviewedAt : null,
        staleReview: Boolean(review) && status !== "reviewed",
      };
    }
    return out;
  });
}

function summarize(decorated) {
  const empty = () => ({ total: 0, missing: 0, needs_review: 0, reviewed: 0 });
  const summary = { locales: {}, pages: {} };
  for (const locale of TARGET_LOCALES) summary.locales[locale] = empty();
  for (const field of decorated) {
    if (!summary.pages[field.page]) summary.pages[field.page] = { title: field.pageTitle, fr: empty(), es: empty() };
    for (const locale of TARGET_LOCALES) {
      const status = field[locale].status;
      summary.locales[locale].total += 1;
      summary.locales[locale][status] += 1;
      summary.pages[field.page][locale].total += 1;
      summary.pages[field.page][locale][status] += 1;
    }
  }
  return summary;
}

async function listFields() {
  const { fields, source } = await collectFields();
  const decorated = await decorate(fields);
  return { fields: decorated, summary: summarize(decorated), source };
}

async function findField(fieldId) {
  const { fields } = await collectFields();
  const field = fields.find((f) => f.id === fieldId);
  if (!field) throw ApiError.notFound("Unknown translation field");
  return field;
}

// Writes one language of one field where it lives. Message keys go straight
// to the page's published (and draft) content so the fix is live at once.
async function applyText(fieldId, locale, rawText) {
  if (!TARGET_LOCALES.includes(locale)) throw ApiError.badRequest("Only French and Spanish can be edited here");
  const [kind, ...rest] = fieldId.split(":");
  const text = String(rawText ?? "");

  if (kind === "msg") {
    const key = rest.join(":");
    const schema = PAGES.find((p) => pageAllowsKey(p, key));
    if (!schema) throw ApiError.notFound("Unknown message key");
    const [page] = await Page.findOrCreate({ where: { slug: schema.slug }, defaults: { draft: {}, published: {} } });
    for (const state of ["draft", "published"]) {
      const content = normalizeContent(schema, page[state]);
      const forLocale = { ...(content.messages[locale] || {}) };
      if (text.trim() === "") delete forLocale[key];
      else forLocale[key] = text;
      page[state] = { ...content, messages: { ...content.messages, [locale]: forLocale } };
    }
    page.changed("draft", true);
    page.changed("published", true);
    await page.save();
    return { kind, key };
  }

  const [id, field] = rest;
  const setLocalized = async (row, column, value) => {
    row[column] = { ...(row[column] || {}), [locale]: value };
    row.changed(column, true);
    await row.save();
  };

  switch (kind) {
    case "program": {
      const row = await Program.findByPk(id);
      if (!row || !ENTITY_FIELDS.program[field]) throw ApiError.notFound("Unknown program field");
      if (field === "focusItems") {
        row.focusItems = { ...(row.focusItems || {}), [locale]: text.split("\n").map((s) => s.trim()).filter(Boolean) };
        row.changed("focusItems", true);
        await row.save();
      } else await setLocalized(row, field, text);
      return { kind, id };
    }
    case "team": {
      const row = await TeamMember.findByPk(id);
      if (!row || !ENTITY_FIELDS.team[field]) throw ApiError.notFound("Unknown team field");
      await setLocalized(row, field, text);
      return { kind, id };
    }
    case "metric": {
      const row = await ImpactMetric.findByPk(id);
      if (!row || field !== "label") throw ApiError.notFound("Unknown metric field");
      await setLocalized(row, "label", text);
      return { kind, id };
    }
    case "story": {
      const row = await ImpactStory.findByPk(id);
      if (!row || !ENTITY_FIELDS.story[field]) throw ApiError.notFound("Unknown story field");
      await setLocalized(row, field, field === "body" ? sanitizeRichText(text) : text);
      return { kind, id };
    }
    case "update": {
      const row = await StewardshipUpdate.findByPk(id);
      if (!row || !ENTITY_FIELDS.update[field]) throw ApiError.notFound("Unknown update field");
      await setLocalized(row, field, field === "body" ? sanitizeRichText(text) : text);
      return { kind, id };
    }
    case "legal": {
      const row = await LegalPage.findOne({ where: { slug: id } });
      if (!row || !ENTITY_FIELDS.legal[field]) throw ApiError.notFound("Unknown legal field");
      row.draftUpdatedAt = new Date();
      await setLocalized(row, field, field === "body" ? sanitizeRichText(text) : text);
      return { kind, id };
    }
    case "settings": {
      const row = await SiteSetting.findByPk(1);
      if (!row || !ENTITY_FIELDS.settings[field]) throw ApiError.notFound("Unknown setting field");
      await setLocalized(row, field, text);
      return { kind, id: 1 };
    }
    default:
      throw ApiError.notFound("Unknown translation field");
  }
}

async function setReview(fieldId, locale, reviewed, user) {
  if (!TARGET_LOCALES.includes(locale)) throw ApiError.badRequest("Only French and Spanish are reviewed");
  const field = await findField(fieldId);
  if (!reviewed) {
    await TranslationReview.destroy({ where: { fieldId, locale } });
    return null;
  }
  if (!String(field.text[locale] || "").trim()) throw ApiError.badRequest("There is no text to review yet");
  const [row] = await TranslationReview.findOrCreate({
    where: { fieldId, locale },
    defaults: { textHash: hashText(field.text[locale]), reviewedById: user.id, reviewedBy: user.name, reviewedAt: new Date() },
  });
  row.textHash = hashText(field.text[locale]);
  row.reviewedById = user.id;
  row.reviewedBy = user.name;
  row.reviewedAt = new Date();
  await row.save();
  return row;
}

module.exports = { TARGET_LOCALES, collectFields, listFields, findField, applyText, setReview, hashText };
