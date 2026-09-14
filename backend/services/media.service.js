const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");

const storage = require("./storage.service");

// Raster formats get web-size WebP variants; SVG and PDF are stored as-is.
const RASTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_TYPES = new Set([...RASTER_TYPES, "image/svg+xml", "application/pdf", ...VIDEO_TYPES]);
// Images and documents up to 15 MB; videos (gallery) up to 200 MB.
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const maxBytesFor = (mimeType) => (VIDEO_TYPES.has(mimeType) ? MAX_VIDEO_BYTES : MAX_BYTES);

const VARIANTS = [
  { name: "thumb", width: 400 },
  { name: "medium", width: 900 },
  { name: "large", width: 1600 },
];

function slugifyName(filename) {
  const ext = path.extname(filename || "").toLowerCase().slice(0, 8);
  const base = path
    .basename(filename || "file", ext)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 60);
  return { base: base || "file", ext };
}

function buildKeyBase(filename) {
  const now = new Date();
  const folder = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const { base, ext } = slugifyName(filename);
  return { folder, base: `${crypto.randomBytes(5).toString("hex")}-${base}`, ext };
}

// Stores the upload (+ variants) and returns the columns for a Media row.
async function storeUpload(file) {
  if (!ALLOWED_TYPES.has(file.mimetype)) throw new Error("Unsupported file type");
  if (file.size > maxBytesFor(file.mimetype)) throw new Error(VIDEO_TYPES.has(file.mimetype) ? "Video is larger than 200 MB" : "File is larger than 15 MB");

  const { folder, base, ext } = buildKeyBase(file.originalname);
  const key = `${folder}/${base}${ext || ""}`;
  const record = {
    storage: storage.driver,
    key,
    url: null,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    width: null,
    height: null,
    variants: {},
  };

  if (RASTER_TYPES.has(file.mimetype)) {
    const image = sharp(file.buffer, { animated: false }).rotate();
    const meta = await image.metadata();
    record.width = meta.width || null;
    record.height = meta.height || null;
    record.url = await storage.put(key, file.buffer, file.mimetype);

    for (const variant of VARIANTS) {
      if (!meta.width || meta.width <= variant.width) continue;
      const buffer = await sharp(file.buffer).rotate().resize({ width: variant.width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const info = await sharp(buffer).metadata();
      const variantKey = `${folder}/${base}-w${variant.width}.webp`;
      const url = await storage.put(variantKey, buffer, "image/webp");
      record.variants[variant.name] = { key: variantKey, url, width: info.width, height: info.height };
    }
  } else {
    record.url = await storage.put(key, file.buffer, file.mimetype);
  }

  return record;
}

async function removeStored(media) {
  await storage.remove(media.key);
  for (const variant of Object.values(media.variants || {})) await storage.remove(variant.key);
}

module.exports = { storeUpload, removeStored, ALLOWED_TYPES, VIDEO_TYPES, MAX_BYTES, MAX_VIDEO_BYTES, maxBytesFor };
