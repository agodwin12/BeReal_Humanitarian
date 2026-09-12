const crypto = require("crypto");
const { Op } = require("sequelize");

const { siteUrl, isProd } = require("../config/env");
const { LOCALES } = require("../config/content");
const { sequelize, Donation, DonationEvent, DonationSetting, DonationSubscription, SiteSetting, StripeEvent } = require("../models");
const ApiError = require("../utils/apiError");
const stripe = require("./stripe.service");
const receipts = require("./receipts.service");

const PAID_STATUSES = ["paid", "partially_refunded", "refunded"];
const FREQUENCIES = ["one_time", "monthly"];
const OPEN_SUBSCRIPTION_STATUSES = ["active", "past_due"];

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
      monthlyEnabled: true,
      monthlySuggestedAmounts: [10, 25, 50, 100],
      feeCoverEnabled: false,
      feeCoverPercentBp: 290,
      feeCoverFixedCents: 30,
      feeCoverDefaultChecked: false,
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

// Gross-up so that, after Stripe takes percent + fixed, the organization keeps
// the gift the donor chose: total = (gift + fixed) / (1 - percent).
function feeCoverFor(baseCents, settings) {
  const pct = Math.max(0, Number(settings.feeCoverPercentBp) || 0) / 10000;
  const fixed = Math.max(0, Number(settings.feeCoverFixedCents) || 0);
  if (pct >= 1) return 0;
  const total = Math.ceil((baseCents + fixed) / (1 - pct));
  return Math.max(0, total - baseCents);
}

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
    monthly: { enabled: settings.monthlyEnabled !== false, suggestedAmounts: settings.monthlySuggestedAmounts || [] },
    feeCover: {
      enabled: Boolean(settings.feeCoverEnabled),
      percentBp: settings.feeCoverPercentBp,
      fixedCents: settings.feeCoverFixedCents,
      defaultChecked: Boolean(settings.feeCoverDefaultChecked),
    },
    mode: stripe.mode(),
  };
}

// ---- Timeline -------------------------------------------------------------------

const addEvent = (donation, type, data, actorName = null) => DonationEvent.create({ donationId: donation.id, type, data: data ?? null, actorName });
const addSubscriptionEvent = (subscription, type, data, actorName = null) => DonationEvent.create({ subscriptionId: subscription.id, type, data: data ?? null, actorName });

