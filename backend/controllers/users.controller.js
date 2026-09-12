const { Op } = require("sequelize");

const { backofficeUrl } = require("../config/env");
const { User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { generateToken, hashToken, expiresIn } = require("../utils/tokens");
const { parsePagination, paginationMeta } = require("../utils/pagination");
const { sendEmail } = require("../services/email.service");
const { inviteEmail, resetEmail } = require("../services/email.templates");

const ROLE_LABEL = { super_admin: "Super Admin", editor: "Editor", read_only: "Read-only" };

async function assertNotLastSuperAdmin(user) {
  if (user.role !== "super_admin" || user.status !== "active") return;
  const others = await User.count({ where: { role: "super_admin", status: "active", id: { [Op.ne]: user.id } } });
  if (others === 0) throw ApiError.badRequest("There must always be at least one active Super Admin");
}

async function issueInvite(user, invitedByName) {
  const token = generateToken();
  user.inviteTokenHash = hashToken(token);
  user.inviteExpiresAt = expiresIn(72);
  await user.save();
  const link = `${backofficeUrl}/accept-invite?token=${token}`;
  await sendEmail({
    to: user.email,
    kind: "invite",
    ...inviteEmail({ name: user.name, invitedBy: invitedByName, link, role: ROLE_LABEL[user.role] }),
  });
}

// Active colleagues, for "assign to" pickers (Editor and above).
exports.assignable = asyncHandler(async (req, res) => {
  const rows = await User.findAll({
    where: { status: "active" },
    attributes: ["id", "name", "email", "role"],
    order: [["name", "ASC"]],
  });
  return ok(res, rows);
});

exports.list = asyncHandler(async (req, res) => {
  const { q, role, status } = req.query;
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (q) where[Op.or] = [{ name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }];

  const pagination = parsePagination(req.query);
  const { rows, count } = await User.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    offset: pagination.offset,
    limit: pagination.limit,
  });
  return ok(res, rows.map((u) => u.toSafeJSON()), 200, paginationMeta(pagination, count));
});

exports.invite = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;
  const existing = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (existing) throw ApiError.conflict("A user with this email already exists");

  const user = await User.create({ name, email, role, status: "invited", invitedById: req.user.id });
  await issueInvite(user, req.user.name);
  await audit.record(req, { action: "users.invited", entity: "user", entityId: user.id, after: user.toSafeJSON() });
  return ok(res, user.toSafeJSON(), 201);
});

exports.resendInvite = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.status !== "invited") throw ApiError.badRequest("This user has already activated their account");
  await issueInvite(user, req.user.name);
  await audit.record(req, { action: "users.invite_resent", entity: "user", entityId: user.id });
  return ok(res, user.toSafeJSON());
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const before = user.toSafeJSON();
  const { name, role } = req.body;

  if (role && role !== user.role) {
    if (user.id === req.user.id) throw ApiError.badRequest("You cannot change your own role");
    if (user.role === "super_admin") await assertNotLastSuperAdmin(user);
    user.role = role;
  }
  if (name) user.name = name;
  await user.save();

  await audit.record(req, {
    action: role && role !== before.role ? "users.role_changed" : "users.updated",
    entity: "user",
    entityId: user.id,
    before,
    after: user.toSafeJSON(),
  });
  return ok(res, user.toSafeJSON());
});

exports.deactivate = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.id === req.user.id) throw ApiError.badRequest("You cannot deactivate your own account");
  await assertNotLastSuperAdmin(user);

  const before = user.toSafeJSON();
  user.status = "disabled";
  user.resetTokenHash = null;
  user.inviteTokenHash = null;
  await user.save();
  await audit.record(req, { action: "users.deactivated", entity: "user", entityId: user.id, before, after: user.toSafeJSON() });
  return ok(res, user.toSafeJSON());
});

exports.activate = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.status !== "disabled") throw ApiError.badRequest("This user is not deactivated");

  const before = user.toSafeJSON();
  // A disabled account that never set a password goes back to "invited".
  user.status = user.passwordHash ? "active" : "invited";
  await user.save();
  if (user.status === "invited") await issueInvite(user, req.user.name);
  await audit.record(req, { action: "users.activated", entity: "user", entityId: user.id, before, after: user.toSafeJSON() });
  return ok(res, user.toSafeJSON());
});

// Lock-out rescue: removes a colleague's authenticator so they can sign in
// with their password and set 2FA up again.
exports.resetTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (!user.totpSecret) throw ApiError.badRequest("Two-factor authentication is not enabled for this user");
  user.totpSecret = null;
  user.totpPendingSecret = null;
  user.totpEnabledAt = null;
  user.totpRecoveryCodes = [];
  await user.save();
  await audit.record(req, { action: "users.2fa_reset", entity: "user", entityId: user.id });
  return ok(res, user.toSafeJSON());
});

exports.forcePasswordReset = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.status !== "active") throw ApiError.badRequest("Only active users can be sent a password reset");

  const token = generateToken();
  user.resetTokenHash = hashToken(token);
  user.resetExpiresAt = expiresIn(2);
  await user.save();
  const link = `${backofficeUrl}/reset-password?token=${token}`;
  await sendEmail({ to: user.email, kind: "password_reset", ...resetEmail({ name: user.name, link }) });
  await audit.record(req, { action: "users.password_reset_forced", entity: "user", entityId: user.id });
  return ok(res, { sent: true });
});
