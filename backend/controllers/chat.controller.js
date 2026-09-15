const { Op } = require("sequelize");

const { ChatSession, ChatMessage, SiteSetting } = require("../models");
const { gemini } = require("../config/env");
const { LOCALES } = require("../config/content");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, normalizeLocalizedList } = require("../utils/localized");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const chat = require("../services/chat.service");

// ---- Public (website) -------------------------------------------------------------

exports.config = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30");
  const locale = LOCALES.includes(req.query.locale) ? req.query.locale : "en";
  return ok(res, await chat.publicConfig(locale));
});

exports.message = asyncHandler(async (req, res) => {
  const result = await chat.reply({
    sessionKey: req.body.sessionKey,
    locale: req.body.locale,
    page: req.body.page,
    messages: req.body.messages,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result);
});

// ---- Staff: settings ----------------------------------------------------------------

function serializeSettings(row) {
  return {
    ...row.get({ plain: true }),
    gemini: { configured: chat.isConfigured(), model: gemini.model },
  };
}

exports.getSettings = asyncHandler(async (req, res) => ok(res, serializeSettings(await chat.getSettings())));

exports.updateSettings = asyncHandler(async (req, res) => {
  const row = await chat.getSettings();
  const before = row.get({ plain: true });
  if (req.body.enabled !== undefined) row.enabled = Boolean(req.body.enabled);
  if (req.body.assistantName !== undefined) {
    const name = String(req.body.assistantName).trim().slice(0, 80);
    if (!name) throw ApiError.badRequest("Give the assistant a name", [{ field: "assistantName", message: "Required" }]);
    row.assistantName = name;
  }
  if (req.body.welcome !== undefined) {
    const welcome = normalizeLocalized(req.body.welcome);
    if (!welcome.en) throw ApiError.badRequest("Welcome message (English) is required", [{ field: "welcome", message: "English text is required" }]);
    row.welcome = welcome;
  }
  if (req.body.suggestedQuestions !== undefined) {
    const list = normalizeLocalizedList(req.body.suggestedQuestions);
    for (const locale of LOCALES) list[locale] = list[locale].slice(0, 6).map((q) => q.slice(0, 120));
    row.suggestedQuestions = list;
  }
  if (req.body.extraKnowledge !== undefined) {
    const extra = normalizeLocalized(req.body.extraKnowledge, { trim: true });
    for (const locale of LOCALES) extra[locale] = extra[locale].slice(0, 4000);
    row.extraKnowledge = extra;
  }
  if (req.body.maxMessagesPerSession !== undefined) row.maxMessagesPerSession = Number(req.body.maxMessagesPerSession);
  row.updatedById = req.user.id;
  await row.save();
  chat.invalidateFacts();
  await audit.record(req, { action: "chat.settings.updated", entity: "chat_settings", entityId: 1, before, after: row.get({ plain: true }) });
  return ok(res, serializeSettings(row));
});

// Sends one test question through the real pipeline (no session stored).
exports.preview = asyncHandler(async (req, res) => {
  if (!chat.isConfigured()) throw new ApiError(503, "GEMINI_API_KEY is not configured on the API");
  const locale = LOCALES.includes(req.body.locale) ? req.body.locale : "en";
  const settings = await chat.getSettings();
  const facts = await chat.loadFacts(locale);
  const site = await SiteSetting.findByPk(1);
  const system = chat.systemPrompt({ name: settings.assistantName, locale, facts, siteName: site?.legalName || "Be Real Humanitarian Works Inc." });
  // reply() would store a session; the preview calls the model directly instead (same retry on 429).
  const started = Date.now();
  try {
    const { text, model } = await chat.askGemini({ system, history: [{ role: "user", content: String(req.body.question).slice(0, 1500) }] });
    return ok(res, { reply: text, model, latencyMs: Date.now() - started });
  } catch (error) {
    throw new ApiError(error.status === 429 ? 503 : 502, error.status === 429 ? "Gemini quota reached for the moment (free tier: about ten requests per minute). Try again in a minute." : error.message);
  }
});

// ---- Staff: conversations -------------------------------------------------------------

exports.listSessions = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query, { defaultSize: 25, maxSize: 100 });
  const where = {};
  if (req.query.locale && LOCALES.includes(req.query.locale)) where.locale = req.query.locale;
  if (req.query.q) where[Op.or] = [{ page: { [Op.iLike]: `%${req.query.q}%` } }, { sessionKey: { [Op.iLike]: `%${req.query.q}%` } }];
  const { rows, count } = await ChatSession.findAndCountAll({ where, order: [["lastMessageAt", "DESC NULLS LAST"], ["id", "DESC"]], offset: pagination.offset, limit: pagination.limit });
  // First visitor message as a preview, in one query.
  const ids = rows.map((r) => r.id);
  const firsts = ids.length ? await ChatMessage.findAll({ where: { sessionId: ids, role: "user" }, order: [["id", "ASC"]] }) : [];
  const previewBySession = {};
  for (const m of firsts) if (!previewBySession[m.sessionId]) previewBySession[m.sessionId] = m.content.slice(0, 140);
  const errorCounts = ids.length ? await ChatMessage.count({ where: { sessionId: ids, error: { [Op.ne]: null } }, group: ["sessionId"] }) : [];
  const errorsBySession = Object.fromEntries(errorCounts.map((r) => [r.sessionId, Number(r.count)]));
  return ok(
    res,
    rows.map((r) => ({ ...r.get({ plain: true }), ipHash: undefined, preview: previewBySession[r.id] || "", errors: errorsBySession[r.id] || 0 })),
    200,
    paginationMeta(pagination, count),
  );
});

exports.showSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findByPk(req.params.id);
  if (!session) throw ApiError.notFound("Conversation not found");
  const messages = await ChatMessage.findAll({ where: { sessionId: session.id }, order: [["id", "ASC"]] });
  return ok(res, { ...session.get({ plain: true }), ipHash: undefined, messages: messages.map((m) => m.get({ plain: true })) });
});

exports.destroySession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findByPk(req.params.id);
  if (!session) throw ApiError.notFound("Conversation not found");
  await session.destroy();
  await audit.record(req, { action: "chat.session.deleted", entity: "chat_session", entityId: session.id });
  return ok(res, { deleted: true });
});

exports.stats = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [sessions30d, messages30d, errors30d, total] = await Promise.all([
    ChatSession.count({ where: { createdAt: { [Op.gte]: since } } }),
    ChatMessage.count({ where: { role: "user", createdAt: { [Op.gte]: since } } }),
    ChatMessage.count({ where: { error: { [Op.ne]: null }, createdAt: { [Op.gte]: since } } }),
    ChatSession.count(),
  ]);
  return ok(res, { sessions30d, messages30d, errors30d, total });
});
