const { DonationSetting, SiteSetting, StripeEvent } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized } = require("../utils/localized");
const donations = require("../services/donations.service");
const receipts = require("../services/receipts.service");
const stripe = require("../services/stripe.service");

async function serialize(row) {
  const site = await SiteSetting.findByPk(1);
  const lastEvent = await StripeEvent.findOne({ order: [["createdAt", "DESC"]] });
  const eventCount = await StripeEvent.count();
  return {
    ...row.get({ plain: true }),
    donateEnabled: site ? site.donateEnabled !== false : true,
    donateDisabledMessage: site?.donateDisabledMessage || {},
    stripe: {
      mode: stripe.mode(),
      configured: stripe.isConfigured(),
      simulated: stripe.isSimulated(),
      publishableKeyHint: stripe.publishableKey ? `${stripe.publishableKey.slice(0, 12)}…` : null,
      webhookConfigured: Boolean(stripe.webhookSecret),
      webhookEndpoint: "/api/donations/webhook",
      lastEventAt: lastEvent?.createdAt ?? null,
      lastEventType: lastEvent?.type ?? null,
      eventCount,
    },
  };
}

exports.get = asyncHandler(async (req, res) => ok(res, await serialize(await donations.getSettings())));

exports.update = asyncHandler(async (req, res) => {
  const row = await donations.getSettings();
  const before = row.get({ plain: true });

  if (req.body.suggestedAmounts !== undefined) {
    const amounts = [...new Set(req.body.suggestedAmounts.map((a) => Math.round(Number(a))).filter((a) => Number.isFinite(a) && a > 0))].sort((a, b) => a - b);
    if (amounts.length === 0 || amounts.length > 6) throw ApiError.badRequest("Choose between 1 and 6 suggested amounts");
    row.suggestedAmounts = amounts;
  }
  if (req.body.monthlySuggestedAmounts !== undefined) {
    const amounts = [...new Set(req.body.monthlySuggestedAmounts.map((a) => Math.round(Number(a))).filter((a) => Number.isFinite(a) && a > 0))].sort((a, b) => a - b);
    if (amounts.length === 0 || amounts.length > 6) throw ApiError.badRequest("Choose between 1 and 6 suggested monthly amounts");
    row.monthlySuggestedAmounts = amounts;
  }
  for (const flag of ["monthlyEnabled", "feeCoverEnabled", "feeCoverDefaultChecked"]) {
    if (req.body[flag] !== undefined) row[flag] = Boolean(req.body[flag]);
  }
  if (req.body.feeCoverPercentBp !== undefined) row.feeCoverPercentBp = Number(req.body.feeCoverPercentBp);
  if (req.body.feeCoverFixedCents !== undefined) row.feeCoverFixedCents = Number(req.body.feeCoverFixedCents);
  if (req.body.minimumAmountCents !== undefined) row.minimumAmountCents = Number(req.body.minimumAmountCents);
  if (req.body.maximumAmountCents !== undefined) row.maximumAmountCents = Number(req.body.maximumAmountCents);
  if (row.maximumAmountCents <= row.minimumAmountCents) throw ApiError.badRequest("The maximum must be above the minimum");
  for (const field of ["thankYouMessage", "receiptIntro", "receiptIrsStatement", "receiptSignoff"]) {
    if (req.body[field] !== undefined) row[field] = normalizeLocalized(req.body[field]);
  }
  if (req.body.receiptSenderName !== undefined) row.receiptSenderName = req.body.receiptSenderName ? String(req.body.receiptSenderName).trim() : null;
  if (req.body.receiptReplyTo !== undefined) row.receiptReplyTo = req.body.receiptReplyTo ? String(req.body.receiptReplyTo).trim().toLowerCase() : null;
  if (req.body.statementDescriptor !== undefined) {
    row.statementDescriptor = req.body.statementDescriptor ? String(req.body.statementDescriptor).toUpperCase().replace(/[^A-Z0-9 .-]/g, "").trim().slice(0, 22) : null;
  }
  row.updatedById = req.user.id;
  await row.save();

  // The kill switch lives on site settings (the site already reads it there).
  if (req.body.donateEnabled !== undefined || req.body.donateDisabledMessage !== undefined) {
    const site = await SiteSetting.findByPk(1);
    if (site) {
      if (req.body.donateEnabled !== undefined) site.donateEnabled = Boolean(req.body.donateEnabled);
      if (req.body.donateDisabledMessage !== undefined) site.donateDisabledMessage = normalizeLocalized(req.body.donateDisabledMessage);
      await site.save();
    }
  }

  await audit.record(req, { action: "donation_settings.updated", entity: "donation_settings", entityId: 1, before, after: row.get({ plain: true }), meta: { donateEnabled: req.body.donateEnabled } });
  return ok(res, await serialize(row));
});

// Sends a sample receipt (PDF attached) to the signed-in user, in a chosen
// language, so the wording can be checked before real gifts arrive.
exports.testReceipt = asyncHandler(async (req, res) => {
  const locale = ["en", "fr", "es"].includes(req.body.locale) ? req.body.locale : "en";
  const settings = await donations.getSettings();
  const monthly = req.body.frequency === "monthly";
  const sample = {
    id: 0,
    receiptNumber: `BRHW-${new Date().getFullYear()}-SAMPLE`,
    frequency: monthly ? "monthly" : "one_time",
    feeCoverCents: 0,
    amountCents: 5000,
    currency: settings.currency,
    donorName: req.user.name,
    donorEmail: req.user.email,
    locale,
    paidAt: new Date(),
    createdAt: new Date(),
    providerPaymentIntentId: "pi_sample",
    providerSessionId: null,
  };
  const { ctx, pdf, filename } = await receipts.renderReceipt(sample, settings, { paymentNumber: 1 });
  const mail = receipts.receiptEmail(sample, ctx);
  const { sendEmail } = require("../services/email.service");
  await sendEmail({ to: req.user.email, kind: "donation_receipt_test", replyTo: ctx.replyTo || undefined, attachments: [{ filename, content: pdf.toString("base64") }], ...mail });
  await audit.record(req, { action: "donation_settings.test_receipt_sent", entity: "donation_settings", entityId: 1, meta: { locale, frequency: sample.frequency } });
  return ok(res, { sent: true, to: req.user.email, locale, frequency: sample.frequency });
});

exports.previewReceipt = asyncHandler(async (req, res) => {
  const locale = ["en", "fr", "es"].includes(req.query.locale) ? req.query.locale : "en";
  const settings = await donations.getSettings();
  const monthly = req.query.frequency === "monthly";
  const sample = { id: 0, receiptNumber: `BRHW-${new Date().getFullYear()}-SAMPLE`, frequency: monthly ? "monthly" : "one_time", feeCoverCents: 0, amountCents: 5000, currency: settings.currency, donorName: "Sample Donor", donorEmail: "donor@example.org", locale, paidAt: new Date(), createdAt: new Date(), providerPaymentIntentId: "pi_sample", providerSessionId: null };
  const { pdf, filename } = await receipts.renderReceipt(sample, settings, { paymentNumber: 1 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  return res.send(pdf);
});
