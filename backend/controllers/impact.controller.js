const { Op } = require("sequelize");
const { Media, ImpactMetric, ImpactStory, Program, GalleryItem, StewardshipUpdate } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, normalizeLocalizedList, mediaSummary } = require("../utils/localized");
const { sanitizeLocalizedRichText } = require("../utils/sanitize");
const { serialize: serializeGalleryItem } = require("./gallery.controller");

const STORY_INCLUDES = [
  { model: Media, as: "media" },
  { model: Program, as: "program" },
];
const GALLERY_INCLUDES = [{ model: Media, as: "media" }];
const GALLERY_ORDER = [["happenedOn", "DESC NULLS LAST"], ["createdAt", "DESC"]];

const programSummary = (program) => (program ? { id: program.id, slug: program.slug, name: program.name } : null);

const serializeStory = (row) => ({ ...row.get({ plain: true }), media: mediaSummary(row.media), program: programSummary(row.program) });
const plain = (row) => row.get({ plain: true });

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 140);

async function uniqueSlug(base, ignoreId) {
  const root = base || "story";
  let candidate = root;
  let n = 2;
  // Small table, staff-only writes: a simple existence check per attempt is fine.
  while (await ImpactStory.findOne({ where: { slug: candidate, ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}) } })) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

const metrics = () => ImpactMetric.findAll({ order: [["order", "ASC"], ["id", "ASC"]] });
const stories = () => ImpactStory.findAll({ include: STORY_INCLUDES, order: [["order", "ASC"], ["happenedOn", "DESC NULLS LAST"], ["createdAt", "DESC"]] });
const updates = () => StewardshipUpdate.findAll({ order: [["date", "DESC"], ["id", "DESC"]] });

exports.overview = asyncHandler(async (req, res) =>
  ok(res, {
    metrics: (await metrics()).map(plain),
    stories: (await stories()).map(serializeStory),
    updates: (await updates()).map(plain),
  }),
);

// ---- Metrics: a value goes live only with a documented-on date ------------

exports.updateMetric = asyncHandler(async (req, res) => {
  const row = await ImpactMetric.findByPk(req.params.id);
  if (!row) throw ApiError.notFound("Metric not found");
  const before = plain(row);

  if (req.body.label !== undefined) row.label = normalizeLocalized(req.body.label);
  for (const field of ["icon", "order"]) if (req.body[field] !== undefined) row[field] = req.body[field];
  if (req.body.value !== undefined) row.value = req.body.value ? String(req.body.value).trim() : null;
  if (req.body.documentedOn !== undefined) row.documentedOn = req.body.documentedOn || null;
  if (req.body.sourceNote !== undefined) row.sourceNote = req.body.sourceNote ? String(req.body.sourceNote).trim() : null;
  if (req.body.published !== undefined) row.published = Boolean(req.body.published);

  if (row.published && (!row.value || !row.documentedOn)) {
    throw ApiError.badRequest("A metric can only be published with a value and the date it was documented", [
      { field: "published", message: "Add the value and its documented-on date first" },
    ]);
  }

  await row.save();
  await audit.record(req, { action: "impact.metric_updated", entity: "impact_metric", entityId: row.id, before, after: plain(row) });
  return ok(res, plain(row));
});

// ---- Stories: publishing requires the consent gate ---------------------------

