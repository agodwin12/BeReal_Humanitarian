const { Op } = require("sequelize");

const { Media, Program, TeamMember, ImpactStory, SiteSetting, Page, User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, mediaSummary } = require("../utils/localized");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const { storeUpload, removeStored } = require("../services/media.service");
const { getPageSchema } = require("../config/pageSchema");

const UPLOADER = { model: User, as: "uploadedBy", attributes: ["id", "name"] };

function serialize(row) {
  return { ...mediaSummary(row), storage: row.storage, uploadedBy: row.uploadedBy ? { id: row.uploadedBy.id, name: row.uploadedBy.name } : null };
}

function parseJsonField(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw ApiError.badRequest("alt / caption must be JSON objects with en / fr / es");
  }
}

// Every place a media item is referenced. Used for the "where is this used"
// panel and to refuse deleting anything still in use.
async function usageOf(mediaId) {
  const id = Number(mediaId);
  const usage = [];

  const programs = await Program.findAll({ where: { [Op.or]: [{ cardMediaId: id }, { detailMediaId: id }] } });
  for (const p of programs) {
    if (p.cardMediaId === id) usage.push({ type: "program", id: p.id, label: p.name?.en || p.slug, field: "Card photo", href: "/content/programs" });
    if (p.detailMediaId === id) usage.push({ type: "program", id: p.id, label: p.name?.en || p.slug, field: "Detail photo", href: "/content/programs" });
  }

  for (const m of await TeamMember.findAll({ where: { photoMediaId: id } })) {
    usage.push({ type: "team", id: m.id, label: m.name, field: "Photo", href: "/content/team" });
  }
  for (const s of await ImpactStory.findAll({ where: { mediaId: id } })) {
    usage.push({ type: "story", id: s.id, label: s.title?.en || `Story #${s.id}`, field: "Photo", href: "/content/impact" });
  }

  const settings = await SiteSetting.findByPk(1);
  if (settings) {
    if (settings.logoMediaId === id) usage.push({ type: "settings", id: 1, label: "Site settings", field: "Logo", href: "/settings/site" });
    if (settings.faviconMediaId === id) usage.push({ type: "settings", id: 1, label: "Site settings", field: "Favicon", href: "/settings/site" });
    if (settings.shareMediaId === id) usage.push({ type: "settings", id: 1, label: "Site settings", field: "Share image", href: "/settings/site" });
  }

  for (const page of await Page.findAll()) {
    const schema = getPageSchema(page.slug);
    for (const state of ["published", "draft"]) {
      const images = page[state]?.images || {};
      for (const [slot, value] of Object.entries(images)) {
        if (Number(value) !== id) continue;
        const slotDef = schema?.sections.flatMap((s) => s.images || []).find((i) => i.slot === slot);
        usage.push({ type: "page", id: page.id, label: schema?.title || page.slug, field: `${slotDef?.label || slot} (${state})`, href: `/content/pages/${page.slug}` });
      }
    }
  }
  return usage;
}

exports.list = asyncHandler(async (req, res) => {
  const { q, kind = "all" } = req.query;
  const where = {};
  if (kind === "image") where.mimeType = { [Op.like]: "image/%" };
  if (kind === "pdf") where.mimeType = "application/pdf";
  if (q) {
    where[Op.or] = [
      { filename: { [Op.iLike]: `%${q}%` } },
      { credit: { [Op.iLike]: `%${q}%` } },
      Media.sequelize.where(Media.sequelize.cast(Media.sequelize.col("alt"), "text"), { [Op.iLike]: `%${q}%` }),
    ];
  }
  const pagination = parsePagination(req.query, { defaultSize: 40, maxSize: 120 });
  const { rows, count } = await Media.findAndCountAll({ where, include: [UPLOADER], order: [["createdAt", "DESC"]], offset: pagination.offset, limit: pagination.limit });
  return ok(res, rows.map(serialize), 200, paginationMeta(pagination, count));
});

exports.show = asyncHandler(async (req, res) => {
  const row = await Media.findByPk(req.params.id, { include: [UPLOADER] });
  if (!row) throw ApiError.notFound("Media not found");
  return ok(res, { ...serialize(row), usage: await usageOf(row.id) });
});

exports.usage = asyncHandler(async (req, res) => ok(res, await usageOf(req.params.id)));

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a file to upload");
  const alt = normalizeLocalized(parseJsonField(req.body.alt));
  if (!alt.en) throw ApiError.badRequest("Alt text (English) is required for every upload", [{ field: "alt", message: "Alt text (English) is required" }]);

  let stored;
  try {
    stored = await storeUpload(req.file);
  } catch (error) {
    throw ApiError.badRequest(error.message);
  }

  const row = await Media.create({
    ...stored,
    alt,
    caption: normalizeLocalized(parseJsonField(req.body.caption)),
    credit: req.body.credit ? String(req.body.credit).trim().slice(0, 200) : null,
    consentOnFile: req.body.consentOnFile === "true" || req.body.consentOnFile === true,
    uploadedById: req.user.id,
  });
  await row.reload({ include: [UPLOADER] });
  await audit.record(req, { action: "media.uploaded", entity: "media", entityId: row.id, after: { filename: row.filename, size: row.size, mimeType: row.mimeType } });
  return ok(res, serialize(row), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const row = await Media.findByPk(req.params.id, { include: [UPLOADER] });
  if (!row) throw ApiError.notFound("Media not found");
  const before = mediaSummary(row);

  if (req.body.alt !== undefined) {
    const alt = normalizeLocalized(req.body.alt);
    if (!alt.en) throw ApiError.badRequest("Alt text (English) is required", [{ field: "alt", message: "Alt text (English) is required" }]);
    row.alt = alt;
  }
  if (req.body.caption !== undefined) row.caption = normalizeLocalized(req.body.caption);
  if (req.body.credit !== undefined) row.credit = req.body.credit ? String(req.body.credit).trim() : null;
  if (req.body.consentOnFile !== undefined) row.consentOnFile = Boolean(req.body.consentOnFile);
  await row.save();
  await audit.record(req, { action: "media.updated", entity: "media", entityId: row.id, before, after: mediaSummary(row) });
  return ok(res, serialize(row));
});

// Replace the file behind an existing media id: every page, program or team
// member pointing at it shows the new photo at once.
exports.replaceFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a file to upload");
  const row = await Media.findByPk(req.params.id, { include: [UPLOADER] });
  if (!row) throw ApiError.notFound("Media not found");

  let stored;
  try {
    stored = await storeUpload(req.file);
  } catch (error) {
    throw ApiError.badRequest(error.message);
  }
  const old = { key: row.key, variants: row.variants };
  Object.assign(row, stored);
  await row.save();
  await removeStored(old);
  await audit.record(req, { action: "media.replaced", entity: "media", entityId: row.id, meta: { filename: row.filename } });
  return ok(res, serialize(row));
});

exports.destroy = asyncHandler(async (req, res) => {
  const row = await Media.findByPk(req.params.id);
  if (!row) throw ApiError.notFound("Media not found");
  const usage = await usageOf(row.id);
  if (usage.length) throw ApiError.conflict(`This file is still used in ${usage.length} place${usage.length === 1 ? "" : "s"}. Replace it there first.`);
  await removeStored(row);
  await row.destroy();
  await audit.record(req, { action: "media.deleted", entity: "media", entityId: row.id, before: { filename: row.filename } });
  return ok(res, { deleted: true });
});

exports.usageOf = usageOf;
