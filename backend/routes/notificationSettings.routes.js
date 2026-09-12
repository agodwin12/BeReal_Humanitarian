const express = require("express");

const ctrl = require("../controllers/notificationSettings.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/submissions.validator");

const router = express.Router();

router.use(authenticate, authorize("super_admin"));
router.get("/", ctrl.list);
router.put("/:formType", rules.notificationRules, validate, ctrl.update);

module.exports = router;
