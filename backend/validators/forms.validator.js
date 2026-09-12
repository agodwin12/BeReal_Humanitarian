const { body } = require("express-validator");

const { ORG_TYPES, CONTACT_METHODS, ASSISTANCE_TYPES, URGENCY_LEVELS, LOCALES } = require("../config/formFields");

// Mirrors frontend/src/lib/zod-schemas/forms.ts — the server never trusts the client.
const text = (field, { min = 1, max = 500 } = {}) =>
  body(field).isString().trim().isLength({ min, max }).withMessage(`${field} is required`);
const email = body("email").isEmail().withMessage("A valid email is required").normalizeEmail({ gmail_remove_dots: false });
const phone = body("phone").isString().trim().isLength({ min: 6, max: 40 }).withMessage("A valid phone number is required");
const mustBeTrue = (field, message) => body(field).custom((v) => v === true || v === "true").withMessage(message);
const locale = body("locale").optional().isIn(LOCALES).withMessage("Unsupported locale");
// Honeypot: humans never see this field.
const honeypot = body("website").optional({ values: "falsy" }).isString();
const turnstile = body("turnstileToken").optional().isString();

module.exports = {
  volunteerRules: [
    text("fullName", { max: 160 }),
    email,
    phone,
    text("location", { max: 200 }),
    text("interests", { max: 2000 }),
    text("availability", { max: 500 }),
    mustBeTrue("ageConfirmed", "Age confirmation is required"),
    mustBeTrue("consent", "Consent to contact is required"),
    locale,
    honeypot,
    turnstile,
  ],
  partnershipRules: [
    text("organizationName", { max: 200 }),
    text("contactName", { max: 160 }),
    email,
    phone,
    body("organizationType").isIn(ORG_TYPES).withMessage("Choose an organization type"),
    text("proposal", { max: 500 }),
    text("message", { max: 4000 }),
    mustBeTrue("consent", "Consent to contact is required"),
    locale,
    honeypot,
    turnstile,
  ],
  assistanceRules: [
    text("fullName", { max: 160 }),
    email,
    phone,
    text("city", { max: 120 }),
    text("state", { max: 120 }),
    text("country", { max: 120 }),
    body("preferredContact").isIn(CONTACT_METHODS).withMessage("Choose a contact method"),
    body("assistanceType").isIn(ASSISTANCE_TYPES).withMessage("Choose a type of assistance"),
    text("needDescription", { min: 20, max: 4000 }),
    body("urgency").isIn(URGENCY_LEVELS).withMessage("Choose an urgency level"),
    body("deadline").optional({ values: "falsy" }).isString().trim().isLength({ max: 200 }),
    mustBeTrue("consent", "Consent to contact is required"),
    mustBeTrue("privacyAcknowledged", "Privacy acknowledgment is required"),
    locale,
    honeypot,
    turnstile,
  ],
  contactRules: [
    text("name", { max: 160 }),
    email,
    text("subject", { max: 200 }),
    text("message", { max: 4000 }),
    locale,
    honeypot,
    turnstile,
  ],
  newsletterRules: [email, mustBeTrue("consent", "Consent is required"), locale, honeypot, turnstile],
  unsubscribeRules: [body("token").isString().trim().isLength({ min: 20, max: 200 }).withMessage("Invalid token")],
};