// ---- Checkout -----------------------------------------------------------------

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function createCheckout({ amountCents, frequency = "one_time", coverFees = false, name, email, locale, anonymous, message, sourcePage, ip, userAgent }) {
  const config = await publicConfig();
  if (!config.enabled) throw ApiError.badRequest("Donations are paused at the moment");
  if (!FREQUENCIES.includes(frequency)) throw ApiError.badRequest("Choose a one-time or a monthly gift");
  if (frequency === "monthly" && !config.monthly.enabled) throw ApiError.badRequest("Monthly gifts are not available at the moment");
  if (!Number.isInteger(amountCents) || amountCents < config.minimumAmountCents) {
    throw ApiError.badRequest(`The minimum donation is ${receipts.formatAmount(config.minimumAmountCents, config.currency, locale)}`, [{ field: "amount", message: "Below the minimum" }]);
  }
  if (amountCents > config.maximumAmountCents) {
    throw ApiError.badRequest(`For gifts above ${receipts.formatAmount(config.maximumAmountCents, config.currency, locale)}, please contact us`, [{ field: "amount", message: "Above the maximum" }]);
  }
  if (!stripe.isConfigured() && !stripe.isSimulated()) throw ApiError.badRequest("Online donations are not available yet");

  const settings = await getSettings();
  const site = await SiteSetting.findByPk(1);
  const legalName = site?.legalName || "Be Real Humanitarian Works Inc.";
  const cover = config.feeCover.enabled && Boolean(coverFees);
  const feeCoverCents = cover ? feeCoverFor(amountCents, settings) : 0;
  const totalCents = amountCents + feeCoverCents;
  const provider = stripe.isConfigured() ? "stripe" : "simulated";
  const donor = {
    donorName: String(name).trim().slice(0, 160),
    donorEmail: String(email).trim().toLowerCase(),
    locale: LOCALES.includes(locale) ? locale : "en",
    anonymous: Boolean(anonymous),
    message: message ? String(message).trim().slice(0, 1000) : null,
  };

  let subscription = null;
  if (frequency === "monthly") {
    subscription = await DonationSubscription.create({
      status: "pending",
      provider,
      amountCents: totalCents,
      feeCoverCents,
      currency: config.currency,
      interval: "month",
      manageToken: crypto.randomBytes(24).toString("base64url"),
      ...donor,
    });
  }

  const donation = await Donation.create({
    status: "pending",
    provider,
    frequency,
    subscriptionId: subscription?.id ?? null,
    amountCents: totalCents,
    coverFees: cover,
    feeCoverCents,
    currency: config.currency,
    ...donor,
    sourcePage: sourcePage || null,
    ip: ip || null,
    userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
  });

  let url;
  if (provider === "stripe") {
    const common = {
      customer_email: donation.donorEmail,
      client_reference_id: String(donation.id),
      locale: donation.locale,
      metadata: { donationId: String(donation.id), locale: donation.locale, frequency, ...(subscription ? { subscriptionId: String(subscription.id) } : {}) },
      success_url: `${siteUrl}/${donation.locale}/donate/thank-you?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${donation.locale}/donate?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    };
    const session =
      frequency === "monthly"
        ? await stripe.client.checkout.sessions.create({
            ...common,
            mode: "subscription",
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: config.currency,
                  unit_amount: totalCents,
                  recurring: { interval: "month" },
                  product_data: { name: `Monthly donation — ${legalName}` },
                },
              },
            ],
            subscription_data: {
              description: `Monthly donation #${subscription.id}`,
              metadata: { subscriptionId: String(subscription.id), donationId: String(donation.id) },
            },
          })
        : await stripe.client.checkout.sessions.create({
            ...common,
            mode: "payment",
            submit_type: "donate",
            line_items: [
              {
                quantity: 1,
                price_data: { currency: config.currency, unit_amount: totalCents, product_data: { name: `Donation — ${legalName}` } },
              },
            ],
            payment_intent_data: {
              description: `Donation #${donation.id}`,
              metadata: { donationId: String(donation.id) },
              ...(settings.statementDescriptor ? { statement_descriptor_suffix: settings.statementDescriptor.slice(0, 22) } : {}),
            },
          });
    donation.providerSessionId = session.id;
    if (subscription) subscription.providerCheckoutSessionId = session.id;
    url = session.url;
  } else {
    donation.providerSessionId = `sim_${crypto.randomBytes(12).toString("base64url")}`;
    if (subscription) subscription.providerCheckoutSessionId = donation.providerSessionId;
    url = `${siteUrl}/${donation.locale}/donate/simulate?session=${donation.providerSessionId}`;
  }
  await donation.save();
  if (subscription) await subscription.save();
  await addEvent(donation, "checkout_created", { provider, mode: stripe.mode(), frequency, feeCoverCents });
  if (subscription) await addSubscriptionEvent(subscription, "created", { provider, amountCents: totalCents, feeCoverCents });
  return { donation, subscription, url };
}

// ---- State changes (idempotent) -----------------------------------------------

