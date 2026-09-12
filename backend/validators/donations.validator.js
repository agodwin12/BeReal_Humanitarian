const { body, param, query } = require("express-validator");

const localized = (field, max) =>
  body(field)
    .optional()
    .custom((value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${field} must be an object with en / fr / es`);
      for (const [k, v] of Object.entries(value)) {
        if (!["en", "fr", "es"].includes(k)) throw new Error(`${field}: unknown language ${k}`);
        if (v !== null && v !== undefined && typeof v !== "string") throw new Error(`${field}.${k} must be text`);
        if (typeof v === "string" && v.length > max) throw new Error(`${field}.${k} is too long`);
      }
      return true;
    });

const tokenRule = body("token").isString().isLength({ min: 20, max: 80 }).withMessage("token is required");

module.exports = {
  checkoutRules: [
    body("amountCents").isInt({ min: 100, max: 100000000 }).withMessage("Enter a valid amount"),
    body("frequency").optional().isIn(["one_time", "monthly"]).withMessage("Choose a one-time or a monthly gift"),
    body("coverFees").optional().isBoolean(),
    body("name").isString().trim().isLength({ min: 2, max: 160 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail({ gmail_remove_dots: false }),
    body("locale").optional().isIn(["en", "fr", "es"]),
    body("anonymous").optional().isBoolean(),
    body("message").optional({ values: "null" }).isString().isLength({ max: 1000 }),
    body("website").optional().isString(),
    body("turnstileToken").optional().isString(),
  ],
  simulateRules: [body("session").isString().isLength({ min: 5, max: 120 }), body("outcome").optional().isIn(["paid", "cancel"])],
  simulateRefundRules: [body("session").isString().isLength({ min: 5, max: 120 }), body("refundedCents").optional().isInt({ min: 1 })],
  subscriptionTokenQuery: [query("token").isString().isLength({ min: 20, max: 80 }).withMessage("token is required")],
  subscriptionTokenRules: [tokenRule, body("reason").optional({ values: "null" }).isString().isLength({ max: 160 })],

  listRules: [
    query("q").optional().isString().trim().isLength({ max: 120 }),
    query("status").optional().isIn(["all", "paid_any", "pending", "paid", "failed", "expired", "refunded", "partially_refunded"]),
    query("frequency").optional().isIn(["all", "one_time", "monthly"]),
    query("locale").optional().isIn(["en", "fr", "es"]),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
    query("year").optional().isInt({ min: 2020, max: 2100 }),
    query("min").optional().isInt({ min: 0 }),
    query("max").optional().isInt({ min: 0 }),
  ],
  subscriptionListRules: [
    query("q").optional().isString().trim().isLength({ max: 120 }),
    query("status").optional().isIn(["all", "open", "pending", "active", "past_due", "canceled", "incomplete"]),
  ],
  idParam: [param("id").isInt({ min: 1 })],
  updateRules: [param("id").isInt({ min: 1 }), body("note").optional({ values: "null" }).isString().isLength({ max: 4000 }), body("anonymous").optional().isBoolean()],
  cancelRules: [param("id").isInt({ min: 1 }), body("reason").optional({ values: "null" }).isString().isLength({ max: 160 })],
  donorRules: [query("email").isEmail().withMessage("email is required")],

  settingsRules: [
    body("suggestedAmounts").optional().isArray({ min: 1, max: 6 }),
    body("suggestedAmounts.*").isFloat({ min: 1, max: 100000 }),
    body("monthlySuggestedAmounts").optional().isArray({ min: 1, max: 6 }),
    body("monthlySuggestedAmounts.*").isFloat({ min: 1, max: 100000 }),
    body("monthlyEnabled").optional().isBoolean(),
    body("feeCoverEnabled").optional().isBoolean(),
    body("feeCoverDefaultChecked").optional().isBoolean(),
    body("feeCoverPercentBp").optional().isInt({ min: 0, max: 2000 }).withMessage("The fee percentage must be between 0 and 20%"),
    body("feeCoverFixedCents").optional().isInt({ min: 0, max: 500 }).withMessage("The fixed fee must be between $0 and $5"),
    body("minimumAmountCents").optional().isInt({ min: 100, max: 100000000 }),
    body("maximumAmountCents").optional().isInt({ min: 100, max: 100000000 }),
    localized("thankYouMessage", 1000),
    localized("receiptIntro", 2000),
    localized("receiptIrsStatement", 2000),
    localized("receiptSignoff", 200),
    localized("donateDisabledMessage", 300),
    body("receiptSenderName").optional({ values: "null" }).isString().isLength({ max: 120 }),
    body("receiptReplyTo").optional({ values: "null" }).if((v) => v).isEmail().withMessage("Reply-to must be a valid email"),
    body("statementDescriptor").optional({ values: "null" }).isString().isLength({ max: 22 }),
    body("donateEnabled").optional().isBoolean(),
  ],
  testReceiptRules: [body("locale").optional().isIn(["en", "fr", "es"]), body("frequency").optional().isIn(["one_time", "monthly"])],
};
