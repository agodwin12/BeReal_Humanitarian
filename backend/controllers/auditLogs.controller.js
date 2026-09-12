const { Op } = require("sequelize");

const { AuditLog, User } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const { parsePagination, paginationMeta } = require("../utils/pagination");

// GET /api/audit-logs?userId=&entity=&action=&from=&to=&q=&page=&pageSize=
exports.list = asyncHandler(async (req, res) => {
  const { userId, entity, action, from, to, q } = req.query;
  const where = {};
  if (userId) where.userId = Number(userId);
  if (entity) where.entity = entity;
  if (action) where.action = { [Op.iLike]: `${action}%` };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }
  if (q) {
    where[Op.or] = [
      { actorName: { [Op.iLike]: `%${q}%` } },
      { action: { [Op.iLike]: `%${q}%` } },
      { entityId: { [Op.iLike]: `%${q}%` } },
    ];
  }

  const pagination = parsePagination(req.query, { defaultSize: 50, maxSize: 200 });
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: "actor", attributes: ["id", "name", "email"] }],
    order: [["createdAt", "DESC"]],
    offset: pagination.offset,
    limit: pagination.limit,
  });
  return ok(res, rows, 200, paginationMeta(pagination, count));
});

// Distinct action names, for the filter dropdown.
exports.actions = asyncHandler(async (req, res) => {
  const rows = await AuditLog.findAll({
    attributes: [[AuditLog.sequelize.fn("DISTINCT", AuditLog.sequelize.col("action")), "action"]],
    order: [["action", "ASC"]],
    raw: true,
  });
  return ok(res, rows.map((r) => r.action));
});