async function applyStory(row, body) {
  if (body.title !== undefined) row.title = normalizeLocalized(body.title);
  if (body.purpose !== undefined) row.purpose = normalizeLocalized(body.purpose, { trim: false });
  if (body.whatWeDid !== undefined) row.whatWeDid = sanitizeLocalizedRichText(normalizeLocalized(body.whatWeDid, { trim: false }));
  if (body.summary !== undefined) row.summary = sanitizeLocalizedRichText(normalizeLocalized(body.summary, { trim: false }));
  if (body.assistanceProvided !== undefined) row.assistanceProvided = normalizeLocalizedList(body.assistanceProvided);
  if (body.peopleReachedUnit !== undefined) row.peopleReachedUnit = normalizeLocalized(body.peopleReachedUnit);
  if (body.peopleReachedCount !== undefined) row.peopleReachedCount = body.peopleReachedCount === null || body.peopleReachedCount === "" ? null : Number(body.peopleReachedCount);
  if (body.happenedOn !== undefined) row.happenedOn = body.happenedOn || null;
  if (body.location !== undefined) row.location = body.location ? String(body.location).trim().slice(0, 160) : null;
  if (body.order !== undefined) row.order = body.order;
  if (body.programId !== undefined) {
    if (body.programId && !(await Program.findByPk(body.programId))) throw ApiError.badRequest("programId: program not found");
    row.programId = body.programId || null;
  }
  if (body.mediaId !== undefined) {
    if (body.mediaId && !(await Media.findByPk(body.mediaId))) throw ApiError.badRequest("mediaId: media not found");
    row.mediaId = body.mediaId || null;
  }
  if (body.slug !== undefined && body.slug !== null) {
    const clean = slugify(body.slug);
    if (clean) row.slug = await uniqueSlug(clean, row.id);
  }
  if (!row.slug && row.title?.en) row.slug = await uniqueSlug(slugify(row.title.en), row.id);

  if (body.consentConfirmed !== undefined) {
    const confirmed = Boolean(body.consentConfirmed);
    if (confirmed && !row.consentConfirmed) {
      if (!body.consentConfirmedBy) throw ApiError.badRequest("Say who confirmed the consent", [{ field: "consentConfirmedBy", message: "Required when confirming consent" }]);
      row.consentConfirmedAt = new Date();
      row.consentConfirmedBy = body.consentConfirmedBy;
    }
    if (!confirmed) {
      row.consentConfirmedAt = null;
      row.consentConfirmedBy = null;
      row.status = "draft";
      row.publishedAt = null;
    }
    row.consentConfirmed = confirmed;
  }
}

async function loadStory(id) {
  const row = await ImpactStory.findByPk(id, { include: STORY_INCLUDES });
  if (!row) throw ApiError.notFound("Story not found");
  return row;
}

exports.createStory = asyncHandler(async (req, res) => {
  const row = ImpactStory.build({ order: (await ImpactStory.max("order")) + 1 || 0, title: { en: "", fr: "", es: "" } });
  await applyStory(row, req.body);
  await row.save();
  await row.reload({ include: STORY_INCLUDES });
  await audit.record(req, { action: "impact.story_created", entity: "impact_story", entityId: row.id, after: serializeStory(row) });
  return ok(res, serializeStory(row), 201);
});

exports.updateStory = asyncHandler(async (req, res) => {
  const row = await loadStory(req.params.id);
  const before = serializeStory(row);
  await applyStory(row, req.body);
  await row.save();
  await row.reload({ include: STORY_INCLUDES });
  await audit.record(req, { action: "impact.story_updated", entity: "impact_story", entityId: row.id, before, after: serializeStory(row) });
  return ok(res, serializeStory(row));
});

exports.publishStory = asyncHandler(async (req, res) => {
  const row = await loadStory(req.params.id);
  if (!row.consentConfirmed) throw ApiError.badRequest("Confirm the person's consent before publishing this story");
  if (!row.title?.en) throw ApiError.badRequest("Add at least the English title before publishing");
  if (!row.summary?.en && !row.whatWeDid?.en) throw ApiError.badRequest("Add at least a short summary or a “what we did” section before publishing");
  row.status = "published";
  row.publishedAt = row.publishedAt || new Date();
  await row.save();
  await audit.record(req, { action: "impact.story_published", entity: "impact_story", entityId: row.id });
  return ok(res, serializeStory(row));
});

