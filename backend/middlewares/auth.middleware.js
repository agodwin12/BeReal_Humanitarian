const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const { User } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

// Bearer JWT → req.user (fresh from the database, so a deactivated account
// loses access immediately even with a valid token).
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret);
  } catch {
    throw ApiError.unauthorized("Invalid or expired session");
  }

  const user = await User.findByPk(payload.sub);
  if (!user || user.status !== "active") throw ApiError.unauthorized("Invalid session");

  req.user = user;
  next();
});

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

module.exports = { authenticate, authorize };
