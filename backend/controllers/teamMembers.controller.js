const { Media, TeamMember } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, mediaSummary } = require("../utils/localized");

const INCLUDES = [{ model: Media, as: "photo" }];

function serialize(row) {
  const plain = row.get({ plain: true });
  return { ...plain, photo: mediaSummary(row.photo) };
}

async function apply(row, body) {
  for (const field of ["name", "order", "visible"]) if (body[field] !== undefined) row[field] = body[field];
  for (const field of ["role", "bio"]) if (body[field] !== undefined) row[field] = normalizeLocalized(body[field]);
  if (body.photoMediaId !== undefined && body.photoMediaId !== row.photoMediaId) {
    if (body.photoMediaId && !(await Media.findByPk(body.photoMediaId))) throw ApiError.badRequest("photoMediaId: media not found");
    row.photoMediaId = body.photoMediaId;
    // A new photo needs a fresh approval from the person (brief rule).
    row.photoApprovedAt = null;
    row.photoApprovedBy = null;
  }
}

const ordered = () => TeamMember.findAll({ include: INCLUDES, order: [["order", "ASC"], ["id", "ASC"]] });

exports.list = asyncHandler(async (req, res) => ok(res, (await ordered()).map(serialize)));

exports.create = asyncHandler(async (req, res) => {
  const row = TeamMember.build({ order: (await TeamMember.max("order")) + 1 || 0, role: { en: "", fr: "", es: "" }, bio: { en: "", fr: "", es: "" } });
  await apply(row, req.body);
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "team.created", entity: "team_member", entityId: row.id, after: serialize(row) });
  return ok(res, serialize(row), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const row = await TeamMember.findByPk(req.params.id, { include: INCLUDES });
  if (!row) throw ApiError.notFound("Team member not found");
  const before = serialize(row);
  await apply(row, req.body);
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "team.updated", entity: "team_member", entityId: row.id, before, after: serialize(row) });
  return ok(res, serialize(row));
});

exports.destroy = asyncHandler(async (req, res) => {
  const row = await TeamMember.findByPk(req.params.id);
  if (!row) throw ApiError.notFound("Team member not found");
  const before = row.get({ plain: true });
  await row.destroy();
  await audit.record(req, { action: "team.deleted", entity: "team_member", entityId: before.id, before });
  return ok(res, { deleted: true });
});

exports.reorder = asyncHandler(async (req, res) => {
  const ids = req.body.ids.map(Number);
  await TeamMember.sequelize.transaction(async (transaction) => {
    for (const [index, id] of ids.entries()) await TeamMember.update({ order: index }, { where: { id }, transaction });
  });
  await audit.record(req, { action: "team.reordered", entity: "team_member", meta: { ids } });
  return ok(res, (await ordered()).map(serialize));
});

exports.approvePhoto = asyncHandler(async (req, res) => {
  const row = await TeamMember.findByPk(req.params.id, { include: INCLUDES });
  if (!row) throw ApiError.notFound("Team member not found");
  if (!row.photoMediaId) throw ApiError.badRequest("Add a photo before recording its approval");
  row.photoApprovedAt = new Date();
  row.photoApprovedBy = req.body.approvedBy;
  await row.save();
  await audit.record(req, { action: "team.photo_approved", entity: "team_member", entityId: row.id, meta: { approvedBy: row.photoApprovedBy } });
  return ok(res, serialize(row));
});

exports.revokePhotoApproval = asyncHandler(async (req, res) => {
  const row = await TeamMember.findByPk(req.params.id, { include: INCLUDES });
  if (!row) throw ApiError.notFound("Team member not found");
  row.photoApprovedAt = null;
  row.photoApprovedBy = null;
  await row.save();
  await audit.record(req, { action: "team.photo_approval_revoked", entity: "team_member", entityId: row.id });
  return ok(res, serialize(row));
});

exports.serialize = serialize;
exports.INCLUDES = INCLUDES;
