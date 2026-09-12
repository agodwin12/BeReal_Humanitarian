const { Op } = require("sequelize");

const { Donation, DonationEvent, StripeEvent } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { toCsv } = require("../utils/csv");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const donations = require("../services/donations.service");
const receipts = require("../services/receipts.service");
const stripe = require("../services/stripe.service");

const EVENTS = { model: DonationEvent, as: "events" };

function serialize(row) {
  const plain = row.get({ plain: true });
  delete plain.ip;
  delete plain.userAgent;
  return {
    ...plain,
    netCents: row.netCents(),
    stripeUrl: row.provider === "stripe" && row.providerPaymentIntentId ? stripe.dashboardUrl(`payments/${row.providerPaymentIntentId}`) : null,
    events: (row.events || []).map((e) => ({ id: e.id, type: e.type, data: e.data, actorName: e.actorName, createdAt: e.createdAt })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  };
}

function buildWhere(query) {
  const { q, status, from, to, locale, min, max, year } = query;
  const where = {};
  if (status && status !== "all") where.status = status === "paid_any" ? { [Op.in]: donations.PAID_STATUSES } : status;
  if (locale) where.locale = locale;
  if (min) where.amountCents = { ...(where.amountCents || {}), [Op.gte]: Number(min) };
  if (max) where.amountCents = { ...(where.amountCents || {}), [Op.lte]: Number(max) };
  if (year) {
    where.paidAt = { [Op.gte]: new Date(Number(year), 0, 1), [Op.lt]: new Date(Number(year) + 1, 0, 1) };
  } else if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59.999Z`);
  }
  if (q) {
    where[Op.or] = [
      { donorName: { [Op.iLike]: `%${q}%` } },
      { donorEmail: { [Op.iLike]: `%${q}%` } },
      { receiptNumber: { [Op.iLike]: `%${q}%` } },
      { providerSessionId: { [Op.iLike]: `%${q}%` } },
      { providerPaymentIntentId: { [Op.iLike]: `%${q}%` } },
    ];
  }
  return where;
}

exports.summary = asyncHandler(async (req, res) => ok(res, await donations.summary({ year: req.query.year })));

exports.list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query, { defaultSize: 25, maxSize: 100 });
  const { rows, count } = await Donation.findAndCountAll({ where: buildWhere(req.query), include: [EVENTS], distinct: true, order: [["createdAt", "DESC"]], offset: pagination.offset, limit: pagination.limit });
  return ok(res, rows.map(serialize), 200, paginationMeta(pagination, count));
});

async function load(id) {
  const row = await Donation.findByPk(id, { include: [EVENTS] });
  if (!row) throw ApiError.notFound("Donation not found");
  return row;
}

exports.show = asyncHandler(async (req, res) => ok(res, serialize(await load(req.params.id))));

exports.update = asyncHandler(async (req, res) => {
  const row = await load(req.params.id);
  const before = { note: row.note, anonymous: row.anonymous };
  if (req.body.note !== undefined) row.note = req.body.note ? String(req.body.note).trim() : null;
  if (req.body.anonymous !== undefined) row.anonymous = Boolean(req.body.anonymous);
  await row.save();
  await donations.addEvent(row, "note_updated", { note: row.note, anonymous: row.anonymous }, req.user.name);
  await audit.record(req, { action: "donations.updated", entity: "donation", entityId: row.id, before, after: { note: row.note, anonymous: row.anonymous } });
  return ok(res, serialize(await load(row.id)));
});

exports.resendReceipt = asyncHandler(async (req, res) => {
  const row = await load(req.params.id);
  if (!row.receiptNumber) throw ApiError.badRequest("This donation has no receipt yet (not paid)");
  await receipts.sendReceipt(row, await donations.getSettings(), { resent: true, actorName: req.user.name });
  await audit.record(req, { action: "donations.receipt_resent", entity: "donation", entityId: row.id, meta: { to: row.donorEmail } });
  return ok(res, serialize(await load(row.id)));
});

exports.receiptPdf = asyncHandler(async (req, res) => {
  const row = await load(req.params.id);
  if (!row.receiptNumber) throw ApiError.badRequest("This donation has no receipt yet (not paid)");
  const { pdf, filename } = await receipts.renderReceipt(row, await donations.getSettings());
  await audit.record(req, { action: "donations.receipt_downloaded", entity: "donation", entityId: row.id });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(pdf);
});

exports.exportCsv = asyncHandler(async (req, res) => {
  const where = buildWhere({ ...req.query, status: req.query.status || "paid_any" });
  const rows = await Donation.findAll({ where, order: [["paidAt", "DESC"], ["createdAt", "DESC"]] });
  const money = (c) => (c === null || c === undefined ? "" : (c / 100).toFixed(2));
  const columns = [
    { label: "Receipt", value: "receiptNumber" },
    { label: "Paid at", value: (r) => (r.paidAt ? r.paidAt.toISOString() : "") },
    { label: "Status", value: "status" },
    { label: "Donor", value: "donorName" },
    { label: "Email", value: "donorEmail" },
    { label: "Amount", value: (r) => money(r.amountCents) },
    { label: "Fee", value: (r) => money(r.feeCents) },
    { label: "Refunded", value: (r) => money(r.refundedCents) },
    { label: "Net", value: (r) => money(r.netCents()) },
    { label: "Currency", value: (r) => r.currency.toUpperCase() },
    { label: "Language", value: "locale" },
    { label: "Anonymous", value: (r) => (r.anonymous ? "yes" : "no") },
    { label: "Message", value: "message" },
    { label: "Source page", value: "sourcePage" },
    { label: "Provider", value: "provider" },
    { label: "Session", value: "providerSessionId" },
    { label: "Payment intent", value: "providerPaymentIntentId" },
    { label: "Created at", value: (r) => r.createdAt.toISOString() },
  ];
  await audit.record(req, { action: "donations.exported", entity: "donation", meta: { count: rows.length, year: req.query.year || null } });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="donations-${req.query.year || new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(toCsv(columns, rows));
});

// Everything one donor gave, by email — never card data (Stripe holds that).
exports.donor = asyncHandler(async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) throw ApiError.badRequest("email is required");
  const rows = await Donation.findAll({ where: { donorEmail: email }, include: [EVENTS], order: [["createdAt", "DESC"]] });
  const paid = rows.filter((r) => donations.PAID_STATUSES.includes(r.status));
  return ok(res, {
    email,
    names: [...new Set(rows.map((r) => r.donorName))],
    gifts: paid.length,
    grossCents: paid.reduce((n, r) => n + r.amountCents, 0),
    netCents: paid.reduce((n, r) => n + r.netCents(), 0),
    firstGiftAt: paid.length ? paid[paid.length - 1].paidAt : null,
    lastGiftAt: paid.length ? paid[0].paidAt : null,
    donations: rows.map(serialize),
  });
});

exports.stripeEvents = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query, { defaultSize: 50, maxSize: 200 });
  const { rows, count } = await StripeEvent.findAndCountAll({ order: [["createdAt", "DESC"]], offset: pagination.offset, limit: pagination.limit });
  return ok(res, rows, 200, paginationMeta(pagination, count));
});

exports.serialize = serialize;
