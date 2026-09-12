const { body, param, query } = require("express-validator");

const ROLES = ["super_admin", "editor", "read_only"];
const STATUSES = ["invited", "active", "disabled"];

module.exports = {
  ROLES,
  listRules: [
    query("q").optional().isString().trim().isLength({ max: 120 }),
    query("role").optional().isIn(ROLES),
    query("status").optional().isIn(STATUSES),
  ],
  idRule: [param("id").isInt({ min: 1 }).withMessage("Invalid user id")],
  inviteRules: [
    body("name").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("role").isIn(ROLES).withMessage("Role must be super_admin, editor or read_only"),
  ],
  updateRules: [
    param("id").isInt({ min: 1 }),
    body("name").optional().isString().trim().isLength({ min: 2, max: 120 }),
    body("role").optional().isIn(ROLES).withMessage("Role must be super_admin, editor or read_only"),
  ],
};
