const { body, param, query } = require("express-validator");

const { FORM_TYPES } = require("../config/formFields");

const STATUSES = ["new", "in_review", "contacted", "closed"];

module.exports = {
  STATUSES,
  listRules: [
    query("type").optional().isIn(FORM_TYPES),
    query("status").optional().isIn([...STATUSES, "all"]),
    query("spam").optional().isIn(["true", "false"]),
    query("q").optional().isString().trim().isLength({ max: 120 }),
    query("assignedToId").optional().isInt({ min: 1 }),
  ],
  idRule: [param("id").isInt({ min: 1 }).withMessage("Invalid submission id")],
  updateRules: [
    param("id").isInt({ min: 1 }),
    body("status").optional().isIn(STATUSES).withMessage("Invalid status"),
    body("assignedToId").optional({ values: "null" }).isInt({ min: 1 }),
  ],
  noteRules: [param("id").isInt({ min: 1 }), body("body").isString().trim().isLength({ min: 1, max: 4000 }).withMessage("Note is required")],
  exportRules: [
    query("type").isIn(FORM_TYPES).withMessage("type is required"),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
  ],
  subscriberListRules: [
    query("status").optional().isIn(["subscribed", "unsubscribed", "all"]),
    query("q").optional().isString().trim().isLength({ max: 120 }),
  ],
  notificationRules: [
    param("formType").isIn([...FORM_TYPES, "newsletter"]).withMessage("Unknown form type"),
    body("recipients").isArray({ max: 20 }).withMessage("recipients must be a list"),
    body("recipients.*").isEmail().withMessage("Each recipient must be a valid email").normalizeEmail({ gmail_remove_dots: false }),
    body("locale").optional().isIn(["en", "fr", "es"]),
    body("enabled").optional().isBoolean(),
  ],
};
