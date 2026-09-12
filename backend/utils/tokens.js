const crypto = require("crypto");

// One-time tokens (invites, password resets): the raw token goes in the email
// link, only its SHA-256 hash is stored — a database leak exposes nothing usable.
function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function expiresIn(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

module.exports = { generateToken, hashToken, expiresIn };