async function markPaid(donation, { paymentIntentId, chargeId, invoiceId, feeCents, paidAt, periodEnd, subscriptionIds } = {}) {
  if (PAID_STATUSES.includes(donation.status)) return donation;
  await sequelize.transaction(async (transaction) => {
    await donation.reload({ transaction, lock: transaction.LOCK.UPDATE });
    if (PAID_STATUSES.includes(donation.status)) return;
    donation.status = "paid";
    donation.paidAt = paidAt ? new Date(paidAt) : new Date();
    donation.providerPaymentIntentId = paymentIntentId || donation.providerPaymentIntentId;
    donation.providerChargeId = chargeId || donation.providerChargeId;
    donation.providerInvoiceId = invoiceId || donation.providerInvoiceId;
    if (feeCents !== undefined && feeCents !== null) donation.feeCents = feeCents;
    donation.receiptNumber = await receipts.nextReceiptNumber(donation.paidAt, transaction);
    await donation.save({ transaction });
  });
  await addEvent(donation, "paid", { receiptNumber: donation.receiptNumber, paymentIntentId: donation.providerPaymentIntentId, feeCents: donation.feeCents, frequency: donation.frequency });

  let subscription = null;
  if (donation.subscriptionId) {
    subscription = await DonationSubscription.findByPk(donation.subscriptionId);
    if (subscription) {
      if (["pending", "incomplete", "past_due"].includes(subscription.status)) subscription.status = "active";
      if (subscriptionIds?.providerSubscriptionId) subscription.providerSubscriptionId = subscriptionIds.providerSubscriptionId;
      if (subscriptionIds?.providerCustomerId) subscription.providerCustomerId = subscriptionIds.providerCustomerId;
      subscription.startedAt = subscription.startedAt || donation.paidAt;
      subscription.lastPaymentAt = donation.paidAt;
      subscription.paymentsCount = (subscription.paymentsCount || 0) + 1;
      subscription.currentPeriodEnd = periodEnd ? new Date(periodEnd) : addMonths(donation.paidAt, 1);
      await subscription.save();
      await addSubscriptionEvent(subscription, subscription.paymentsCount === 1 ? "started" : "payment_received", { donationId: donation.id, receiptNumber: donation.receiptNumber, paymentNumber: subscription.paymentsCount });
    }
  }

  try {
    await receipts.sendReceipt(donation, await getSettings(), { subscription });
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
  if (donation.subscriptionId) {
    const subscription = await DonationSubscription.findByPk(donation.subscriptionId);
    if (subscription && subscription.status === "pending") {
      subscription.status = "incomplete";
      await subscription.save();
      await addSubscriptionEvent(subscription, "checkout_abandoned", { reason: donation.status });
    }
  }
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

// ---- Subscriptions --------------------------------------------------------------

const STRIPE_SUB_STATUS = { active: "active", trialing: "active", past_due: "past_due", unpaid: "past_due", paused: "past_due", incomplete: "incomplete", incomplete_expired: "canceled", canceled: "canceled" };

// Stripe moved current_period_end from the subscription to its items (API 2025+).
function periodEndOf(stripeSubscription) {
  const unix = stripeSubscription?.current_period_end ?? stripeSubscription?.items?.data?.[0]?.current_period_end ?? null;
  return unix ? new Date(unix * 1000) : null;
}

// Same for the invoice's subscription and payment intent (invoice.parent / invoice.payments).
function invoiceSubscriptionId(invoice) {
  const parent = invoice?.parent?.subscription_details?.subscription;
  const legacy = invoice?.subscription;
  const value = parent ?? legacy;
  return typeof value === "string" ? value : value?.id ?? null;
}

async function paymentIntentForInvoice(invoice) {
  if (!invoice) return null;
  if (typeof invoice.payment_intent === "string") return invoice.payment_intent;
  if (invoice.payment_intent?.id) return invoice.payment_intent.id;
  if (!stripe.client) return null;
  try {
    const full = await stripe.client.invoices.retrieve(invoice.id, { expand: ["payments"] });
    const payment = (full.payments?.data || []).find((p) => p.status === "paid") || full.payments?.data?.[0];
    const pi = payment?.payment?.payment_intent;
    return typeof pi === "string" ? pi : pi?.id ?? null;
  } catch (error) {
    console.warn("[donations] could not read the invoice payment:", error.message);
    return null;
  }
}

async function syncSubscriptionFromStripe(subscription, stripeSubscription, { event = "synced" } = {}) {
  const before = subscription.status;
  subscription.providerSubscriptionId = stripeSubscription.id;
  if (stripeSubscription.customer) subscription.providerCustomerId = typeof stripeSubscription.customer === "string" ? stripeSubscription.customer : stripeSubscription.customer.id;
  const mapped = STRIPE_SUB_STATUS[stripeSubscription.status];
  if (mapped && !(mapped === "incomplete" && subscription.status === "active")) subscription.status = mapped;
  subscription.cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
  const periodEnd = periodEndOf(stripeSubscription);
  if (periodEnd) subscription.currentPeriodEnd = periodEnd;
  if (subscription.status === "canceled" && !subscription.canceledAt) {
    subscription.canceledAt = stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : new Date();
    subscription.canceledBy = subscription.canceledBy || "stripe";
    subscription.cancelReason = subscription.cancelReason || stripeSubscription.cancellation_details?.reason || null;
  }
  await subscription.save();
  if (before !== subscription.status) await addSubscriptionEvent(subscription, "status_changed", { from: before, to: subscription.status, via: event });
  return subscription;
}

async function cancelSubscription(subscription, { reason = null, actorName = null, by = "staff" } = {}) {
  if (subscription.status === "canceled") return subscription;
  if (subscription.provider === "stripe" && subscription.providerSubscriptionId && stripe.client) {
    try {
      await stripe.client.subscriptions.cancel(subscription.providerSubscriptionId, { cancellation_details: { comment: reason ? String(reason).slice(0, 160) : undefined } });
    } catch (error) {
      if (error.code !== "resource_missing") throw ApiError.badRequest(`Stripe could not cancel the subscription: ${error.message}`);
    }
  }
  const before = subscription.status;
  subscription.status = "canceled";
  subscription.canceledAt = new Date();
  subscription.cancelReason = reason ? String(reason).slice(0, 160) : null;
  subscription.canceledBy = by;
  subscription.cancelAtPeriodEnd = false;
  await subscription.save();
  await addSubscriptionEvent(subscription, "canceled", { from: before, reason: subscription.cancelReason, by }, actorName);
  return subscription;
}

// Stripe's hosted "manage my subscription" page (update card, cancel). Needs the
// customer portal to be configured once in the Stripe dashboard for live mode.
async function portalUrl(subscription) {
  if (subscription.provider !== "stripe" || !subscription.providerCustomerId || !stripe.client) return null;
  try {
    const session = await stripe.client.billingPortal.sessions.create({
      customer: subscription.providerCustomerId,
      return_url: `${siteUrl}/${subscription.locale}/donate/manage?token=${subscription.manageToken}`,
    });
    return session.url;
  } catch (error) {
    console.warn("[donations] customer portal unavailable:", error.message);
    return null;
  }
}

// One more monthly payment for a subscription: a fresh ledger row (used by the
// invoice.paid webhook and by the simulator).
async function recordRecurringPayment(subscription, { amountCents, invoiceId, paymentIntentId, chargeId, feeCents, paidAt, periodEnd, sourcePage = null } = {}) {
  if (invoiceId) {
    const existing = await Donation.findOne({ where: { providerInvoiceId: invoiceId } });
    if (existing) return existing;
  }
  const donation = await Donation.create({
    status: "pending",
    provider: subscription.provider,
    frequency: "monthly",
    subscriptionId: subscription.id,
    amountCents: amountCents || subscription.amountCents,
    coverFees: subscription.feeCoverCents > 0,
    feeCoverCents: subscription.feeCoverCents,
    currency: subscription.currency,
    donorName: subscription.donorName,
    donorEmail: subscription.donorEmail,
    locale: subscription.locale,
    anonymous: subscription.anonymous,
    message: null,
    sourcePage,
    providerInvoiceId: invoiceId || null,
  });
  await addEvent(donation, "recurring_charge", { subscriptionId: subscription.id, invoiceId: invoiceId || null });
  return markPaid(donation, { paymentIntentId, chargeId, invoiceId, feeCents, paidAt, periodEnd });
}

async function simulateNextCharge(subscription) {
  if (isProd || stripe.isConfigured()) throw ApiError.forbidden("Simulated charges are disabled");
  if (subscription.provider !== "simulated") throw ApiError.badRequest("Only simulated subscriptions can be charged here");
  if (!OPEN_SUBSCRIPTION_STATUSES.includes(subscription.status)) throw ApiError.badRequest("This monthly gift is not active");
  const n = (subscription.paymentsCount || 0) + 1;
  const feeCents = Math.round(subscription.amountCents * 0.029 + 30);
  return recordRecurringPayment(subscription, {
    invoiceId: `in_sim_${subscription.id}_${n}`,
    paymentIntentId: `pi_sim_${subscription.id}_${n}`,
    chargeId: `ch_sim_${subscription.id}_${n}`,
    feeCents,
    periodEnd: addMonths(new Date(), 1),
  });
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
  if (object.object === "invoice") {
    return Donation.findOne({ where: { providerInvoiceId: object.id } });
  }
  return null;
}

async function findSubscriptionByEvent(object) {
  if (object.object === "subscription") {
    return (await DonationSubscription.findOne({ where: { providerSubscriptionId: object.id } })) || (object.metadata?.subscriptionId ? DonationSubscription.findByPk(Number(object.metadata.subscriptionId)) : null);
  }
  if (object.object === "invoice") {
    const subId = invoiceSubscriptionId(object);
    if (!subId) return null;
    const bySub = await DonationSubscription.findOne({ where: { providerSubscriptionId: subId } });
    if (bySub) return bySub;
    const meta = object.parent?.subscription_details?.metadata || object.subscription_details?.metadata || {};
    return meta.subscriptionId ? DonationSubscription.findByPk(Number(meta.subscriptionId)) : null;
  }
  if (object.object === "checkout.session" && object.mode === "subscription") {
    return (await DonationSubscription.findOne({ where: { providerCheckoutSessionId: object.id } })) || (object.metadata?.subscriptionId ? DonationSubscription.findByPk(Number(object.metadata.subscriptionId)) : null);
  }
  return null;
}

async function handleCheckoutCompleted(object, donation) {
  if (!donation || object.payment_status !== "paid") return;
  if (object.mode === "subscription") {
    const subscription = (await findSubscriptionByEvent(object)) || (donation.subscriptionId ? await DonationSubscription.findByPk(donation.subscriptionId) : null);
    const stripeSubId = typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
    const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
    let periodEnd = null;
    if (stripeSubId && stripe.client) {
      try {
        const stripeSub = await stripe.client.subscriptions.retrieve(stripeSubId);
        periodEnd = periodEndOf(stripeSub);
        if (subscription) await syncSubscriptionFromStripe(subscription, stripeSub, { event: "checkout.session.completed" });
      } catch (error) {
        console.warn("[donations] could not read the subscription:", error.message);
      }
    }
    const invoiceId = typeof object.invoice === "string" ? object.invoice : object.invoice?.id;
    let paymentIntentId = null;
    if (invoiceId && stripe.client) {
      try {
        paymentIntentId = await paymentIntentForInvoice(await stripe.client.invoices.retrieve(invoiceId));
      } catch (error) {
        console.warn("[donations] could not read the first invoice:", error.message);
      }
    }
    const { feeCents, chargeId } = await feeFor(paymentIntentId);
    await markPaid(donation, { paymentIntentId, chargeId, invoiceId, feeCents, periodEnd, subscriptionIds: { providerSubscriptionId: stripeSubId, providerCustomerId: customerId } });
    return;
  }
  const { feeCents, chargeId } = await feeFor(object.payment_intent);
  await markPaid(donation, { paymentIntentId: object.payment_intent, chargeId, feeCents });
}

async function handleInvoicePaid(invoice) {
  const subscription = await findSubscriptionByEvent(invoice);
  if (!subscription) return null;
  if (await Donation.findOne({ where: { providerInvoiceId: invoice.id } })) return subscription;
  const paymentIntentId = await paymentIntentForInvoice(invoice);
  const { feeCents, chargeId } = await feeFor(paymentIntentId);
  const paidAt = invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date();
  const periodEnd = invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : null;
  const stripeSubId = invoiceSubscriptionId(invoice);
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  // The first invoice belongs to the donation created at checkout (whichever
  // of the two webhooks arrives first wins; the other one is a no-op).
  if (invoice.billing_reason === "subscription_create") {
    const first = await Donation.findOne({ where: { subscriptionId: subscription.id, frequency: "monthly" }, order: [["createdAt", "ASC"]] });
    if (first) {
      if (!PAID_STATUSES.includes(first.status)) {
        await markPaid(first, { paymentIntentId, chargeId, invoiceId: invoice.id, feeCents, paidAt, periodEnd, subscriptionIds: { providerSubscriptionId: stripeSubId, providerCustomerId: customerId } });
      } else if (!first.providerInvoiceId) {
        first.providerInvoiceId = invoice.id;
        await first.save();
      }
      return subscription;
    }
  }
  if (stripeSubId && !subscription.providerSubscriptionId) subscription.providerSubscriptionId = stripeSubId;
  if (customerId && !subscription.providerCustomerId) subscription.providerCustomerId = customerId;
  await subscription.save();
  await recordRecurringPayment(subscription, { amountCents: invoice.amount_paid || subscription.amountCents, invoiceId: invoice.id, paymentIntentId, chargeId, feeCents, paidAt, periodEnd });
  return subscription;
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
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(object, donation);
        break;
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
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const subscription = await handleInvoicePaid(object);
        if (subscription) record.summary = { ...(record.summary || {}), subscriptionId: subscription.id };
        break;
      }
      case "invoice.payment_failed": {
        const subscription = await findSubscriptionByEvent(object);
        if (subscription && OPEN_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
          subscription.status = "past_due";
          await subscription.save();
          await addSubscriptionEvent(subscription, "payment_failed", { invoiceId: object.id, attempt: object.attempt_count ?? null, nextAttempt: object.next_payment_attempt ? new Date(object.next_payment_attempt * 1000) : null });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = await findSubscriptionByEvent(object);
        if (subscription) await syncSubscriptionFromStripe(subscription, object, { event: event.type });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = await findSubscriptionByEvent(object);
        if (subscription) await syncSubscriptionFromStripe(subscription, { ...object, status: "canceled" }, { event: event.type });
        break;
      }
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
      [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("feeCoverCents")), 0), "feeCover"],
    ],
    where: { status: { [Op.in]: PAID_STATUSES }, ...where },
    raw: true,
  });
  const r = rows[0] || {};
  const gross = Number(r.gross || 0);
  const fees = Number(r.fees || 0);
  const refunded = Number(r.refunded || 0);
  return { count: Number(r.count || 0), grossCents: gross, feeCents: fees, refundedCents: refunded, feeCoverCents: Number(r.feeCover || 0), netCents: gross - fees - refunded };
}

