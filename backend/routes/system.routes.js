const express = require("express");
const { query } = require("express-validator");

const ctrl = require("../controllers/system.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");

// System screen (Super Admin only): health, email delivery log, content export.
const router = express.Router();
router.use(authenticate, authorize("super_admin"));

router.get("/status", ctrl.status);
router.get("/email-logs", query("status").optional().isIn(["all", "sent", "failed", "console"]), query("q").optional().isString().isLength({ max: 120 }), validate, ctrl.emailLogs);
router.get("/export", ctrl.exportContent);

module.exports = router;
