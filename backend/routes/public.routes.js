const express = require("express");

const ctrl = require("../controllers/public.controller");
const donations = require("../controllers/publicDonations.controller");
const { formLimiter } = require("../middlewares/rateLimiter.middleware");
const validate = require("../middlewares/validate.middleware");
const donationRules = require("../validators/donations.validator");

// Consumed by the public website (no auth, cacheable). See public.controller.
const router = express.Router();

// Donations (Phase E)
router.get("/donations/config", donations.config);
router.post("/donations/checkout", formLimiter, donationRules.checkoutRules, validate, donations.checkout);
router.get("/donations/status", donations.status);
router.get("/donations/subscription", donationRules.subscriptionTokenQuery, validate, donations.subscription);
router.post("/donations/subscription/cancel", formLimiter, donationRules.subscriptionTokenRules, validate, donations.cancelSubscription);
router.post("/donations/subscription/portal", formLimiter, donationRules.subscriptionTokenRules, validate, donations.subscriptionPortal);
router.post("/donations/simulate/complete", donationRules.simulateRules, validate, donations.simulateComplete);
router.post("/donations/simulate/refund", donationRules.simulateRefundRules, validate, donations.simulateRefund);

router.get("/site-settings", ctrl.siteSettings);
router.get("/schema", ctrl.schema);
router.get("/messages/:locale", ctrl.messages);
router.get("/pages/:slug", ctrl.page);
router.get("/programs", ctrl.programs);
router.get("/team", ctrl.team);
router.get("/impact", ctrl.impact);
router.get("/gallery", require("../controllers/gallery.controller").publicList);
router.get("/legal/:slug", ctrl.legal);

module.exports = router;
