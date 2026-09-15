const { fail } = require("../utils/apiResponse");
const { isProd } = require("../config/env");
const ApiError = require("../utils/apiError");

// Central error handler: ApiError → its status; Sequelize validation/unique
// errors → 422/409; anything else → 500 (details only outside production).
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err.status && (err.status < 500 || err instanceof ApiError)) {
    return fail(res, err.status, err.message, err.errors);
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "field";
    return fail(res, 409, `${field} already exists`);
  }

  if (err.name === "SequelizeValidationError") {
    return fail(
      res,
      422,
      "Validation failed",
      err.errors.map((e) => ({ field: e.path, message: e.message })),
    );
  }

  if (err.type === "entity.parse.failed") {
    return fail(res, 400, "Malformed JSON body");
  }

  console.error(err);
  return fail(res, 500, isProd ? "Internal server error" : err.message || "Internal server error");
};
