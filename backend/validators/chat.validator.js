const { body, param, query } = require("express-validator");

const { LOCALES } = require("../config/content");

// Public: one conversation turn from the website widget.
const messageRules = [
  body("sessionKey").optional({ values: "falsy" }).isString().isLength({ max: 64 }).withMessage("Invalid session"),
  body("locale").optional().isIn(LOCALES).withMessage("Unknown language"),
  body("page").optional({ values: "falsy" }).isString().isLength({ max: 200 }),
  body("messages").isArray({ min: 1, max: 12 }).withMessage("Send between 1 and 12 messages"),
  body("messages.*.role").isIn(["user", "assistant"]).withMessage("Invalid role"),
  body("messages.*.content").isString().trim().isLength({ min: 1, max: 1500 }).withMessage("Each message must be 1 to 1500 characters"),
];

// Staff: settings.
const settingsRules = [
  body("enabled").optional().isBoolean().withMessage("enabled must be true or false"),
  body("assistantName").optional().isString().trim().isLength({ min: 1, max: 80 }).withMessage("Name: 1 to 80 characters"),
  body("welcome").optional().isObject().withMessage("welcome must be { en, fr, es }"),
  body("suggestedQuestions").optional().isObject().withMessage("suggestedQuestions must be { en: [], fr: [], es: [] }"),
  body("extraKnowledge").optional().isObject().withMessage("extraKnowledge must be { en, fr, es }"),
  body("maxMessagesPerSession").optional().isInt({ min: 2, max: 200 }).withMessage("Between 2 and 200 messages per conversation"),
];

const previewRules = [
  body("question").isString().trim().isLength({ min: 1, max: 1500 }).withMessage("Ask a question (1 to 1500 characters)"),
  body("locale").optional().isIn(LOCALES),
];

const listRules = [query("page").optional().isInt({ min: 1 }), query("pageSize").optional().isInt({ min: 1, max: 100 }), query("locale").optional().isIn(LOCALES), query("q").optional().isString().isLength({ max: 120 })];

const idParam = [param("id").isInt({ min: 1 }).withMessage("Invalid id")];

module.exports = { messageRules, settingsRules, previewRules, listRules, idParam };
