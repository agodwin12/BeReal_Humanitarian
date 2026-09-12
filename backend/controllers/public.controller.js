// Read-only endpoints the public website renders from. No auth; short public
// cache. Draft content is served only with the shared preview secret.
const { previewSecret } = require("../config/env");
const { LOCALES } = require("../config/content");
const { PAGES, getPageSchema } = require("../config/pageSchema");
const { Page, Program, TeamMember, ImpactMetric, ImpactStory, StewardshipUpdate } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const { mediaSummary } = require("../utils/localized");
const settings = require("./siteSettings.controller");
const programs = require("./programs.controller");
const team = require("./teamMembers.controller");
const legal = require("./legalPages.controller");
const pages = require("./pages.controller");

function wantsDraft(req) {
  if (req.query.draft !== "1") return false;
  if (!previewSecret || req.get("x-preview-token") !== previewSecret) throw ApiError.forbidden("Preview token missing or invalid");
  return true;
}

function cache(res, draft) {
  res.setHeader("Cache-Control", draft ? "no-store" : "public, max-age=30, stale-while-revalidate=300");
}

exports.siteSettings = asyncHandler(async (req, res) => {
  cache(res, false);
  const row = await settings.load();
  const data = settings.serialize(row);
  delete data.updatedById;
  return ok(res, data);
});

// Flat { "Hero.title": "…" } map of every published override for a locale.
exports.messages = asyncHandler(async (req, res) => {
  const locale = LOCALES.includes(req.params.locale) ? req.params.locale : "en";
  const draft = wantsDraft(req);
  cache(res, draft);
  const rows = await Page.findAll();
  const merged = {};
  for (const page of rows) {
    const schema = getPageSchema(page.slug);
    if (!schema) continue;
    const content = pages.normalizeContent(schema, draft ? page.draft : page.published);
    Object.assign(merged, content.messages[locale] || {});
  }
  return ok(res, { locale, messages: merged });
});

exports.page = asyncHandler(async (req, res) => {
  const schema = getPageSchema(req.params.slug);
  if (!schema) throw ApiError.notFound("Unknown page");
  const draft = wantsDraft(req);
  cache(res, draft);
  const page = await Page.findOne({ where: { slug: schema.slug } });
  const content = pages.normalizeContent(schema, page ? (draft ? page.draft : page.published) : {});
  return ok(res, { slug: schema.slug, sections: content.sections, images: await pages.resolveImages(content.images) });
});

exports.programs = asyncHandler(async (req, res) => {
  cache(res, false);
  const rows = await Program.findAll({ where: { visible: true }, include: programs.INCLUDES, order: [["order", "ASC"], ["id", "ASC"]] });
  return ok(
    res,
    rows.map((row) => {
      const p = programs.serialize(row);
      return { id: p.id, slug: p.slug, icon: p.icon, tint: p.tint, name: p.name, cardLine1: p.cardLine1, cardLine2: p.cardLine2, summary: p.summary, purpose: p.purpose, focusItems: p.focusItems, cardMedia: p.cardMedia, detailMedia: p.detailMedia };
    }),
  );
});

// Photos are exposed only once the person approved publication.
exports.team = asyncHandler(async (req, res) => {
  cache(res, false);
  const rows = await TeamMember.findAll({ where: { visible: true }, include: team.INCLUDES, order: [["order", "ASC"], ["id", "ASC"]] });
  return ok(
    res,
    rows.map((row) => ({ id: row.id, name: row.name, role: row.role, bio: row.bio, photo: row.photoApprovedAt ? mediaSummary(row.photo) : null })),
  );
});

exports.impact = asyncHandler(async (req, res) => {
  cache(res, false);
  const metrics = await ImpactMetric.findAll({ order: [["order", "ASC"], ["id", "ASC"]] });
  const stories = await ImpactStory.findAll({ where: { status: "published", consentConfirmed: true }, include: [{ association: "media" }], order: [["order", "ASC"], ["publishedAt", "DESC"]] });
  const updates = await StewardshipUpdate.findAll({ where: { status: "published" }, order: [["date", "DESC"], ["id", "DESC"]] });
  return ok(res, {
    metrics: metrics.map((m) => ({ key: m.key, icon: m.icon, label: m.label, value: m.published ? m.value : null, documentedOn: m.published ? m.documentedOn : null })),
    stories: stories.map((s) => ({ id: s.id, title: s.title, body: s.body, media: mediaSummary(s.media), publishedAt: s.publishedAt })),
    updates: updates.map((u) => ({ id: u.id, date: u.date, title: u.title, body: u.body })),
  });
});

exports.legal = asyncHandler(async (req, res) => {
  const draft = wantsDraft(req);
  cache(res, draft);
  const row = await legal.load(req.params.slug);
  const title = draft ? row.title : row.publishedTitle;
  const body = draft ? row.body : row.publishedBody;
  return ok(res, {
    slug: row.slug,
    title: title || {},
    body: body || {},
    effectiveDate: draft ? row.effectiveDate : row.publishedEffectiveDate,
    version: row.version,
    publishedAt: row.publishedAt,
    isPublished: draft ? Boolean(row.body?.en) : row.version > 0,
  });
});

exports.schema = asyncHandler(async (req, res) => {
  cache(res, false);
  return ok(res, { locales: LOCALES, pages: PAGES });
});
