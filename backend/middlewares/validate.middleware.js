const { validationResult } = require("express-validator");
const { fail } = require("../utils/apiResponse");

// Runs after an express-validator chain; turns failures into a 422 with a
// { field, message } list the frontends can map onto inputs.
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return fail(
    res,
    422,
    "Validation failed",
    result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg })),
  );
};
