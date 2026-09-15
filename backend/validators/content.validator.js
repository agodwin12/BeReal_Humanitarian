const { body, param, query } = require("express-validator");

const { LOCALES, PROGRAM_ICONS, PROGRAM_TINTS, METRIC_ICONS, SOCIAL_PLATFORMS, NAV_ITEMS, PAGE_SLUGS, LEGAL_SLUGS } = require("../config/content");

const isLocalizedText = (max) => (value, { path: field }) => {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${field} must be an object with en / fr / es`);
  for (const locale of LOCALES) {
    if (value[locale] !== undefined && value[locale] !== null && typeof value[locale] !== "string") throw new Error(`${field}.${locale} must be text`);
    if (typeof value[locale] === "string" && value[locale].length > max) throw new Error(`${field}.${locale} is longer than ${max} characters`);
  }
  return true;
};

const isLocalizedList = (value, { path: field }) => {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${field} must be an object with en / fr / es lists`);
  for (const locale of LOCALES) {
    if (value[locale] === undefined) continue;
    if (!Array.isArray(value[locale]) || value[locale].length > 12) throw new Error(`${field}.${locale} must be a list of up to 12 items`);
    if (value[locale].some((s) => typeof s !== "string" || s.length > 300)) throw new Error(`${field}.${locale} items must be short text`);
  }
  return true;
};

const localized = (field, { max = 2000, requiredEn = false } = {}) =>
  body(field)
    .if((v) => v !== undefined || requiredEn)
    .custom((value, meta) => {
      if (requiredEn && (!value || typeof value !== "object" || !String(value.en || "").trim())) throw new Error(`${field} (English) is required`);
      return isLocalizedText(max)(value, meta);
    });

const mediaIdRule = (field) => body(field).optional({ values: "null" }).isInt({ min: 1 }).withMessage(`${field} must be a media id`);
const idParam = param("id").isInt({ min: 1 }).withMessage("Invalid id");
const orderRule = body("order").optional().isInt({ min: 0, max: 999 });
const visibleRule = body("visible").optional().isBoolean();
const dateOnly = (field) => body(field).optional({ values: "null" }).isISO8601({ strict: true }).withMessage(`${field} must be a date (YYYY-MM-DD)`);

const reorderRules = [body("ids").isArray({ min: 1, max: 200 }).withMessage("ids must be a list"), body("ids.*").isInt({ min: 1 })];

