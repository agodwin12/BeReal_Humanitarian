const { Media, Program } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, normalizeLocalizedList, mediaSummary } = require("../utils/localized");

const INCLUDES = [
  { model: Media, as: "cardMedia" },
  { model: Media, as: "detailMedia" },
];
const LOCALIZED = ["name", "cardLine1", "cardLine2", "summary", "purpose"];
const PLAIN = ["order", "visible", "icon", "tint", "cardMediaId", "detailMediaId"];

function serialize(row) {
  const plain = row.get({ plain: true });
  return { ...plain, cardMedia: mediaSummary(row.cardMedia), detailMedia: mediaSummary(row.detailMedia) };
}

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 80);

async function assertMedia(id, field) {
  if (id && !(await Media.findByPk(id))) throw ApiError.badRequest(`${field}: media not found`);
}

async function apply(row, body) {
  for (const field of PLAIN) if (body[field] !== undefined) row[field] = body[field];
  for (const field of LOCALIZED) if (body[field] !== undefined) row[field] = normalizeLocalized(body[field]);
  if (body.focusItems !== undefined) row.focusItems = normalizeLocalizedList(body.focusItems);
  if (body.slug !== undefined) row.slug = body.slug;
  await assertMedia(row.cardMediaId, "cardMediaId");
  await assertMedia(row.detailMediaId, "detailMediaId");
}

exports.list = asyncHandler(async (req, res) => {
  const rows = await Program.findAll({ include: INCLUDES, order: [["order", "ASC"], ["id", "ASC"]] });
  return ok(res, rows.map(serialize));
});

exports.create = asyncHandler(async (req, res) => {
  const row = Program.build({ order: (await Program.max("order")) + 1 || 0, focusItems: { en: [], fr: [], es: [] } });
  await apply(row, req.body);
  if (!row.slug) row.slug = slugify(row.name.en);
  if (await Program.findOne({ where: { slug: row.slug } })) throw ApiError.conflict("A program with this slug already exists");
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "programs.created", entity: "program", entityId: row.id, after: serialize(row) });
  return ok(res, serialize(row), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const row = await Program.findByPk(req.params.id, { include: INCLUDES });
  if (!row) throw ApiError.notFound("Program not found");
  const before = serialize(row);
  await apply(row, req.body);
  if (req.body.slug !== undefined && (await Program.findOne({ where: { slug: row.slug } }))?.id !== row.id) {
    if (await Program.findOne({ where: { slug: row.slug } })) throw ApiError.conflict("A program with this slug already exists");
  }
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "programs.updated", entity: "program", entityId: row.id, before, after: serialize(row) });
  return ok(res, serialize(row));
});

exports.destroy = asyncHandler(async (req, res) => {
  const row = await Program.findByPk(req.params.id);
  if (!row) throw ApiError.notFound("Program not found");
  const before = row.get({ plain: true });
  await row.destroy();
  await audit.record(req, { action: "programs.deleted", entity: "program", entityId: before.id, before });
  return ok(res, { deleted: true });
});

exports.reorder = asyncHandler(async (req, res) => {
  const ids = req.body.ids.map(Number);
  await Program.sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) await Program.update({ order: index }, { where: { id }, transaction });
  });
  await audit.record(req, { action: "programs.reordered", entity: "program", meta: { ids } });
  const rows = await Program.findAll({ include: INCLUDES, order: [["order", "ASC"], ["id", "ASC"]] });
  return ok(res, rows.map(serialize));
});

exports.serialize = serialize;
exports.INCLUDES = INCLUDES;
