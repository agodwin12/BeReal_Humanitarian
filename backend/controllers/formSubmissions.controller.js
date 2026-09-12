const { Op } = require("sequelize");

const { FORM_TYPES, FORM_FIELDS, FIELD_LABELS } = require("../config/formFields");
const { FormSubmission, SubmissionNote, User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { toCsv } = require("../utils/csv");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const ASSIGNEE = { model: User, as: "assignee", attributes: ["id", "name", "email"] };

// Request Assistance is Super Admin only (spec §06); everything else Editor+.
function allowedTypes(user) {
  return user.role === "super_admin" ? FORM_TYPES : FORM_TYPES.filter((t) => t !== "assistance");
}

function assertCanAccess(user, type) {
  if (!allowedTypes(user).includes(type)) throw ApiError.forbidden("This inbox is restricted to Super Admins");
}

async function loadSubmission(req) {
  const submission = await FormSubmission.findByPk(req.params.id, {
    include: [ASSIGNEE, { model: SubmissionNote, as: "notes", include: [{ model: User, as: "author", attributes: ["id", "name"] }] }],
    order: [[{ model: SubmissionNote, as: "notes" }, "createdAt", "ASC"]],
  });
  if (!submission) throw ApiError.notFound("Submission not found");
  assertCanAccess(req.user, submission.type);
  return submission;
}

exports.list = asyncHandler(async (req, res) => {
  const { type, status = "all", spam = "false", q, assignedToId } = req.query;
  const where = { isSpam: spam === "true" };
  if (type) {
    assertCanAccess(req.user, type);
    where.type = type;
  } else {
    where.type = { [Op.in]: allowedTypes(req.user) };
  }
  if (status !== "all") where.status = status;
  if (assignedToId) where.assignedToId = Number(assignedToId);
  if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }];

  const pagination = parsePagination(req.query);
  const { rows, count } = await FormSubmission.findAndCountAll({
    where,
    include: [ASSIGNEE],
    order: [["createdAt", "DESC"]],
    offset: pagination.offset,
    limit: pagination.limit,
  });
  return ok(res, rows, 200, paginationMeta(pagination, count));
});

// New + total per type, for the sidebar badges and the dashboard.
exports.counts = asyncHandler(async (req, res) => {
  const types = allowedTypes(req.user);
  const rows = await FormSubmission.findAll({
    attributes: ["type", "status", "isSpam", [FormSubmission.sequelize.fn("COUNT", "*"), "count"]],
    where: { type: { [Op.in]: types } },
    group: ["type", "status", "isSpam"],
    raw: true,
  });
  const counts = Object.fromEntries(types.map((t) => [t, { new: 0, total: 0, spam: 0 }]));
  for (const row of rows) {
    const n = Number(row.count);
    if (row.isSpam) counts[row.type].spam += n;
    else {
      counts[row.type].total += n;
      if (row.status === "new") counts[row.type].new += n;
    }
  }
  return ok(res, counts);
});

exports.show = asyncHandler(async (req, res) => ok(res, await loadSubmission(req)));

exports.update = asyncHandler(async (req, res) => {
  const submission = await loadSubmission(req);
  const before = { status: submission.status, assignedToId: submission.assignedToId };
  const { status, assignedToId } = req.body;

  if (status) submission.status = status;
  if (assignedToId !== undefined) {
    if (assignedToId !== null) {
      const assignee = await User.findOne({ where: { id: assignedToId, status: "active" } });
      if (!assignee) throw ApiError.badRequest("Assignee must be an active user");
    }
    submission.assignedToId = assignedToId;
  }
  await submission.save();
  await submission.reload({ include: [ASSIGNEE] });

  await audit.record(req, {
    action: status && status !== before.status ? "submissions.status_changed" : "submissions.assigned",
    entity: "submission",
    entityId: submission.id,
    before,
    after: { status: submission.status, assignedToId: submission.assignedToId },
    meta: { type: submission.type },
  });
  return ok(res, submission);
});

exports.addNote = asyncHandler(async (req, res) => {
  const submission = await loadSubmission(req);
  const note = await SubmissionNote.create({
    submissionId: submission.id,
    userId: req.user.id,
    authorName: req.user.name,
    body: req.body.body,
  });
  await audit.record(req, { action: "submissions.note_added", entity: "submission", entityId: submission.id, meta: { type: submission.type } });
  return ok(res, note, 201);
});

exports.markNotSpam = asyncHandler(async (req, res) => {
  const submission = await loadSubmission(req);
  if (!submission.isSpam) throw ApiError.badRequest("This submission is not in quarantine");
  submission.isSpam = false;
  submission.spamReason = null;
  await submission.save();
  await audit.record(req, { action: "submissions.released_from_quarantine", entity: "submission", entityId: submission.id, meta: { type: submission.type } });
  return ok(res, submission);
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const { type, from, to } = req.query;
  assertCanAccess(req.user, type);
  const where = { type, isSpam: false };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }
  const rows = await FormSubmission.findAll({ where, include: [ASSIGNEE], order: [["createdAt", "DESC"]] });

  const columns = [
    { label: "ID", value: "id" },
    { label: "Received", value: (r) => r.createdAt.toISOString() },
    { label: "Status", value: "status" },
    { label: "Language", value: "locale" },
    { label: "Assigned to", value: (r) => r.assignee?.name || "" },
    ...FORM_FIELDS[type].map((key) => ({ label: FIELD_LABELS[key] || key, value: (r) => r.payload[key] })),
    { label: "Source page", value: "sourcePage" },
  ];
  await audit.record(req, { action: "submissions.exported", entity: "submission", meta: { type, count: rows.length } });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${type}-submissions-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(toCsv(columns, rows));
});
