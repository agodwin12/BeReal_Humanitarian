const stripe = require("../services/stripe.service");
const donations = require("../services/donations.service");

// POST /api/donations/webhook — raw body (see app.js). Stripe retries on any
// non-2xx, so the handler only fails when something is genuinely wrong.
module.exports = async function webhook(req, res) {
  if (!stripe.isConfigured()) return res.status(503).json({ success: false, message: "Stripe is not configured" });
  if (!stripe.webhookSecret) return res.status(503).json({ success: false, message: "STRIPE_WEBHOOK_SECRET is not configured" });

  let event;
  try {
    event = stripe.client.webhooks.constructEvent(req.body, req.get("stripe-signature"), stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ success: false, message: `Webhook signature verification failed: ${error.message}` });
  }

  try {
    const result = await donations.handleStripeEvent(event);
    return res.json({ success: true, received: true, ...result });
  } catch (error) {
    console.error("[stripe] webhook processing failed", event.id, error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
