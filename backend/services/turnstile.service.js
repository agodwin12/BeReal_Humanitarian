const { turnstile } = require("../config/env");

// Cloudflare Turnstile server-side check. Until the site keys exist the
// secret is empty and every submission passes (honeypot + rate limit still apply).
async function verifyTurnstile(token, remoteIp) {
  if (!turnstile.secretKey) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: "turnstile_missing" };

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstile.secretKey, response: token, remoteip: remoteIp || "" }),
    });
    const data = await response.json();
    return data.success ? { ok: true } : { ok: false, reason: "turnstile_failed" };
  } catch (error) {
    console.error("[turnstile] verification error", error.message);
    // Fail open on network errors: a lost message is worse than one spam row.
    return { ok: true, skipped: true };
  }
}

module.exports = { verifyTurnstile };