async function recurringSummary() {
  const open = await DonationSubscription.findAll({ where: { status: { [Op.in]: OPEN_SUBSCRIPTION_STATUSES } }, attributes: ["status", "amountCents", "createdAt"], raw: true });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canceled = await DonationSubscription.count({ where: { status: "canceled" } });
  return {
    active: open.filter((s) => s.status === "active").length,
    pastDue: open.filter((s) => s.status === "past_due").length,
    canceled,
    monthlyCommittedCents: open.filter((s) => s.status === "active").reduce((n, s) => n + s.amountCents, 0),
    newThisMonth: open.filter((s) => new Date(s.createdAt) >= monthStart).length,
  };
}

async function summary({ year } = {}) {
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const yearStart = new Date(y, 0, 1);
  const yearEnd = new Date(y + 1, 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = startOfDay(now);

  const [todayT, monthT, yearT, allT, recurring] = await Promise.all([
    totals({ paidAt: { [Op.gte]: today } }),
    totals({ paidAt: { [Op.gte]: monthStart } }),
    totals({ paidAt: { [Op.gte]: yearStart, [Op.lt]: yearEnd } }),
    totals({}),
    recurringSummary(),
  ]);

  const paid = await Donation.findAll({ where: { status: { [Op.in]: PAID_STATUSES }, paidAt: { [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1) } }, attributes: ["amountCents", "feeCents", "refundedCents", "paidAt", "locale", "sourcePage", "frequency"], raw: true });

  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, count: 0, grossCents: 0, netCents: 0, monthlyCents: 0 });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, { count: 0, grossCents: 0 }]));
  const byBand = Object.fromEntries(BANDS.map((b) => [b.key, { label: b.label, count: 0, grossCents: 0 }]));
  const byFrequency = { one_time: { count: 0, grossCents: 0 }, monthly: { count: 0, grossCents: 0 } };
  const byPage = {};
  for (const row of paid) {
    const d = new Date(row.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = byMonth.get(key);
    if (m) {
      m.count += 1;
      m.grossCents += row.amountCents;
      m.netCents += row.amountCents - (row.feeCents || 0) - (row.refundedCents || 0);
      if (row.frequency === "monthly") m.monthlyCents += row.amountCents;
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
    const freq = byFrequency[row.frequency] || byFrequency.one_time;
    freq.count += 1;
    freq.grossCents += row.amountCents;
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
    byFrequency,
    byPage,
    recurring,
    payouts: await stripe.payouts(),
  };
}

module.exports = {
  PAID_STATUSES,
  FREQUENCIES,
  OPEN_SUBSCRIPTION_STATUSES,
  ensureDonationDefaults,
  getSettings,
  publicConfig,
  feeCoverFor,
  createCheckout,
  markPaid,
  markFailed,
  applyRefund,
  cancelSubscription,
  portalUrl,
  recordRecurringPayment,
  simulateNextCharge,
  handleStripeEvent,
  summary,
  recurringSummary,
  addEvent,
  addSubscriptionEvent,
};
