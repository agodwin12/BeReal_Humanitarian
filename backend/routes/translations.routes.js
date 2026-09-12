const express = require("express");
const { body, param, query } = require("express-validator");

const ctrl = require("../controllers/translations.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { singleCsv } = require("../middlewares/upload.middleware");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();
const editor = authorize("super_admin", "editor");

const listRules = [
  query("page").optional().isString().isLength({ max: 40 }),
  query("status").optional().isIn(["all", "missing", "needs_review", "reviewed"]),
  query("locale").optional().isIn(["all", "fr", "es"]),
  query("q").optional().isString().isLength({ max: 120 }),
];
const idRule = param("id").isString().isLength({ min: 3, max: 220 });

router.use(authenticate);
router.get("/", listRules, validate, ctrl.list);
router.get("/summary", ctrl.summary);
router.get("/export", listRules, validate, ctrl.exportCsv);
router.post("/import", editor, singleCsv("file"), ctrl.importCsv);
router.put("/:id", editor, idRule, body("locale").isIn(["fr", "es"]), body("text").isString().isLength({ max: 200000 }), validate, ctrl.update);
router.post("/:id/review", editor, idRule, body("locale").isIn(["fr", "es"]), body("reviewed").isBoolean(), validate, ctrl.review);

module.exports = router;
