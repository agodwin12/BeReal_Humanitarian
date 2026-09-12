const fs = require("fs");
const path = require("path");

const { siteUrl, contentSeedDir } = require("../config/env");
const { LOCALES } = require("../config/content");

// The website's built-in copy, flattened to { "Hero.title": "…" } per locale.
// Read from the running site (always current), cached for a minute; falls
// back to the snapshot in backend/seed/messages when the site is unreachable.
const TTL_MS = 60 * 1000;
let cache = { at: 0, messages: null, source: null };

function flatten(obj, prefix = "", out = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof obj === "string") out[prefix] = obj;
  return out;
}

async function fetchFromSite(locale) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/messages/${locale}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const body = await response.json();
    return flatten(body.messages);
  } finally {
    clearTimeout(timer);
  }
}

function readSeed(locale) {
  const file = path.join(contentSeedDir, `${locale}.json`);
  return fs.existsSync(file) ? flatten(JSON.parse(fs.readFileSync(file, "utf8"))) : {};
}

async function loadSiteMessages({ force = false } = {}) {
  if (!force && cache.messages && Date.now() - cache.at < TTL_MS) return cache;
  const messages = {};
  let source = "site";
  try {
    for (const locale of LOCALES) messages[locale] = await fetchFromSite(locale);
  } catch (error) {
    source = "snapshot";
    for (const locale of LOCALES) messages[locale] = readSeed(locale);
    console.warn(`[translations] site messages unavailable (${error.message}); using the seed snapshot`);
  }
  cache = { at: Date.now(), messages, source };
  return cache;
}

module.exports = { loadSiteMessages, flatten };
