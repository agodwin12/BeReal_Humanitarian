const { Media, Page, PageVersion, User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { mediaSummary } = require("../utils/localized");
const { LOCALES } = require("../config/content");
const { PAGES, getPageSchema, pageAllowsKey, defaultSections, imageSlots } = require("../config/pageSchema");

const VERSION_INCLUDES = [{ model: User, as: "createdBy", attributes: ["id", "name"] }];

const isDirty = (page) => Boolean(page.draftUpdatedAt && (!page.publishedAt || page.draftUpdatedAt > page.publishedAt));

// Draft/published content, always in the canonical shape.
function normalizeContent(schema, content) {
  const src = content || {};
  const messages = {};
  for (const locale of LOCALES) {
    messages[locale] = {};
    for (const [key, value] of Object.entries(src.messages?.[locale] || {})) {
      if (typeof value !== "string" || !pageAllowsKey(schema, key)) continue;
      if (value.trim() === "") continue; // empty override = back to the site default
      messages[locale][key] = value;
    }
  }
  const slots = imageSlots(schema).map((s) => s.slot);
  const images = {};
  for (const [slot, value] of Object.entries(src.images || {})) {
    if (slots.includes(slot) && Number.isInteger(Number(value)) && Number(value) > 0) images[slot] = Number(value);
  }
  const known = defaultSections(schema).map((s) => s.key);
  const seen = new Set();
  const sections = [];
  for (const entry of Array.isArray(src.sections) ? src.sections : []) {
    if (!known.includes(entry.key) || seen.has(entry.key)) continue;
    seen.add(entry.key);
    sections.push({ key: entry.key, visible: entry.visible !== false });
  }
  for (const key of known) if (!seen.has(key)) sections.push({ key, visible: true });
  // The hero (or any locked section) always renders first.
  const locked = schema.sections.filter((s) => s.locked).map((s) => s.key);
  sections.sort((a, b) => (locked.includes(a.key) ? -1 : 0) - (locked.includes(b.key) ? -1 : 0));
  return { messages, images, sections };
}

async function resolveImages(images) {
  const ids = [...new Set(Object.values(images || {}))];
  if (!ids.length) return {};
  const rows = await Media.findAll({ where: { id: ids } });
  const byId = new Map(rows.map((m) => [m.id, mediaSummary(m)]));
  const out = {};
  for (const [slot, id] of Object.entries(images)) if (byId.has(id)) out[slot] = byId.get(id);
  return out;
}

function summary(page, schema) {
  return {
    slug: page.slug,
    title: schema.title,
    path: schema.path,
    publishedAt: page.publishedAt,
    draftUpdatedAt: page.draftUpdatedAt,
    hasUnpublishedChanges: isDirty(page),
    overrideCount: LOCALES.reduce((n, l) => n + Object.keys(page.published?.messages?.[l] || {}).length, 0),
  };
}

async function loadPage(slug) {
  const schema = getPageSchema(slug);
  if (!schema) throw ApiError.notFound("Unknown page");
  const [page] = await Page.findOrCreate({ where: { slug }, defaults: { draft: normalizeContent(schema, {}), published: normalizeContent(schema, {}) } });
  return { page, schema };
}

exports.schema = asyncHandler(async (req, res) => ok(res, { locales: LOCALES, pages: PAGES }));

exports.list = asyncHandler(async (req, res) => {
  const rows = await Page.findAll();
  const byslug = new Map(rows.map((p) => [p.slug, p]));
  return ok(
    res,
    PAGES.map((schema) => {
      const page = byslug.get(schema.slug);
      return page ? summary(page, schema) : { slug: schema.slug, title: schema.title, path: schema.path, publishedAt: null, draftUpdatedAt: null, hasUnpublishedChanges: false, overrideCount: 0 };
    }),
  );
});

async function detail(page, schema) {
  const draft = normalizeContent(schema, page.draft);
  const published = normalizeContent(schema, page.published);
  const versions = await PageVersion.findAll({ where: { pageId: page.id }, include: VERSION_INCLUDES, order: [["createdAt", "DESC"]], limit: 25 });
  return {
    ...summary(page, schema),
    schema,
    draft,
    published,
    draftImages: await resolveImages(draft.images),
    publishedImages: await resolveImages(published.images),
    versions: versions.map((v) => ({ id: v.id, note: v.note, createdAt: v.createdAt, createdBy: v.createdBy ? { id: v.createdBy.id, name: v.createdBy.name } : null })),
  };
}

exports.show = asyncHandler(async (req, res) => {
  const { page, schema } = await loadPage(req.params.slug);
  return ok(res, await detail(page, schema));
});

exports.saveDraft = asyncHandler(async (req, res) => {
  const { page, schema } = await loadPage(req.params.slug);
  const next = normalizeContent(schema, {
    messages: req.body.messages ?? page.draft?.messages,
    images: req.body.images ?? page.draft?.images,
    sections: req.body.sections ?? page.draft?.sections,
  });
  const ids = [...new Set(Object.values(next.images))];
  if (ids.length && (await Media.count({ where: { id: ids } })) !== ids.length) throw ApiError.badRequest("One of the chosen images no longer exists");

  page.draft = next;
  page.draftUpdatedAt = new Date();
  page.draftUpdatedById = req.user.id;
  await page.save();
  await audit.record(req, { action: "pages.draft_saved", entity: "page", entityId: page.slug });
  return ok(res, await detail(page, schema));
});

exports.publish = asyncHandler(async (req, res) => {
  const { page, schema } = await loadPage(req.params.slug);
  const content = normalizeContent(schema, page.draft);
  await Page.sequelize.transaction(async (transaction) => {
    await PageVersion.create({ pageId: page.id, content, note: req.body?.note ? String(req.body.note).slice(0, 200) : null, createdById: req.user.id }, { transaction });
    page.published = content;
    page.draft = content;
    page.publishedAt = new Date();
    page.publishedById = req.user.id;
    page.draftUpdatedAt = page.publishedAt;
    await page.save({ transaction });
  });
  await audit.record(req, { action: "pages.published", entity: "page", entityId: page.slug });
  return ok(res, await detail(page, schema));
});

exports.discard = asyncHandler(async (req, res) => {
  const { page, schema } = await loadPage(req.params.slug);
  page.draft = normalizeContent(schema, page.published);
  page.draftUpdatedAt = page.publishedAt;
  await page.save();
  await audit.record(req, { action: "pages.draft_discarded", entity: "page", entityId: page.slug });
  return ok(res, await detail(page, schema));
});

exports.versions = asyncHandler(async (req, res) => {
  const { page } = await loadPage(req.params.slug);
  const rows = await PageVersion.findAll({ where: { pageId: page.id }, include: VERSION_INCLUDES, order: [["createdAt", "DESC"]], limit: 50 });
  return ok(res, rows.map((v) => ({ id: v.id, note: v.note, createdAt: v.createdAt, createdBy: v.createdBy ? { id: v.createdBy.id, name: v.createdBy.name } : null, content: v.content })));
});

// Restoring puts the old version into the draft — publish makes it live.
exports.restore = asyncHandler(async (req, res) => {
  const { page, schema } = await loadPage(req.params.slug);
  const version = await PageVersion.findOne({ where: { id: req.params.versionId, pageId: page.id } });
  if (!version) throw ApiError.notFound("Version not found");
  page.draft = normalizeContent(schema, version.content);
  page.draftUpdatedAt = new Date();
  page.draftUpdatedById = req.user.id;
  await page.save();
  await audit.record(req, { action: "pages.version_restored", entity: "page", entityId: page.slug, meta: { versionId: version.id } });
  return ok(res, await detail(page, schema));
});

exports.normalizeContent = normalizeContent;
exports.resolveImages = resolveImages;
