const { LOCALES } = require("../config/content");

// Localized text = { en, fr, es } with strings (missing → "").
function normalizeLocalized(value, { trim = true } = {}) {
  const out = {};
  for (const locale of LOCALES) {
    const raw = value && typeof value === "object" ? value[locale] : undefined;
    const text = raw === undefined || raw === null ? "" : String(raw);
    out[locale] = trim ? text.trim() : text;
  }
  return out;
}

// Localized list = { en: [..], fr: [..], es: [..] } of non-empty strings.
function normalizeLocalizedList(value) {
  const out = {};
  for (const locale of LOCALES) {
    const raw = value && typeof value === "object" && Array.isArray(value[locale]) ? value[locale] : [];
    out[locale] = raw.map((s) => String(s ?? "").trim()).filter(Boolean);
  }
  return out;
}

// Value for one locale with English fallback (used for public payloads).
function pick(localized, locale) {
  if (!localized || typeof localized !== "object") return "";
  return localized[locale] || localized.en || "";
}

// Public shape of a media row (never the storage key or uploader).
function mediaSummary(media) {
  if (!media) return null;
  const plain = typeof media.get === "function" ? media.get({ plain: true }) : media;
  const variants = {};
  for (const [name, v] of Object.entries(plain.variants || {})) variants[name] = { url: v.url, width: v.width, height: v.height };
  return {
    id: plain.id,
    url: plain.url,
    filename: plain.filename,
    mimeType: plain.mimeType,
    size: plain.size,
    width: plain.width,
    height: plain.height,
    variants,
    alt: plain.alt || {},
    caption: plain.caption || {},
    credit: plain.credit || null,
    consentOnFile: Boolean(plain.consentOnFile),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

module.exports = { normalizeLocalized, normalizeLocalizedList, pick, mediaSummary };
