const crypto = require("crypto");
const { Op } = require("sequelize");

const { siteUrl } = require("../config/env");
const { LOCALES } = require("../config/content");
const { sequelize, Donation, DonationEvent, DonationSetting, SiteSetting, StripeEvent } = require("../models");
const ApiError = require("../utils/apiError");
const stripe = require("./stripe.service");
const receipts = require("./receipts.service");

const PAID_STATUSES = ["paid", "partially_refunded", "refunded"];

// ---- Settings -----------------------------------------------------------------

async function ensureDonationDefaults() {
  const [row, created] = await DonationSetting.findOrCreate({
    where: { id: 1 },
    defaults: {
      id: 1,
      currency: "usd",
      suggestedAmounts: [25, 50, 100, 250],
      minimumAmountCents: 500,
      maximumAmountCents: 2500000,
      thankYouMessage: {
        en: "Thank you for your gift. Your support brings hope, care and practical help to people who need it most.",
        fr: "Merci pour votre don. Votre soutien apporte espoir, soins et aide concrète à ceux qui en ont le plus besoin.",
        es: "Gracias por tu donación. Tu apoyo lleva esperanza, cuidado y ayuda práctica a quienes más lo necesitan.",
      },
      receiptIntro: { en: receipts.COPY.en.intro, fr: receipts.COPY.fr.intro, es: receipts.COPY.es.intro },
      receiptIrsStatement: { en: receipts.COPY.en.irs, fr: receipts.COPY.fr.irs, es: receipts.COPY.es.irs },
      receiptSignoff: { en: receipts.COPY.en.signoff, fr: receipts.COPY.fr.signoff, es: receipts.COPY.es.signoff },
      receiptSenderName: "Be Real Humanitarian Works Inc.",
      receiptReplyTo: null,
      statementDescriptor: "BE REAL HUMANITARIAN",
    },
  });
  if (created) console.log("[seed] donation settings created");
  return row;
}

const getSettings = () => ensureDonationDefaults();

async function publicConfig() {
  const [settings, site] = await Promise.all([getSettings(), SiteSetting.findByPk(1)]);
  return {
    enabled: site ? site.donateEnabled !== false : true,
    disabledMessage: site?.donateDisabledMessage || {},
    currency: settings.currency,
    suggestedAmounts: settings.suggestedAmounts,
    minimumAmountCents: settings.minimumAmountCents,
    maximumAmountCents: settings.maximumAmountCents,
    thankYouMessage: settings.thankYouMessage,
    mode: stripe.mode(),
  };
}

// ---- Checkout -----------------------------------------------------------------

const addEvent = (donation, type, data, actorName = null) => DonationEvent.create({ donationId: donation.id, type, data: data ?? null, actorName });

