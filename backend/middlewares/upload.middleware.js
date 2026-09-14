const multer = require("multer");

const { ALLOWED_TYPES, MAX_VIDEO_BYTES } = require("../services/media.service");
const ApiError = require("../utils/apiError");

// Single-file uploads kept in memory: sharp needs the buffer and the storage
// driver writes it out (local disk or R2).
const upload = multer({
  storage: multer.memoryStorage(),
  // Multer's limit is the video ceiling; media.service enforces 15 MB for images and documents.
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.has(file.mimetype)) return cb(ApiError.badRequest("Only JPEG, PNG, WebP, AVIF, GIF, SVG, PDF, MP4, WebM or MOV files are accepted"));
    cb(null, true);
  },
});

const singleFile = (field = "file") => (req, res, next) =>
  upload.single(field)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return next(ApiError.badRequest(error.code === "LIMIT_FILE_SIZE" ? "File is larger than 200 MB" : error.message));
    }
    return next(error);
  });

// Small text uploads (translator CSV worksheets).
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ok = /csv|text|excel|octet-stream/.test(file.mimetype) || /\.csv$/i.test(file.originalname);
    if (!ok) return cb(ApiError.badRequest("Upload a .csv file"));
    cb(null, true);
  },
});

const singleCsv = (field = "file") => (req, res, next) =>
  csvUpload.single(field)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) return next(ApiError.badRequest(error.code === "LIMIT_FILE_SIZE" ? "File is larger than 5 MB" : error.message));
    return next(error);
  });

module.exports = { singleFile, singleCsv };
