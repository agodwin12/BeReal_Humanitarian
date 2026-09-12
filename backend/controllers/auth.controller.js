const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const { jwt: jwtConfig, backofficeUrl } = require("../config/env");
const { User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { generateToken, hashToken, expiresIn } = require("../utils/tokens");
const totp = require("../utils/totp");
const { sendEmail } = require("../services/email.service");
const { resetEmail } = require("../services/email.templates");

const TWO_FACTOR_ISSUER = "Be Real Backoffice";

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

// Short-lived token proving the password step passed; only /login/2fa accepts it.
const signChallenge = (user) => jwt.sign({ sub: user.id, purpose: "2fa" }, jwtConfig.secret, { expiresIn: "5m" });

function verifySecondFactor(user, code) {
  const secret = totp.decryptSecret(user.totpSecret);
  if (totp.verifyTotp(secret, code)) return { ok: true, method: "totp" };
  const hash = totp.hashRecoveryCode(code);
  const codes = Array.isArray(user.totpRecoveryCodes) ? user.totpRecoveryCodes : [];
  if (codes.includes(hash)) {
    user.totpRecoveryCodes = codes.filter((c) => c !== hash);
    return { ok: true, method: "recovery" };
  }
  return { ok: false };
}

async function finishLogin(req, res, user, meta) {
  user.lastLoginAt = new Date();
  await user.save();
  req.user = user;
  await audit.record(req, { action: "auth.login", entity: "user", entityId: user.id, meta });
  return ok(res, { token: signToken(user), user: user.toSafeJSON() });
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email: String(email).toLowerCase() } });

  const valid =
    user && user.status === "active" && user.passwordHash && (await bcrypt.compare(password, user.passwordHash));

  if (!valid) {
    await audit.record(req, {
      action: "auth.login_failed",
      entity: "user",
      entityId: user?.id,
      meta: { email: String(email).toLowerCase() },
    });
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.totpSecret) {
    return ok(res, { requiresTwoFactor: true, challengeToken: signChallenge(user) });
  }
  return finishLogin(req, res, user);
});

// Second step of sign-in for accounts with 2FA: authenticator code or a recovery code.
exports.loginTwoFactor = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.challengeToken, jwtConfig.secret);
  } catch {
    throw ApiError.unauthorized("Your sign-in expired. Start again.");
  }
  if (payload.purpose !== "2fa") throw ApiError.unauthorized("Invalid sign-in step");

  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== "active" || !user.totpSecret) throw ApiError.unauthorized("Invalid sign-in step");

  const result = verifySecondFactor(user, req.body.code);
  if (!result.ok) {
    req.user = null;
    await audit.record(req, { action: "auth.2fa_failed", entity: "user", entityId: user.id, meta: { actorName: user.name } });
    throw ApiError.unauthorized("That code is not valid. Try the next code from your app.");
  }
  return finishLogin(req, res, user, { twoFactor: result.method });
});

exports.me = asyncHandler(async (req, res) => ok(res, req.user.toSafeJSON()));

// ---- Two-factor setup (any signed-in user; recommended for Super Admins) ----

exports.twoFactorSetup = asyncHandler(async (req, res) => {
  if (req.user.totpSecret) throw ApiError.badRequest("Two-factor authentication is already enabled");
  const secret = totp.generateSecret();
  req.user.totpPendingSecret = totp.encryptSecret(secret);
  await req.user.save();
  return ok(res, { secret, otpauthUri: totp.otpauthUri({ secret, account: req.user.email, issuer: TWO_FACTOR_ISSUER }), issuer: TWO_FACTOR_ISSUER });
});

exports.twoFactorEnable = asyncHandler(async (req, res) => {
  if (req.user.totpSecret) throw ApiError.badRequest("Two-factor authentication is already enabled");
  if (!req.user.totpPendingSecret) throw ApiError.badRequest("Start the setup first");
  const secret = totp.decryptSecret(req.user.totpPendingSecret);
  if (!totp.verifyTotp(secret, req.body.code)) {
    throw ApiError.badRequest("That code is not valid. Scan the QR code again and enter the current 6-digit code.", [{ field: "code", message: "Invalid code" }]);
  }
  const recoveryCodes = totp.generateRecoveryCodes();
  req.user.totpSecret = req.user.totpPendingSecret;
  req.user.totpPendingSecret = null;
  req.user.totpEnabledAt = new Date();
  req.user.totpRecoveryCodes = recoveryCodes.map(totp.hashRecoveryCode);
  await req.user.save();
  await audit.record(req, { action: "auth.2fa_enabled", entity: "user", entityId: req.user.id });
  return ok(res, { enabled: true, recoveryCodes, user: req.user.toSafeJSON() });
});