async function createCheckout({ amountCents, name, email, locale, anonymous, message, sourcePage, ip, userAgent }) {
  const config = await publicConfig();
  if (!config.enabled) throw ApiError.badRequest("Donations are paused at the moment");
  if (!Number.isInteger(amountCents) || amountCents < config.minimumAmountCents) {
    throw ApiError.badRequest(`The minimum donation is ${receipts.formatAmount(config.minimumAmountCents, config.currency, locale)}`, [{ field: "amount", message: "Below the minimum" }]);
  }
  if (amountCents > config.maximumAmountCents) {
    throw ApiError.badRequest(`For gifts above ${receipts.formatAmount(config.maximumAmountCents, config.currency, locale)}, please contact us`, [{ field: "amount", message: "Above the maximum" }]);
  }
  if (!stripe.isConfigured() && !stripe.isSimulated()) throw ApiError.badRequest("Online donations are not available yet");

  const settings = await getSettings();
  const site = await SiteSetting.findByPk(1);
  const donation = await Donation.create({
    status: "pending",
    provider: stripe.isConfigured() ? "stripe" : "simulated",
    amountCents,
    currency: config.currency,
    donorName: String(name).trim().slice(0, 160),
    donorEmail: String(email).trim().toLowerCase(),
    locale: LOCALES.includes(locale) ? locale : "en",
    anonymous: Boolean(anonymous),
    message: message ? String(message).trim().slice(0, 1000) : null,
    sourcePage: sourcePage || null,
    ip: ip || null,
    userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
  });

  let url;
  if (stripe.isConfigured()) {
    const session = await stripe.client.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      customer_email: donation.donorEmail,
      client_reference_id: String(donation.id),
      locale: donation.locale,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: config.currency,
            unit_amount: amountCents,
            product_data: { name: `Donation — ${site?.legalName || "Be Real Humanitarian Works Inc."}` },
          },
        },
      ],
      payment_intent_data: {
        description: `Donation #${donation.id}`,
        metadata: { donationId: String(donation.id) },
        ...(settings.statementDescriptor ? { statement_descriptor_suffix: settings.statementDescriptor.slice(0, 22) } : {}),
      },
      metadata: { donationId: String(donation.id), locale: donation.locale },
      success_url: `${siteUrl}/${donation.locale}/donate/thank-you?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${donation.locale}/donate?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    donation.providerSessionId = session.id;
    url = session.url;
  } else {
    donation.providerSessionId = `sim_${crypto.randomBytes(12).toString("base64url")}`;
    url = `${siteUrl}/${donation.locale}/donate/simulate?session=${donation.providerSessionId}`;
  }
  await donation.save();
  await addEvent(donation, "checkout_created", { provider: donation.provider, mode: stripe.mode() });
  return { donation, url };
}

// ---- State changes (idempotent) -----------------------------------------------

async function markPaid(donation, { paymentIntentId, chargeId, feeCents, paidAt } = {}) {
  if (PAID_STATUSES.includes(donation.status)) return donation;
  await sequelize.transaction(async (transaction) => {
    await donation.reload({ transaction, lock: transaction.LOCK.UPDATE });
    if (PAID_STATUSES.includes(donation.status)) return;
    donation.status = "paid";
    donation.paidAt = paidAt ? new Date(paidAt) : new Date();
    donation.providerPaymentIntentId = paymentIntentId || donation.providerPaymentIntentId;
    donation.providerChargeId = chargeId || donation.providerChargeId;
    if (feeCents !== undefined && feeCents !== null) donation.feeCents = feeCents;
    donation.receiptNumber = await receipts.nextReceiptNumber(donation.paidAt, transaction);
    await donation.save({ transaction });
  });
  await addEvent(donation, "paid", { receiptNumber: donation.receiptNumber, paymentIntentId: donation.providerPaymentIntentId, feeCents: donation.feeCents });

  try {
    await receipts.sendReceipt(donation, await getSettings());
  } catch (error) {
    console.error("[donations] receipt email failed", error.message);
    await addEvent(donation, "receipt_failed", { error: error.message });
  }
  return donation;
}

async function markFailed(donation, reason = "expired") {
  if (donation.status !== "pending") return donation;
  donation.status = reason === "failed" ? "failed" : "expired";
  await donation.save();
  await addEvent(donation, donation.status, null);
  return donation;
}

async function applyRefund(donation, { refundedCents, chargeId, reason } = {}) {
  const total = Math.min(Number(refundedCents) || 0, donation.amountCents);
  if (total === donation.refundedCents && donation.status !== "paid") return donation;
  donation.refundedCents = total;
  donation.refundedAt = new Date();
  donation.providerChargeId = chargeId || donation.providerChargeId;
  donation.status = total >= donation.amountCents ? "refunded" : total > 0 ? "partially_refunded" : donation.status;
  await donation.save();
  await addEvent(donation, "refunded", { refundedCents: total, reason: reason || null });
  return donation;
}

// ---- Stripe webhook ------------------------------------------------------------

async function feeFor(paymentIntentId) {
  if (!stripe.client || !paymentIntentId) return { feeCents: null, chargeId: null };
  try {
    const pi = await stripe.client.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = pi.latest_charge;
    const fee = charge && charge.balance_transaction && typeof charge.balance_transaction === "object" ? charge.balance_transaction.fee : null;
    return { feeCents: fee ?? null, chargeId: charge?.id ?? null };
  } catch (error) {
    console.warn("[donations] could not read the Stripe fee:", error.message);
    return { feeCents: null, chargeId: null };
  }
}

async function findByEvent(object) {
  if (object.object === "checkout.session") {
    return (await Donation.findOne({ where: { providerSessionId: object.id } })) || (object.client_reference_id ? Donation.findByPk(Number(object.client_reference_id)) : null);
  }
  if (object.object === "charge") {
    if (object.payment_intent) {
      const byPi = await Donation.findOne({ where: { providerPaymentIntentId: object.payment_intent } });
      if (byPi) return byPi;
    }
    if (object.metadata?.donationId) return Donation.findByPk(Number(object.metadata.donationId));
  }
  return null;
}

// Each Stripe event is recorded once; re-deliveries are acknowledged but skipped.
async function handleStripeEvent(event) {
  const [record, created] = await StripeEvent.findOrCreate({
    where: { eventId: event.id },
    defaults: { type: event.type, livemode: Boolean(event.livemode), processed: false, summary: { object: event.data?.object?.object, id: event.data?.object?.id } },
  });
  if (!created && record.processed) return { skipped: true };

  const object = event.data.object;
  try {
    const donation = await findByEvent(object);
    record.donationId = donation?.id ?? null;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (donation && object.payment_status === "paid") {
          const { feeCents, chargeId } = await feeFor(object.payment_intent);
          await markPaid(donation, { paymentIntentId: object.payment_intent, chargeId, feeCents });
        }
        break;
      }
      case "checkout.session.async_payment_failed":
        if (donation) await markFailed(donation, "failed");
        break;
      case "checkout.session.expired":
        if (donation) await markFailed(donation, "expired");
        break;
      case "charge.refunded":
        if (donation) await applyRefund(donation, { refundedCents: object.amount_refunded, chargeId: object.id });
        break;
      case "charge.dispute.created":
        if (donation) await addEvent(donation, "dispute_opened", { disputeId: object.id, amount: object.amount, reason: object.reason });
        break;
      default:
        break;
    }
    record.processed = true;
    await record.save();
    return { processed: true, donationId: record.donationId };
  } catch (error) {
    record.error = error.message;
    await record.save();
    throw error;
  }
}

// ---- Reporting -----------------------------------------------------------------

const BANDS = [
  { key: "under25", label: "Under $25", min: 0, max: 2499 },
  { key: "25to99", label: "$25 – $99", min: 2500, max: 9999 },
  { key: "100to249", label: "$100 – $249", min: 10000, max: 24999 },
  { key: "250to999", label: "$250 – $999", min: 25000, max: 99999 },
  { key: "1000plus", label: "$1,000 and above", min: 100000, max: Infinity },
];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function totals(where) {
  const rows = await Donation.findAll({
    attributes: [
      [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("amountCents")), 0), "gross"],
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("feeCents")), 0), "fees"],
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("refundedCents")), 0), "refunded"],
    ],
    where: { status: { [Op.in]: PAID_STATUSES }, ...where },
    raw: true,
  });
  const r = rows[0] || {};
  const gross = Number(r.gross || 0);
  const fees = Number(r.fees || 0);
  const refunded = Number(r.refunded || 0);
  return { count: Number(r.count || 0), grossCents: gross, feeCents: fees, refundedCents: refunded, netCents: gross - fees - refunded };
}

async function summary({ year } = {}) {
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y + 1, 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = startOfDay(now);

  const [todayT, monthT, yearT, allT] = await Promise.all([
    totals({ paidAt: { [Op.gte]: today } }),
    totals({ paidAt: { [Op.gte]: monthStart } }),
    totals({ paidAt: { [Op.gte]: yearStart, [Op.lt]: yearEnd } }),
    totals({}),
  ]);

  const paid = await Donation.findAll({ where: { status: { [Op.in]: PAID_STATUSES }, paidAt: { [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1) } }, attributes: ["amountCents", "feeCents", "refundedCents", "paidAt", "locale", "sourcePage"], raw: true });

  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, count: 0, grossCents: 0, netCents: 0 });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, { count: 0, grossCents: 0 }]));
  const byBand = Object.fromEntries(BANDS.map((b) => [b.key, { label: b.label, count: 0, grossCents: 0 }]));
  const byPage = {};
  for (const row of paid) {
    const d = new Date(row.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = byMonth.get(key);
    if (m) {
      m.count += 1;
      m.grossCents += row.amountCents;
      m.netCents += row.amountCents - (row.feeCents || 0) - (row.refundedCents || 0);
    }
    if (byLocale[row.locale]) {
      byLocale[row.locale].count += 1;
      byLocale[row.locale].grossCents += row.amountCents;
    }
    const band = BANDS.find((b) => row.amountCents >= b.min && row.amountCents <= b.max);
    if (band) {
      byBand[band.key].count += 1;
      byBand[band.key].grossCents += row.amountCents;
    }
    const page = row.sourcePage ? row.sourcePage.replace(/^https?:\/\/[^/]+/, "").split("?")[0] || "/" : "unknown";
    byPage[page] = byPage[page] || { count: 0, grossCents: 0 };
    byPage[page].count += 1;
    byPage[page].grossCents += row.amountCents;
  }

  return {
    year: y,
    currency: "usd",
    mode: stripe.mode(),
    periods: { today: todayT, month: monthT, year: yearT, allTime: allT },
    months,
    byLocale,
    byBand,
    byPage,
    payouts: await stripe.payouts(),
  };
}

module.exports = { PAID_STATUSES, ensureDonationDefaults, getSettings, publicConfig, createCheckout, markPaid, markFailed, applyRefund, handleStripeEvent, summary, addEvent };
