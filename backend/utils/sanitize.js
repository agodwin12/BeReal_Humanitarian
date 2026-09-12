const sanitizeHtml = require("sanitize-html");

// Rich text from the backoffice editor (legal pages, stories, updates). Only
// structural tags survive; links get rel="noopener" and no inline styles.
const OPTIONS = {
  allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "a", "blockquote", "hr"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer", ...(attribs.target === "_blank" ? { target: "_blank" } : {}) },
    }),
  },
};

function sanitizeRichText(html) {
  return sanitizeHtml(String(html || ""), OPTIONS).trim();
}

function sanitizeLocalizedRichText(localized) {
  const out = {};
  for (const [locale, html] of Object.entries(localized || {})) out[locale] = sanitizeRichText(html);
  return out;
}

module.exports = { sanitizeRichText, sanitizeLocalizedRichText };
