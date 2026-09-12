require("dotenv").config();

const list = (value, fallback) =>
  value ? value.split(",").map((s) => s.trim()).filter(Boolean) : fallback;

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv,
  isProd: nodeEnv === "production",
  port: Number(process.env.PORT || 4000),

  // Browsers allowed to call the API (public site + backoffice).
  clientUrls: list(process.env.CLIENT_URLS, ["http://localhost:3000", "http://localhost:3001"]),
  siteUrl: process.env.SITE_URL || "http://localhost:3000",
  backofficeUrl: process.env.BACKOFFICE_URL || "http://localhost:3001",
  // Where browsers reach this API (used to build /uploads URLs for local media).
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 4000)}`,
  // Shared with the public site: lets its Draft Mode read unpublished content.
  previewSecret: process.env.PREVIEW_SECRET || "",
  // Launch copy used to seed content tables on first run.
  contentSeedDir: process.env.CONTENT_SEED_DIR || require("path").join(__dirname, "..", "seed", "messages"),

  db: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || "be_real_humanitarian",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },

  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME || "Super Admin",
    email: process.env.SEED_ADMIN_EMAIL || "",
    password: process.env.SEED_ADMIN_PASSWORD || "",
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.EMAIL_FROM || "Be Real Humanitarian Works <no-reply@berealhumanitarian.org>",
    notifyEmail: process.env.EMAIL_NOTIFY_TO || "",
  },

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  },

  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || "",
  },

  // Donations (Phase E). Keys live here, never in the database or the browser.
  // Without a secret key (and outside production) checkout runs in a
  // clearly-labelled simulated mode so the whole flow can be reviewed.
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
};
