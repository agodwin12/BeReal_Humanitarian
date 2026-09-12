const express = require("express");

const ctrl = require("../controllers/formSubmissions.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/submissions.validator");

const router = express.Router();

// Staff only. Editors see volunteer / partnership / contact; the controller
// hides Request Assistance from everyone but Super Admins.
router.use(authenticate, authorize("super_admin", "editor", "read_only"));

router.get("/", rules.listRules, validate, ctrl.list);
router.get("/counts", ctrl.counts);
router.get("/export", rules.exportRules, validate, ctrl.exportCsv);
router.get("/:id", rules.idRule, validate, ctrl.show);

// Read-only stops here.
router.use(authorize("super_admin", "editor"));
router.patch("/:id", rules.updateRules, validate, ctrl.update);
router.post("/:id/notes", rules.noteRules, validate, ctrl.addNote);
router.post("/:id/not-spam", rules.idRule, validate, ctrl.markNotSpam);

module.exports = router;
