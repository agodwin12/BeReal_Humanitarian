const { GalleryItem, Media } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { normalizeLocalized, mediaSummary } = require("../utils/localized");

const INCLUDES = [{ model: Media, as: "media" }];
const ORDER = [["happenedOn", "DESC NULLS LAST"], ["createdAt", "DESC"]];

// Accepts youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…, vimeo.com/…
// and returns the URL the site can embed. Anything else is refused.
function embedUrlFor(url) {
  let u;
  try {
    u = new URL(String(url).trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch" && u.searchParams.get("v")) return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (/^[A-Za-z0-9_-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,})/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
  }
  return null;
}

function serialize(row) {
  const plain = row.get({ plain: true });
  return {
    id: plain.id,
    kind: plain.kind,
    media: mediaSummary(row.media),
    videoUrl: plain.videoUrl,
    embedUrl: plain.videoUrl ? embedUrlFor(plain.videoUrl) : null,
    title: plain.title || {},
    description: plain.description || {},
    happenedOn: plain.happenedOn,
    location: plain.location,
    published: plain.published,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

async function apply(row, body) {
  if (body.kind !== undefined) row.kind = body.kind === "video" ? "video" : "image";
  for (const field of ["title", "description"]) if (body[field] !== undefined) row[field] = normalizeLocalized(body[field]);
  if (body.happenedOn !== undefined) row.happenedOn = body.happenedOn || null;
  if (body.location !== undefined) row.location = body.location ? String(body.location).trim().slice(0, 160) : null;
  if (body.published !== undefined) row.published = Boolean(body.published);
  if (body.mediaId !== undefined) {
    if (body.mediaId) {
      const media = await Media.findByPk(body.mediaId);
      if (!media) throw ApiError.badRequest("mediaId: media not found");
      if (row.kind === "video" && !media.mimeType.startsWith("video/")) throw ApiError.badRequest("Choose a video file for a video entry", [{ field: "mediaId", message: "Not a video" }]);
      if (row.kind === "image" && !media.mimeType.startsWith("image/")) throw ApiError.badRequest("Choose an image file for a photo entry", [{ field: "mediaId", message: "Not an image" }]);
    }
    row.mediaId = body.mediaId || null;
  }
  if (body.videoUrl !== undefined) {
    const value = body.videoUrl ? String(body.videoUrl).trim() : "";
    if (value && !embedUrlFor(value)) throw ApiError.badRequest("Paste a YouTube or Vimeo link", [{ field: "videoUrl", message: "Only YouTube and Vimeo links are supported" }]);
    row.videoUrl = value || null;
  }
  if (row.kind === "video" && !row.mediaId && !row.videoUrl) throw ApiError.badRequest("A video entry needs an uploaded video or a YouTube / Vimeo link", [{ field: "videoUrl", message: "Add a video file or a link" }]);
  if (row.kind === "image" && !row.mediaId) throw ApiError.badRequest("A photo entry needs a photo", [{ field: "mediaId", message: "Choose a photo" }]);
  if (!row.title?.en) throw ApiError.badRequest("Title (English) is required", [{ field: "title", message: "Title (English) is required" }]);
}

const all = () => GalleryItem.findAll({ include: INCLUDES, order: ORDER });

exports.list = asyncHandler(async (req, res) => ok(res, (await all()).map(serialize)));

exports.create = asyncHandler(async (req, res) => {
  const row = GalleryItem.build({ kind: "image", title: { en: "", fr: "", es: "" }, description: { en: "", fr: "", es: "" }, published: true, createdById: req.user.id });
  await apply(row, req.body);
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "gallery.created", entity: "gallery_item", entityId: row.id, after: serialize(row) });
  return ok(res, serialize(row), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const row = await GalleryItem.findByPk(req.params.id, { include: INCLUDES });
  if (!row) throw ApiError.notFound("Gallery entry not found");
  const before = serialize(row);
  await apply(row, req.body);
  await row.save();
  await row.reload({ include: INCLUDES });
  await audit.record(req, { action: "gallery.updated", entity: "gallery_item", entityId: row.id, before, after: serialize(row) });
  return ok(res, serialize(row));
});

exports.destroy = asyncHandler(async (req, res) => {
  const row = await GalleryItem.findByPk(req.params.id);
  if (!row) throw ApiError.notFound("Gallery entry not found");
  const before = row.get({ plain: true });
  await row.destroy();
  await audit.record(req, { action: "gallery.deleted", entity: "gallery_item", entityId: before.id, before });
  return ok(res, { deleted: true });
});

// Public site: published entries, newest event first.
exports.publicList = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30");
  const rows = await GalleryItem.findAll({ where: { published: true }, include: INCLUDES, order: ORDER });
  return ok(
    res,
    rows
      .map(serialize)
      .filter((item) => (item.kind === "video" ? item.media || item.embedUrl : item.media))
      .map(({ createdAt, updatedAt, ...item }) => item),
  );
});

exports.embedUrlFor = embedUrlFor;
exports.serialize = serialize;