module.exports = {
  idParam,
  reorderRules,

  siteSettingsRules: [
    body("legalName").optional().isString().trim().isLength({ min: 2, max: 200 }),
    body("shortName").optional().isString().trim().isLength({ min: 1, max: 80 }),
    localized("tagline", { max: 300 }),
    localized("statusLine", { max: 400 }),
    localized("neutralityStatement", { max: 1000 }),
    localized("fiscalYear", { max: 80 }),
    body("ein").optional({ values: "null" }).isString().trim().isLength({ max: 20 }),
    body("showEin").optional().isBoolean(),
    body("contactEmail").optional({ values: "null" }).if((v) => v !== "" && v !== null).isEmail().withMessage("Enter a valid email").normalizeEmail({ gmail_remove_dots: false }),
    body("contactPhone").optional({ values: "null" }).isString().trim().isLength({ max: 40 }),
    body("addressLine").optional({ values: "null" }).isString().trim().isLength({ max: 255 }),
    localized("addressNote", { max: 300 }),
    body("socialLinks").optional().isArray({ max: 10 }),
    body("socialLinks.*.platform").isIn(SOCIAL_PLATFORMS).withMessage("Unknown social platform"),
    body("socialLinks.*.url").isURL({ protocols: ["https", "http"], require_protocol: true }).withMessage("Social links must be full URLs"),
    body("navigation").optional().isArray({ max: 12 }),
    body("navigation.*.key").isIn(NAV_ITEMS.map((n) => n.key)).withMessage("Unknown navigation item"),
    body("navigation.*.visible").isBoolean(),
    body("donateEnabled").optional().isBoolean(),
    localized("donateDisabledMessage", { max: 300 }),
    body("enabledLocales").optional().isArray({ min: 1, max: 3 }).custom((list) => list.includes("en") && list.every((l) => LOCALES.includes(l))).withMessage("English must stay enabled"),
    localized("seoDescription", { max: 320 }),
    body("brandPrimary").optional({ values: "null" }).matches(/^#[0-9a-fA-F]{6}$/).withMessage("Colors are hex, e.g. #5626a6"),
    body("brandAccent").optional({ values: "null" }).matches(/^#[0-9a-fA-F]{6}$/).withMessage("Colors are hex, e.g. #f26058"),
    mediaIdRule("logoMediaId"),
    mediaIdRule("faviconMediaId"),
    mediaIdRule("shareMediaId"),
    body("heroSlideIds").optional().isArray({ max: 8 }).withMessage("Up to 8 hero photos"),
    body("heroSlideIds.*").isInt({ min: 1 }).withMessage("heroSlideIds must be media ids"),
  ],

  mediaListRules: [
    query("q").optional().isString().trim().isLength({ max: 120 }),
    query("kind").optional().isIn(["image", "pdf", "all", "video"]),
    query("unused").optional().isIn(["true", "false"]),
  ],
  mediaMetaRules: [
    localized("alt", { max: 300 }),
    localized("caption", { max: 500 }),
    body("credit").optional({ values: "null" }).isString().trim().isLength({ max: 200 }),
    body("consentOnFile").optional().isBoolean(),
  ],

  programRules: [
    body("slug").optional().isString().trim().matches(/^[a-z0-9-]{2,80}$/).withMessage("Slug: lowercase letters, numbers and dashes"),
    orderRule,
    visibleRule,
    body("icon").optional().isIn(PROGRAM_ICONS).withMessage("Unknown icon"),
    body("tint").optional().isIn(PROGRAM_TINTS),
    localized("name", { max: 120 }),
    localized("cardLine1", { max: 60 }),
    localized("cardLine2", { max: 60 }),
    localized("summary", { max: 400 }),
    localized("purpose", { max: 1200 }),
    body("focusItems").optional().custom(isLocalizedList),
    mediaIdRule("cardMediaId"),
    mediaIdRule("detailMediaId"),
  ],
  programCreateRules: [localized("name", { max: 120, requiredEn: true })],

  teamRules: [
    body("name").optional().isString().trim().isLength({ min: 2, max: 120 }),
    orderRule,
    visibleRule,
    localized("role", { max: 120 }),
    localized("bio", { max: 2000 }),
    mediaIdRule("photoMediaId"),
  ],
  teamCreateRules: [body("name").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Name is required")],

  galleryRules: [
    body("kind").optional().isIn(["image", "video"]),
    localized("title", { max: 160 }),
    localized("description", { max: 2000 }),
    dateOnly("happenedOn"),
    body("location").optional({ values: "null" }).isString().trim().isLength({ max: 160 }),
    body("published").optional().isBoolean(),
    mediaIdRule("mediaId"),
    body("videoUrl").optional({ values: "null" }).isString().trim().isLength({ max: 500 }),
    body("impactStoryId").optional({ values: "null" }).isInt({ min: 1 }).withMessage("impactStoryId must be a story id"),
  ],

  metricRules: [
    localized("label", { max: 120 }),
    body("icon").optional().isIn(METRIC_ICONS),
    body("value").optional({ values: "null" }).isString().trim().isLength({ max: 60 }),
    dateOnly("documentedOn"),
    body("sourceNote").optional({ values: "null" }).isString().trim().isLength({ max: 1000 }),
    body("published").optional().isBoolean(),
    orderRule,
  ],

  storyRules: [
    localized("title", { max: 200 }),
    localized("purpose", { max: 2000 }),
    localized("whatWeDid", { max: 20000 }),
    localized("summary", { max: 4000 }),
    body("assistanceProvided").optional().custom(isLocalizedList),
    body("peopleReachedCount").optional({ values: "null" }).isInt({ min: 0, max: 10000000 }).withMessage("Enter a whole number"),
    localized("peopleReachedUnit", { max: 60 }),
    dateOnly("happenedOn"),
    body("location").optional({ values: "null" }).isString().trim().isLength({ max: 160 }),
    body("programId").optional({ values: "null" }).isInt({ min: 1 }).withMessage("programId must be a program id"),
    body("slug").optional({ values: "null" }).isString().trim().isLength({ max: 160 }),
    mediaIdRule("mediaId"),
    body("consentConfirmed").optional().isBoolean(),
    body("consentConfirmedBy").optional({ values: "null" }).isString().trim().isLength({ max: 120 }),
    orderRule,
  ],
  storyCreateRules: [localized("title", { max: 200, requiredEn: true })],
  storySlugParam: [param("slug").isString().trim().isLength({ min: 1, max: 160 }).withMessage("Invalid story")],

  updateRules: [
    body("date").optional().isISO8601({ strict: true }).withMessage("Date must be YYYY-MM-DD"),
    localized("title", { max: 200 }),
    localized("body", { max: 20000 }),
  ],
  updateCreateRules: [body("date").isISO8601({ strict: true }).withMessage("Date is required (YYYY-MM-DD)"), localized("title", { max: 200, requiredEn: true })],

  pageSlugParam: [param("slug").isIn(PAGE_SLUGS).withMessage("Unknown page")],
  pageDraftRules: [
    body("messages").optional().isObject().withMessage("messages must be an object"),
    body("images").optional().isObject(),
    body("sections").optional().isArray({ max: 30 }),
    body("sections.*.key").isString().isLength({ min: 1, max: 40 }),
    body("sections.*.visible").isBoolean(),
  ],
  versionParam: [param("versionId").isInt({ min: 1 })],

  legalSlugParam: [param("slug").isIn(LEGAL_SLUGS).withMessage("Unknown legal page")],
  legalRules: [localized("title", { max: 200 }), localized("body", { max: 200000 }), dateOnly("effectiveDate")],
};
