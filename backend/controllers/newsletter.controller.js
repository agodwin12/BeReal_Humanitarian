const { Op } = require("sequelize");

const { NewsletterSubscriber } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { toCsv } = require("../utils/csv");
const { parsePagination, paginationMeta } = require("../utils/pagination");

exports.list = asyncHandler(async (req, res) => {
  const { status = "all", q } = req.query;
  const where = {};
  if (status !== "all") where.status = status;
  if (q) where.email = { [Op.iLike]: `%${q}%` };

  const pagination = parsePagination(req.query, { defaultSize: 50, maxSize: 200 });
  const { rows, count } = await NewsletterSubscriber.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset: pagination.offset,
    limit: pagination.limit,
  });
  return ok(res, rows.map((s) => s.toSafeJSON()), 200, paginationMeta(pagination, count));
});

exports.counts = asyncHandler(async (req, res) => {
  const subscribed = await NewsletterSubscriber.count({ where: { status: "subscribed" } });
  const unsubscribed = await NewsletterSubscriber.count({ where: { status: "unsubscribed" } });
  return ok(res, { subscribed, unsubscribed });
});

exports.unsubscribe = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.findByPk(req.params.id);
  if (!subscriber) throw ApiError.notFound("Subscriber not found");
  if (subscriber.status === "unsubscribed") throw ApiError.badRequest("Already unsubscribed");
  subscriber.status = "unsubscribed";
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();
  await audit.record(req, { action: "newsletter.unsubscribed_by_staff", entity: "subscriber", entityId: subscriber.id, meta: { email: subscriber.email } });
  return ok(res, subscriber.toSafeJSON());
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const { status = "subscribed" } = req.query;
  const where = status === "all" ? {} : { status };
  const rows = await NewsletterSubscriber.findAll({ where, order: [["createdAt", "DESC"]] });
  const columns = [
    { label: "Email", value: "email" },
    { label: "Language", value: "locale" },
    { label: "Status", value: "status" },
    { label: "Consent at", value: (r) => (r.consentAt ? r.consentAt.toISOString() : "") },
    { label: "Unsubscribed at", value: (r) => (r.unsubscribedAt ? r.unsubscribedAt.toISOString() : "") },
    { label: "Source page", value: "sourcePage" },
  ];
  await audit.record(req, { action: "newsletter.exported", entity: "subscriber", meta: { status, count: rows.length } });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="newsletter-${status}-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(toCsv(columns, rows));
});
