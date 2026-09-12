const { isProd } = require("../config/env");
const { Donation } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const donations = require("../services/donations.service");
const stripe = require("../services/stripe.service");
const { verifyTurnstile } = require("../services/turnstile.service");

// What the Donate page needs to render: amounts, minimum, on/off, mode.
exports.config = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30");
  return ok(res, await donations.publicConfig());
});

// Starts a donation: creates the ledger row and returns the hosted checkout URL.
exports.checkout = asyncHandler(async (req, res) => {
  if (req.body.website) throw ApiError.badRequest("Could not start the donation"); // honeypot
  const check = await verifyTurnstile(req.body.turnstileToken, req.ip);
  if (!check.ok) throw ApiError.badRequest("Could not verify that you are human. Please try again.");

  const { donation, url } = await donations.createCheckout({
    amountCents: Number(req.body.amountCents),
    name: req.body.name,
    email: req.body.email,
    locale: req.body.locale,
    anonymous: req.body.anonymous,
    message: req.body.message,
    sourcePage: (req.get("referer") || "").slice(0, 255) || null,
    ip: req.ip || null,
    userAgent: req.get("user-agent"),
  });
  return ok(res, { url, donationId: donation.id, mode: stripe.mode() }, 201);
});

// Thank-you page: polls until the webhook (or the simulator) confirmed payment.
exports.status = asyncHandler(async (req, res) => {
  const session = String(req.query.session || "");
  if (!session) throw ApiError.badRequest("session is required");
  const donation = await Donation.findOne({ where: { providerSessionId: session } });
  if (!donation) throw ApiError.notFound("Donation not found");
  res.setHeader("Cache-Control", "no-store");
  return ok(res, {
    status: donation.status,
    receiptNumber: donation.receiptNumber,
    amountCents: donation.amountCents,
    currency: donation.currency,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    locale: donation.locale,
    paidAt: donation.paidAt,
    receiptSentAt: donation.receiptSentAt,
    mode: donation.provider === "simulated" ? "simulated" : stripe.mode(),
  });
});

// Local review without Stripe keys: the "Pay" button of the simulated
// checkout page. Refused as soon as real keys exist or in production.
exports.simulateComplete = asyncHandler(async (req, res) => {
  if (isProd || stripe.isConfigured()) throw ApiError.forbidden("Simulated payments are disabled");
  const donation = await Donation.findOne({ where: { providerSessionId: String(req.body.session || ""), provider: "simulated" } });
  if (!donation) throw ApiError.notFound("Donation not found");
  if (req.body.outcome === "cancel") {
    await donations.markFailed(donation, "expired");
    return ok(res, { status: donation.status });
  }
  // A realistic card fee so "net after fees" has something to show: 2.9% + 30¢.
  const feeCents = Math.round(donation.amountCents * 0.029 + 30);
  await donations.markPaid(donation, { paymentIntentId: `pi_sim_${donation.id}`, chargeId: `ch_sim_${donation.id}`, feeCents });
  return ok(res, { status: donation.status, receiptNumber: donation.receiptNumber });
});

// Local review of refunds (mirrors the charge.refunded webhook).
exports.simulateRefund = asyncHandler(async (req, res) => {
  if (isProd || stripe.isConfigured()) throw ApiError.forbidden("Simulated refunds are disabled");
  const donation = await Donation.findOne({ where: { providerSessionId: String(req.body.session || ""), provider: "simulated" } });
  if (!donation) throw ApiError.notFound("Donation not found");
  const cents = Number(req.body.refundedCents) || donation.amountCents;
  await donations.applyRefund(donation, { refundedCents: cents, reason: "simulated" });
  return ok(res, { status: donation.status, refundedCents: donation.refundedCents });
});
