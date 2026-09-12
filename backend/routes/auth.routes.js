const express = require("express");

const ctrl = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimiter.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/auth.validator");

const router = express.Router();

router.post("/login", authLimiter, rules.loginRules, validate, ctrl.login);
router.post("/login/2fa", authLimiter, rules.twoFactorLoginRules, validate, ctrl.loginTwoFactor);
router.post("/forgot-password", authLimiter, rules.forgotPasswordRules, validate, ctrl.forgotPassword);
router.post("/reset-password", authLimiter, rules.resetPasswordRules, validate, ctrl.resetPassword);
router.post("/accept-invite", authLimiter, rules.acceptInviteRules, validate, ctrl.acceptInvite);

router.get("/me", authenticate, ctrl.me);
router.post("/change-password", authenticate, rules.changePasswordRules, validate, ctrl.changePassword);

// Two-factor authentication (Phase D)
router.post("/2fa/setup", authenticate, ctrl.twoFactorSetup);
router.post("/2fa/enable", authenticate, rules.twoFactorCodeRules, validate, ctrl.twoFactorEnable);
router.post("/2fa/disable", authenticate, rules.twoFactorDisableRules, validate, ctrl.twoFactorDisable);
router.post("/2fa/recovery-codes", authenticate, rules.twoFactorCodeRules, validate, ctrl.twoFactorRecoveryCodes);

module.exports = router;
