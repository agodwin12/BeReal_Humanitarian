const { LegalPage, LegalPageVersion, User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized } = require("../utils/localized");
const { sanitizeLocalizedRichText } = require("../utils/sanitize");
const { LEGAL_SLUGS } = require("../config/content");

const VERSION_INCLUDES = [{ model: User, as: "createdBy", attributes: ["id", "name"] }];
const TITLES = { "privacy-policy": "Privacy Policy", terms: "Terms & Website Disclaimer" };

const isDirty = (row) => Boolean(row.draftUpdatedAt && (!row.publishedAt || row.draftUpdatedAt > row.publishedAt));

function serialize(row, versions = []) {
  const plain = row.get({ plain: true });
  return {
    ...plain,
    label: TITLES[row.slug] || row.slug,
    hasUnpublishedChanges: isDirty(row),
    isPublished: row.version > 0,
    versions: versions.map((v) => ({ id: v.id, version: v.version, effectiveDate: v.effectiveDate, createdAt: v.createdAt, createdBy: v.createdBy ? { id: v.createdBy.id, name: v.createdBy.name } : null })),
  };
}

async function load(slug) {
  if (!LEGAL_SLUGS.includes(slug)) throw ApiError.notFound("Unknown legal page");
  const [row] = await LegalPage.findOrCreate({
    where: { slug },
    defaults: { title: { en: TITLES[slug], fr: "", es: "" }, body: { en: "", fr: "", es: "" }, publishedTitle: {}, publishedBody: {}, version: 0 },
  });
  return row;
}

const versionsOf = (row) => LegalPageVersion.findAll({ where: { legalPageId: row.id }, include: VERSION_INCLUDES, order: [["version", "DESC"]], limit: 50 });

exports.list = asyncHandler(async (req, res) => {
  const rows = [];
  for (const slug of LEGAL_SLUGS) rows.push(serialize(await load(slug)));
  return ok(res, rows);
});

exports.show = asyncHandler(async (req, res) => {
  const row = await load(req.params.slug);
  return ok(res, serialize(row, await versionsOf(row)));
});

exports.saveDraft = asyncHandler(async (req, res) => {
  const row = await load(req.params.slug);
  if (req.body.title !== undefined) row.title = normalizeLocalized(req.body.title);
  if (req.body.body !== undefined) row.body = sanitizeLocalizedRichText(normalizeLocalized(req.body.body, { trim: false }));
  if (req.body.effectiveDate !== undefined) row.effectiveDate = req.body.effectiveDate || null;
  row.draftUpdatedAt = new Date();
  await row.save();
  await audit.record(req, { action: "legal.draft_saved", entity: "legal_page", entityId: row.slug });
  return ok(res, serialize(row, await versionsOf(row)));
});

exports.publish = asyncHandler(async (req, res) => {
  const row = await load(req.params.slug);
  if (!row.title?.en || !row.body?.en) throw ApiError.badRequest("Add at least the English title and text before publishing");
  if (!row.effectiveDate) throw ApiError.badRequest("Set the effective date before publishing", [{ field: "effectiveDate", message: "Effective date is required" }]);

  await LegalPage.sequelize.transaction(async (transaction) => {
    row.version += 1;
    row.publishedTitle = row.title;
    row.publishedBody = row.body;
    row.publishedEffectiveDate = row.effectiveDate;
    row.publishedAt = new Date();
    row.publishedById = req.user.id;
    row.draftUpdatedAt = row.publishedAt;
    await row.save({ transaction });
    await LegalPageVersion.create(
      { legalPageId: row.id, version: row.version, title: row.title, body: row.body, effectiveDate: row.effectiveDate, createdById: req.user.id },
      { transaction },
    );
  });
  await audit.record(req, { action: "legal.published", entity: "legal_page", entityId: row.slug, meta: { version: row.version } });
  return ok(res, serialize(row, await versionsOf(row)));
});

exports.version = asyncHandler(async (req, res) => {
  const row = await load(req.params.slug);
  const version = await LegalPageVersion.findOne({ where: { id: req.params.versionId, legalPageId: row.id }, include: VERSION_INCLUDES });
  if (!version) throw ApiError.notFound("Version not found");
  return ok(res, version.get({ plain: true }));
});

exports.restore = asyncHandler(async (req, res) => {
  const row = await load(req.params.slug);
  const version = await LegalPageVersion.findOne({ where: { id: req.params.versionId, legalPageId: row.id } });
  if (!version) throw ApiError.notFound("Version not found");
  row.title = version.title;
  row.body = version.body;
  row.effectiveDate = version.effectiveDate;
  row.draftUpdatedAt = new Date();
  await row.save();
  await audit.record(req, { action: "legal.version_restored", entity: "legal_page", entityId: row.slug, meta: { version: version.version } });
  return ok(res, serialize(row, await versionsOf(row)));
});

exports.load = load;
exports.TITLES = TITLES;
