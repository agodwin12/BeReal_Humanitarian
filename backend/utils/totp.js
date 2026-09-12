const crypto = require("crypto");

const { jwt: jwtConfig } = require("../config/env");

// Time-based one-time passwords (RFC 6238 / RFC 4226) with nothing but Node's
// crypto: 6 digits, 30-second steps, SHA-1 — what Google Authenticator, Authy,
// 1Password and Microsoft Authenticator expect.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  if (bits.length % 5) out += ALPHABET[parseInt(bits.slice(-(bits.length % 5)).padEnd(5, "0"), 2)];
  return out;
}

function base32Decode(text) {
  const clean = String(text).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) bits += ALPHABET.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secretBase32, counter, digits = 6) {
  const key = base32Decode(secretBase32);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

function totp(secretBase32, { time = Date.now(), step = 30, digits = 6 } = {}) {
  return hotp(secretBase32, Math.floor(time / 1000 / step), digits);
}

// Accepts the current code plus one step before/after (clock drift).
function verifyTotp(secretBase32, code, { window = 1, time = Date.now(), step = 30 } = {}) {
  const candidate = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(candidate)) return false;
  const counter = Math.floor(time / 1000 / step);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secretBase32, counter + offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))) return true;
  }
  return false;
}

function otpauthUri({ secret, account, issuer }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Secrets at rest: AES-256-GCM with a key derived from JWT_SECRET, so a
// database dump alone cannot generate codes.
const key = () => crypto.createHash("sha256").update(`${jwtConfig.secret}:totp`).digest();

function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(secret), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSecret(stored) {
  const [iv, tag, data] = String(stored).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

// Recovery codes: 10 × "XXXX-XXXX", shown once, stored hashed.
function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

const hashRecoveryCode = (code) => crypto.createHash("sha256").update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");

module.exports = { generateSecret, totp, verifyTotp, otpauthUri, encryptSecret, decryptSecret, generateRecoveryCodes, hashRecoveryCode, base32Encode, base32Decode };
