const fs = require("fs/promises");
const path = require("path");

const { r2, apiPublicUrl } = require("../config/env");

// Where uploaded files live. Cloudflare R2 (S3 API) when its keys are set,
// otherwise the local `uploads/` folder served by Express — same URLs shape,
// so nothing else changes when the bucket is configured later.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const driver = r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucket ? "r2" : "local";

let client = null;
function s3() {
  if (!client) {
    // Loaded lazily so the local driver never needs the SDK at runtime.
    const { S3Client } = require("@aws-sdk/client-s3");
    client = new S3Client({
      region: "auto",
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    });
  }
  return client;
}

function publicUrl(key) {
  if (driver === "r2") return `${(r2.publicUrl || "").replace(/\/$/, "")}/${key}`;
  return `${apiPublicUrl.replace(/\/$/, "")}/uploads/${key}`;
}

async function put(key, buffer, contentType) {
  if (driver === "r2") {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await s3().send(new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: buffer, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  } else {
    const file = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, buffer);
  }
  return publicUrl(key);
}

async function remove(key) {
  if (!key) return;
  try {
    if (driver === "r2") {
      const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
      await s3().send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
    } else {
      await fs.unlink(path.join(UPLOAD_DIR, key));
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[storage] could not remove ${key}: ${error.message}`);
  }
}

module.exports = { driver, put, remove, publicUrl, UPLOAD_DIR };