exports.unpublishStory = asyncHandler(async (req, res) => {
  const row = await loadStory(req.params.id);
  row.status = "draft";
  await row.save();
  await audit.record(req, { action: "impact.story_unpublished", entity: "impact_story", entityId: row.id });
  return ok(res, serializeStory(row));
});

exports.destroyStory = asyncHandler(async (req, res) => {
  const row = await loadStory(req.params.id);
  const before = serializeStory(row);
  await row.destroy();
  await audit.record(req, { action: "impact.story_deleted", entity: "impact_story", entityId: before.id, before });
  return ok(res, { deleted: true });
});

// Public: one story by slug, with its Program (if any) and the Gallery items
// tagged to it (published only), newest event first.
exports.publicStory = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30");
  const row = await ImpactStory.findOne({ where: { slug: req.params.slug, status: "published" }, include: STORY_INCLUDES });
  if (!row) throw ApiError.notFound("Story not found");
  const galleryItems = await GalleryItem.findAll({ where: { impactStoryId: row.id, published: true }, include: GALLERY_INCLUDES, order: GALLERY_ORDER });
  return ok(res, {
    ...serializeStory(row),
    galleryItems: galleryItems
      .map((item) => serializeGalleryItem(item, { forPublic: true }))
      .filter((item) => (item.kind === "video" ? item.media || item.embedUrl : item.media))
      .map(({ createdAt, updatedAt, ...item }) => item),
  });
});

// ---- Stewardship updates -----------------------------------------------------

function applyUpdate(row, body) {
  if (body.date !== undefined) row.date = body.date;
  if (body.title !== undefined) row.title = normalizeLocalized(body.title);
  if (body.body !== undefined) row.body = sanitizeLocalizedRichText(normalizeLocalized(body.body, { trim: false }));
}

async function loadUpdate(id) {
  const row = await StewardshipUpdate.findByPk(id);
  if (!row) throw ApiError.notFound("Update not found");
  return row;
}

exports.createUpdate = asyncHandler(async (req, res) => {
  const row = StewardshipUpdate.build({ title: { en: "", fr: "", es: "" }, body: { en: "", fr: "", es: "" } });
  applyUpdate(row, req.body);
  await row.save();
  await audit.record(req, { action: "impact.update_created", entity: "stewardship_update", entityId: row.id, after: plain(row) });
  return ok(res, plain(row), 201);
});

exports.updateUpdate = asyncHandler(async (req, res) => {
  const row = await loadUpdate(req.params.id);
  const before = plain(row);
  applyUpdate(row, req.body);
  await row.save();
  await audit.record(req, { action: "impact.update_updated", entity: "stewardship_update", entityId: row.id, before, after: plain(row) });
  return ok(res, plain(row));
});

exports.publishUpdate = asyncHandler(async (req, res) => {
  const row = await loadUpdate(req.params.id);
  if (!row.title?.en || !row.body?.en) throw ApiError.badRequest("Add at least the English title and text before publishing");
  row.status = "published";
  row.publishedAt = row.publishedAt || new Date();
  await row.save();
  await audit.record(req, { action: "impact.update_published", entity: "stewardship_update", entityId: row.id });
  return ok(res, plain(row));
});

exports.unpublishUpdate = asyncHandler(async (req, res) => {
  const row = await loadUpdate(req.params.id);
  row.status = "draft";
  await row.save();
  await audit.record(req, { action: "impact.update_unpublished", entity: "stewardship_update", entityId: row.id });
  return ok(res, plain(row));
});

exports.destroyUpdate = asyncHandler(async (req, res) => {
  const row = await loadUpdate(req.params.id);
  const before = plain(row);
  await row.destroy();
  await audit.record(req, { action: "impact.update_deleted", entity: "stewardship_update", entityId: before.id, before });
  return ok(res, { deleted: true });
});

exports.metrics = metrics;
exports.stories = stories;
exports.updates = updates;
exports.serializeStory = serializeStory;
