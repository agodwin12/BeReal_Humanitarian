const express = require("express");

const router = express.Router();

// Phase A
router.use("/auth", require("./auth.routes"));
router.use("/users", require("./users.routes"));
router.use("/audit-logs", require("./auditLogs.routes"));

// Phase B
router.use("/forms", require("./forms.routes")); // public
router.use("/form-submissions", require("./formSubmissions.routes"));
router.use("/newsletter", require("./newsletter.routes"));
router.use("/notification-settings", require("./notificationSettings.routes"));

// Phase C
const content = require("./content.routes");
router.use("/public", require("./public.routes")); // public, read-only
router.use("/site-settings", content.siteSettings);
router.use("/media", content.media);
router.use("/programs", content.programs);
router.use("/team-members", content.team);
router.use("/impact", content.impact);
router.use("/gallery", content.gallery);
router.use("/pages", content.pages);
router.use("/legal-pages", content.legal);

// Phase D
router.use("/translations", require("./translations.routes"));
router.use("/system", require("./system.routes"));

// Phase E (the Stripe webhook is mounted in app.js with a raw body parser)
const donationRoutes = require("./donations.routes");
router.use("/donations", donationRoutes.donations);
router.use("/donation-settings", donationRoutes.donationSettings);

// Website AI assistant (public widget endpoints are in public.routes.js)
const chatRoutes = require("./chat.routes");
router.use("/chat-settings", chatRoutes.chatSettings);
router.use("/chat-sessions", chatRoutes.chatSessions);

module.exports = router;
