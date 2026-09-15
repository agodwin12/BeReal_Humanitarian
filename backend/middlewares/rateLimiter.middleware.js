const rateLimit = require("express-rate-limit");

const message = { success: false, message: "Too many requests, please try again later." };

// Login / password-reset endpoints: slows credential guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

// Public forms (Phase B): generous for humans, hostile to scripts.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

// One-click unsubscribe links: token-guarded and idempotent, so a looser
// window than the forms — a shared office IP must never get locked out of
// leaving the list.
const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

// AI assistant: each turn costs a model call. Plenty for a real conversation,
// a wall for scripts.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

module.exports = { authLimiter, formLimiter, unsubscribeLimiter, chatLimiter };
