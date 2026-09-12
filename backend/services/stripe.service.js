const Stripe = require("stripe");

const { stripe: cfg, isProd } = require("../config/env");

// One Stripe client for the API. Without STRIPE_SECRET_KEY (and outside
// production) donations run in "simulated" mode: the public flow, receipts
// and the backoffice all work, but no money moves and every screen says so.
const client = cfg.secretKey ? new Stripe(cfg.secretKey, { maxNetworkRetries: 2 }) : null;

function mode() {
  if (client) return cfg.secretKey.startsWith("sk_live") ? "live" : "test";
  return "simulated";
}

const isConfigured = () => Boolean(client);
const isSimulated = () => !client && !isProd;

function dashboardUrl(path) {
  return `https://dashboard.stripe.com/${mode() === "live" ? "" : "test/"}${path}`;
}

// Balance + latest payouts for the donations screen (cached one minute).
let payoutCache = { at: 0, data: null };
async function payouts() {
  if (!client) return null;
  if (Date.now() - payoutCache.at < 60 * 1000) return payoutCache.data;
  try {
    const [balance, list] = await Promise.all([client.balance.retrieve(), client.payouts.list({ limit: 5 })]);
    const sum = (rows) => rows.filter((r) => r.currency === "usd").reduce((n, r) => n + r.amount, 0);
    payoutCache = {
      at: Date.now(),
      data: {
        availableCents: sum(balance.available),
        pendingCents: sum(balance.pending),
        recent: list.data.map((p) => ({ id: p.id, amountCents: p.amount, status: p.status, arrivalDate: new Date(p.arrival_date * 1000), currency: p.currency })),
      },
    };
  } catch (error) {
    payoutCache = { at: Date.now(), data: { error: error.message } };
  }
  return payoutCache.data;
}

module.exports = { client, mode, isConfigured, isSimulated, dashboardUrl, payouts, webhookSecret: cfg.webhookSecret, publishableKey: cfg.publishableKey };