exports.twoFactorDisable = asyncHandler(async (req, res) => {
  if (!req.user.totpSecret) throw ApiError.badRequest("Two-factor authentication is not enabled");
  const validPassword = await bcrypt.compare(req.body.password, req.user.passwordHash || "");
  if (!validPassword) throw ApiError.badRequest("Password is incorrect", [{ field: "password", message: "Password is incorrect" }]);
  if (!verifySecondFactor(req.user, req.body.code).ok) throw ApiError.badRequest("That code is not valid", [{ field: "code", message: "Invalid code" }]);
  req.user.totpSecret = null;
  req.user.totpPendingSecret = null;
  req.user.totpEnabledAt = null;
  req.user.totpRecoveryCodes = [];
  await req.user.save();
  await audit.record(req, { action: "auth.2fa_disabled", entity: "user", entityId: req.user.id });
  return ok(res, { enabled: false, user: req.user.toSafeJSON() });
});

exports.twoFactorRecoveryCodes = asyncHandler(async (req, res) => {
  if (!req.user.totpSecret) throw ApiError.badRequest("Two-factor authentication is not enabled");
  if (!verifySecondFactor(req.user, req.body.code).ok) throw ApiError.badRequest("That code is not valid", [{ field: "code", message: "Invalid code" }]);
  const recoveryCodes = totp.generateRecoveryCodes();
  req.user.totpRecoveryCodes = recoveryCodes.map(totp.hashRecoveryCode);
  await req.user.save();
  await audit.record(req, { action: "auth.2fa_recovery_codes_regenerated", entity: "user", entityId: req.user.id });
  return ok(res, { recoveryCodes, user: req.user.toSafeJSON() });
});

// ---- Password flows ------------------------------------------------------------

// Always answers 200 so the endpoint cannot be used to discover accounts.
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: String(req.body.email).toLowerCase(), status: "active" } });
  if (user) {
    const token = generateToken();
    user.resetTokenHash = hashToken(token);
    user.resetExpiresAt = expiresIn(2);
    await user.save();
    const link = `${backofficeUrl}/reset-password?token=${token}`;
    await sendEmail({ to: user.email, kind: "password_reset", ...resetEmail({ name: user.name, link }) });
    await audit.record(req, { action: "auth.password_reset_requested", entity: "user", entityId: user.id, meta: { actorName: user.name } });
  }
  return ok(res, { sent: true });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    where: { resetTokenHash: hashToken(token), resetExpiresAt: { [Op.gt]: new Date() }, status: { [Op.ne]: "disabled" } },
  });
  if (!user) throw ApiError.badRequest("This reset link is invalid or has expired");

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetTokenHash = null;
  user.resetExpiresAt = null;
  if (user.status === "invited") user.status = "active";
  await user.save();
  req.user = user;
  await audit.record(req, { action: "auth.password_reset", entity: "user", entityId: user.id });

  // Accounts with 2FA still need their code after a reset.
  if (user.totpSecret) return ok(res, { requiresTwoFactor: true, challengeToken: signChallenge(user) });
  return ok(res, { token: signToken(user), user: user.toSafeJSON() });
});

exports.acceptInvite = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    where: { inviteTokenHash: hashToken(token), inviteExpiresAt: { [Op.gt]: new Date() }, status: "invited" },
  });
  if (!user) throw ApiError.badRequest("This invitation is invalid or has expired");

  user.passwordHash = await bcrypt.hash(password, 12);
  user.inviteTokenHash = null;
  user.inviteExpiresAt = null;
  user.status = "active";
  user.lastLoginAt = new Date();
  await user.save();
  req.user = user;
  await audit.record(req, { action: "auth.invite_accepted", entity: "user", entityId: user.id });

  return ok(res, { token: signToken(user), user: user.toSafeJSON() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash || "");
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  await req.user.save();
  await audit.record(req, { action: "auth.password_changed", entity: "user", entityId: req.user.id });
  return ok(res, { changed: true });
});
