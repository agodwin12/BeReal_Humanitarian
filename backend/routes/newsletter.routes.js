const express = require("express");

const ctrl = require("../controllers/newsletter.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/submissions.validator");

const router = express.Router();

router.use(authenticate, authorize("super_admin", "editor", "read_only"));
router.get("/subscribers", rules.subscriberListRules, validate, ctrl.list);
router.get("/subscribers/counts", ctrl.counts);
router.get("/subscribers/export", ctrl.exportCsv);

router.use(authorize("super_admin", "editor"));
router.post("/subscribers/:id/unsubscribe", ctrl.unsubscribe);

module.exports = router;
