const fs = require("fs");
const { Op } = require("sequelize");

const env = require("../config/env");
const pkg = require("../package.json");
const { umzug } = require("../db/migrate");
const models = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const storage = require("../services/storage.service");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const { sequelize, Media, EmailLog, AuditLog } = models;
const since24h = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

// Health of the pieces behind the site, for the System screen (Super Admin).
exports.status = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  let database = { ok: false, latencyMs: null, sizeBytes: null, name: env.db.name };
  try {
    await sequelize.query("SELECT 1");
    const [[row]] = await sequelize.query("SELECT pg_database_size(current_database()) AS size");
    database = { ok: true, latencyMs: Date.now() - startedAt, sizeBytes: Number(row.size), name: env.db.name };
  } catch (error) {
    database.error = error.message;
  }

  const executed = (await umzug.executed()).map((m) => m.name);
  const pending = (await umzug.pending()).map((m) => m.name);

  const mediaCount = await Media.count();
  const mediaBytes = Number((await Media.sum("size")) || 0);

  const emailCounts = await EmailLog.findAll({
    attributes: ["status", [sequelize.fn("COUNT", "*"), "count"]],
    where: { createdAt: { [Op.gte]: since24h() } },
    group: ["status"],
    raw: true,
  });
  const lastEmail = await EmailLog.findOne({ order: [["createdAt", "DESC"]] });

  const auditCount = await AuditLog.count({ where: { createdAt: { [Op.gte]: since24h() } } });
  const lastAudit = await AuditLog.findOne({ order: [["createdAt", "DESC"]], attributes: ["action", "createdAt"] });

  let backup = { configured: false };
  const backupPath = process.env.BACKUP_STATUS_PATH || "";
  if (backupPath && fs.existsSync(backupPath)) {
    try {
      backup = { configured: true, ...JSON.parse(fs.readFileSync(backupPath, "utf8")) };
    } catch (error) {
      backup = { configured: true, error: `Could not read ${backupPath}: ${error.message}` };
    }
  }

  return ok(res, {
    api: { version: pkg.version, env: env.nodeEnv, node: process.version, uptimeSeconds: Math.round(process.uptime()), startedAt: new Date(Date.now() - process.uptime() * 1000), siteUrl: env.siteUrl, backofficeUrl: env.backofficeUrl },
    database,
    migrations: { applied: executed, pending },
    storage: { driver: storage.driver, mediaCount, mediaBytes, r2Bucket: env.r2.bucket || null },
    email: {
      provider: env.resend.apiKey ? "resend" : "console",
      configured: Boolean(env.resend.apiKey),
      from: env.resend.fromEmail,
      last24h: Object.fromEntries(emailCounts.map((r) => [r.status, Number(r.count)])),
      lastAt: lastEmail?.createdAt ?? null,
    },
    turnstile: { configured: Boolean(env.turnstile.secretKey) },
    preview: { configured: Boolean(env.previewSecret) },
    stripe: {
      mode: require("../services/stripe.service").mode(),
      configured: Boolean(env.stripe.secretKey),
      webhookConfigured: Boolean(env.stripe.webhookSecret),
      eventCount: await models.StripeEvent.count(),
      lastEventAt: (await models.StripeEvent.findOne({ order: [["createdAt", "DESC"]] }))?.createdAt ?? null,
    },
    backup,
    audit: { last24h: auditCount, lastAction: lastAudit?.action ?? null, lastAt: lastAudit?.createdAt ?? null },
  });
});

// GET /api/system/email-logs?status=&q=&page=
exports.emailLogs = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const where = {};
  if (status && status !== "all") where.status = status;
  if (q) where[Op.or] = [{ to: { [Op.iLike]: `%${q}%` } }, { subject: { [Op.iLike]: `%${q}%` } }, { kind: { [Op.iLike]: `%${q}%` } }];
  const pagination = parsePagination(req.query, { defaultSize: 50, maxSize: 200 });
  const { rows, count } = await EmailLog.findAndCountAll({ where, order: [["createdAt", "DESC"]], offset: pagination.offset, limit: pagination.limit });
  return ok(res, rows, 200, paginationMeta(pagination, count));
});

// GET /api/system/export — every content table as one JSON file (a manual
// backup a Super Admin can download any time).
exports.exportContent = asyncHandler(async (req, res) => {
  const plain = (rows) => rows.map((r) => r.get({ plain: true }));
  const payload = {
    exportedAt: new Date().toISOString(),
    apiVersion: pkg.version,
    siteSettings: plain(await models.SiteSetting.findAll()),
    media: plain(await models.Media.findAll()),
    programs: plain(await models.Program.findAll()),
    teamMembers: plain(await models.TeamMember.findAll()),
    impactMetrics: plain(await models.ImpactMetric.findAll()),
    impactStories: plain(await models.ImpactStory.findAll()),
    stewardshipUpdates: plain(await models.StewardshipUpdate.findAll()),
    pages: plain(await models.Page.findAll()),
    pageVersions: plain(await models.PageVersion.findAll()),
    legalPages: plain(await models.LegalPage.findAll()),
    legalPageVersions: plain(await models.LegalPageVersion.findAll()),
    notificationSettings: plain(await models.NotificationSetting.findAll()),
    translationReviews: plain(await models.TranslationReview.findAll()),
  };
  await audit.record(req, { action: "system.content_exported", entity: "system" });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="be-real-content-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.send(JSON.stringify(payload, null, 2));
});
