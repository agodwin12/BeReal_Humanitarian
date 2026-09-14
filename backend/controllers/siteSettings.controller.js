const { SiteSetting, Media } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, mediaSummary } = require("../utils/localized");
const { NAV_ITEMS } = require("../config/content");

const MEDIA_INCLUDES = [
  { model: Media, as: "logo" },
  { model: Media, as: "favicon" },
  { model: Media, as: "shareImage" },
];

const LOCALIZED_FIELDS = ["tagline", "statusLine", "neutralityStatement", "fiscalYear", "addressNote", "donateDisabledMessage", "seoDescription"];
const PLAIN_FIELDS = ["legalName", "shortName", "ein", "showEin", "contactEmail", "contactPhone", "addressLine", "donateEnabled", "enabledLocales", "brandPrimary", "brandAccent", "logoMediaId", "faviconMediaId", "shareMediaId"];

function serialize(row) {
  const plain = row.get({ plain: true });
  return {
    ...plain,
    logo: mediaSummary(row.logo),
    favicon: mediaSummary(row.favicon),
    shareImage: mediaSummary(row.shareImage),
    navigation: normalizeNavigation(plain.navigation),
  };
}

// Always return the full nav list in the saved order, appending any item the
// saved list does not know yet (e.g. after a deploy that adds a page).
function normalizeNavigation(saved) {
  const byKey = new Map((Array.isArray(saved) ? saved : []).map((n) => [n.key, n]));
  const ordered = [...byKey.keys()].filter((key) => NAV_ITEMS.some((n) => n.key === key));
  // A key added later (e.g. a new page) slots in after its default predecessor, not at the end.
  NAV_ITEMS.forEach((item, index) => {
    if (ordered.includes(item.key)) return;
    const prev = NAV_ITEMS.slice(0, index).map((n) => n.key).filter((k) => ordered.includes(k)).pop();
    ordered.splice(prev ? ordered.indexOf(prev) + 1 : 0, 0, item.key);
  });
  return ordered.map((key) => {
    const base = NAV_ITEMS.find((n) => n.key === key);
    return { key, href: base.href, visible: byKey.get(key)?.visible !== false };
  });
}

async function load() {
  const row = await SiteSetting.findByPk(1, { include: MEDIA_INCLUDES });
  if (!row) throw ApiError.notFound("Site settings have not been initialised");
  return row;
}

exports.get = asyncHandler(async (req, res) => ok(res, serialize(await load())));

exports.update = asyncHandler(async (req, res) => {
  const row = await load();
  const before = serialize(row);

  for (const field of PLAIN_FIELDS) {
    if (req.body[field] === undefined) continue;
    row[field] = req.body[field] === "" ? null : req.body[field];
  }
  for (const field of LOCALIZED_FIELDS) if (req.body[field] !== undefined) row[field] = normalizeLocalized(req.body[field]);
  if (req.body.socialLinks !== undefined) {
    row.socialLinks = req.body.socialLinks.map((s) => ({ platform: s.platform, url: String(s.url).trim() }));
  }
  if (req.body.navigation !== undefined) row.navigation = normalizeNavigation(req.body.navigation);
  if (req.body.enabledLocales !== undefined) row.enabledLocales = [...new Set(["en", ...req.body.enabledLocales])];

  for (const field of ["logoMediaId", "faviconMediaId", "shareMediaId"]) {
    if (row[field] && !(await Media.findByPk(row[field]))) throw ApiError.badRequest(`${field}: media not found`);
  }

  row.updatedById = req.user.id;
  await row.save();
  await row.reload({ include: MEDIA_INCLUDES });
  const after = serialize(row);
  await audit.record(req, { action: "settings.updated", entity: "site_settings", entityId: 1, before, after });
  return ok(res, after);
});

exports.serialize = serialize;
exports.load = load;
