const { siteUrl } = require("../config/env");
const { pickFields, extractIdentity, LOCALES } = require("../config/formFields");
const { FormSubmission, NewsletterSubscriber } = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const { generateToken, hashToken } = require("../utils/tokens");
const { verifyTurnstile } = require("../services/turnstile.service");
const { notifyStaff, acknowledgeVisitor, welcomeSubscriber } = require("../services/notifications.service");

const localeOf = (body) => (LOCALES.includes(body.locale) ? body.locale : "en");
const sourceOf = (req) => (req.get("referer") || "").slice(0, 255) || null;

// Shared handler for the four contact-style forms. Spam (honeypot or failed
// Turnstile) is stored in quarantine and answered with the same success shape
// so bots learn nothing.
const submit = (type) =>
  asyncHandler(async (req, res) => {
    const payload = pickFields(type, req.body);
    const { name, email } = extractIdentity(type, payload);
    const locale = localeOf(req.body);

    let spamReason = null;
    if (req.body.website) spamReason = "honeypot";
    else {
      const check = await verifyTurnstile(req.body.turnstileToken, req.ip);
      if (!check.ok) spamReason = check.reason;
    }

    const submission = await FormSubmission.create({
      type,
      locale,
      name,
      email,
      payload,
      isSpam: Boolean(spamReason),
      spamReason,
      sourcePage: sourceOf(req),
      ip: req.ip || null,
      userAgent: (req.get("user-agent") || "").slice(0, 255) || null,
    });

    if (!spamReason) {
      // Fire-and-forget: the visitor gets their answer right away.
      notifyStaff(type, submission);
      acknowledgeVisitor(type, submission);
    }

    return ok(res, { id: submission.id }, 201);
  });

exports.volunteer = submit("volunteer");
exports.partnership = submit("partnership");
exports.assistance = submit("assistance");
exports.contact = submit("contact");

exports.newsletter = asyncHandler(async (req, res) => {
  const locale = localeOf(req.body);
  if (req.body.website) return ok(res, { subscribed: true }, 201);
  const check = await verifyTurnstile(req.body.turnstileToken, req.ip);
  if (!check.ok) return ok(res, { subscribed: true }, 201);

  const email = String(req.body.email).toLowerCase();
  const token = generateToken();
  const [subscriber, created] = await NewsletterSubscriber.findOrCreate({
    where: { email },
    defaults: {
      locale,
      status: "subscribed",
      consentAt: new Date(),
      unsubscribeTokenHash: hashToken(token),
      sourcePage: sourceOf(req),
      ip: req.ip || null,
    },
  });

  if (!created) {
    // Re-subscribe (or refresh consent) — issue a fresh unsubscribe token.
    subscriber.locale = locale;
    subscriber.status = "subscribed";
    subscriber.consentAt = new Date();
    subscriber.unsubscribedAt = null;
    subscriber.unsubscribeTokenHash = hashToken(token);
    await subscriber.save();
  }

  const unsubscribeUrl = `${siteUrl}/${locale}/unsubscribe?token=${token}`;
  welcomeSubscriber(subscriber, unsubscribeUrl);
  return ok(res, { subscribed: true }, 201);
});

exports.unsubscribe = asyncHandler(async (req, res) => {
  const subscriber = await NewsletterSubscriber.findOne({ where: { unsubscribeTokenHash: hashToken(req.body.token) } });
  if (!subscriber) return ok(res, { unsubscribed: false, reason: "invalid_token" });
  if (subscriber.status !== "unsubscribed") {
    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();
  }
  return ok(res, { unsubscribed: true, email: subscriber.email });
});
