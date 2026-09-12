const express = require("express");

const ctrl = require("../controllers/users.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/users.validator");

const router = express.Router();

// Editors need the list of colleagues to assign submissions to.
router.get("/assignable", authenticate, authorize("super_admin", "editor"), ctrl.assignable);

// Every other user-management route is Super Admin only (spec §06).
router.use(authenticate, authorize("super_admin"));

router.get("/", rules.listRules, validate, ctrl.list);
router.post("/invite", rules.inviteRules, validate, ctrl.invite);
router.patch("/:id", rules.updateRules, validate, ctrl.update);
router.post("/:id/deactivate", rules.idRule, validate, ctrl.deactivate);
router.post("/:id/activate", rules.idRule, validate, ctrl.activate);
router.post("/:id/resend-invite", rules.idRule, validate, ctrl.resendInvite);
router.post("/:id/reset-password", rules.idRule, validate, ctrl.forcePasswordReset);
router.post("/:id/reset-2fa", rules.idRule, validate, ctrl.resetTwoFactor);

module.exports = router;
