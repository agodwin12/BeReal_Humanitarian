const { body } = require("express-validator");

const password = body("password")
  .isString()
  .isLength({ min: 10, max: 128 })
  .withMessage("Password must be at least 10 characters");

const token = body("token").isString().trim().isLength({ min: 20, max: 200 }).withMessage("Invalid token");

module.exports = {
  loginRules: [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isString().notEmpty().withMessage("Password is required"),
  ],
  forgotPasswordRules: [body("email").isEmail().withMessage("A valid email is required").normalizeEmail()],
  resetPasswordRules: [token, password],
  acceptInviteRules: [token, password],
  twoFactorLoginRules: [
    body("challengeToken").isString().notEmpty().withMessage("Sign-in step missing"),
    body("code").isString().trim().isLength({ min: 6, max: 12 }).withMessage("Enter the 6-digit code or a recovery code"),
  ],
  twoFactorCodeRules: [body("code").isString().trim().isLength({ min: 6, max: 12 }).withMessage("Enter the 6-digit code")],
  twoFactorDisableRules: [
    body("password").isString().notEmpty().withMessage("Password is required"),
    body("code").isString().trim().isLength({ min: 6, max: 12 }).withMessage("Enter the 6-digit code or a recovery code"),
  ],
  changePasswordRules: [
    body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isString()
      .isLength({ min: 10, max: 128 })
      .withMessage("New password must be at least 10 characters"),
  ],
};
