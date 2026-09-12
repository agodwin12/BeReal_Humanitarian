const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { toCsv } = require("../utils/csv");
const { parseCsv } = require("../utils/csvParse");
const service = require("../services/translations.service");

const STATUSES = ["missing", "needs_review", "reviewed"];

function filterFields(fields, { page, status, locale, q }) {
  const locales = locale && locale !== "all" ? [locale] : service.TARGET_LOCALES;
  const needle = q ? String(q).toLowerCase() : "";
  return fields.filter((field) => {
    if (page && page !== "all" && field.page !== page) return false;
    if (status && status !== "all" && !locales.some((l) => field[l].status === status)) return false;
    if (needle) {
      const haystack = [field.label, field.section, field.key, field.en, ...locales.map((l) => field[l].text)].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

// GET /api/translations?page=&status=&locale=&q=
exports.list = asyncHandler(async (req, res) => {
  const { fields, summary, source } = await service.listFields();
  const filtered = filterFields(fields, req.query);
  return ok(res, { fields: filtered, summary, source, total: fields.length });
});

exports.summary = asyncHandler(async (req, res) => {
  const { summary, source } = await service.listFields();
  return ok(res, { summary, source });
});

// PUT /api/translations/:id { locale, text }
exports.update = asyncHandler(async (req, res) => {
  const { locale, text } = req.body;
  await service.applyText(req.params.id, locale, text);
  await audit.record(req, { action: "translations.updated", entity: "translation", entityId: req.params.id, meta: { locale } });
  const { fields } = await service.listFields();
  const field = fields.find((f) => f.id === req.params.id);
  return ok(res, field);
});

// POST /api/translations/:id/review { locale, reviewed }
exports.review = asyncHandler(async (req, res) => {
  const { locale, reviewed } = req.body;
  await service.setReview(req.params.id, locale, Boolean(reviewed), req.user);
  await audit.record(req, { action: reviewed ? "translations.reviewed" : "translations.review_removed", entity: "translation", entityId: req.params.id, meta: { locale } });
  const { fields } = await service.listFields();
  return ok(res, fields.find((f) => f.id === req.params.id));
});

// GET /api/translations/export?locale=fr&page=&status=  → translator worksheet
exports.exportCsv = asyncHandler(async (req, res) => {
  const locale = service.TARGET_LOCALES.includes(req.query.locale) ? req.query.locale : "fr";
  const { fields } = await service.listFields();
  const rows = filterFields(fields, { ...req.query, locale });
  const columns = [
    { label: "id", value: "id" },
    { label: "page", value: "pageTitle" },
    { label: "section", value: "section" },
    { label: "field", value: "label" },
    { label: "en", value: "en" },
    { label: locale, value: (r) => r[locale].text },
    { label: "status", value: (r) => r[locale].status },
    { label: "reviewed_by", value: (r) => r[locale].reviewedBy || "" },
  ];
  await audit.record(req, { action: "translations.exported", entity: "translation", meta: { locale, count: rows.length } });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="translations-${locale}-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(toCsv(columns, rows));
});

// POST /api/translations/import (multipart "file") — a worksheet coming back
// from a translator. Columns: id + fr and/or es. Unchanged cells are skipped.
exports.importCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a CSV file");
  const { header, rows } = parseCsv(req.file.buffer.toString("utf8"));
  const locales = service.TARGET_LOCALES.filter((l) => header.includes(l));
  if (!header.includes("id") || locales.length === 0) throw ApiError.badRequest("The CSV needs an “id” column and an “fr” and/or “es” column");

  const { fields } = await service.listFields();
  const byId = new Map(fields.map((f) => [f.id, f]));
  const report = { applied: 0, unchanged: 0, unknown: 0, errors: [] };
  for (const row of rows) {
    const field = byId.get(String(row.id || "").trim());
    if (!field) {
      report.unknown += 1;
      continue;
    }
    for (const locale of locales) {
      const text = row[locale] ?? "";
      if (text.trim() === field[locale].text.trim()) {
        report.unchanged += 1;
        continue;
      }
      try {
        await service.applyText(field.id, locale, text);
        report.applied += 1;
      } catch (error) {
        report.errors.push(`${field.id} (${locale}): ${error.message}`);
      }
    }
  }
  await audit.record(req, { action: "translations.imported", entity: "translation", meta: { ...report, errors: report.errors.length, locales } });
  return ok(res, report);
});

exports.STATUSES = STATUSES;
