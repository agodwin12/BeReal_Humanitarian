const express = require("express");

const ctrl = require("../controllers/forms.controller");
const { formLimiter, unsubscribeLimiter } = require("../middlewares/rateLimiter.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/forms.validator");

const router = express.Router();

// Public — called by the website's forms (frontend/src/lib/api.ts).
router.post("/volunteer", formLimiter, rules.volunteerRules, validate, ctrl.volunteer);
router.post("/partnership", formLimiter, rules.partnershipRules, validate, ctrl.partnership);
router.post("/assistance", formLimiter, rules.assistanceRules, validate, ctrl.assistance);
router.post("/contact", formLimiter, rules.contactRules, validate, ctrl.contact);
router.post("/newsletter", formLimiter, rules.newsletterRules, validate, ctrl.newsletter);
router.post("/newsletter/unsubscribe", unsubscribeLimiter, rules.unsubscribeRules, validate, ctrl.unsubscribe);

module.exports = router;
