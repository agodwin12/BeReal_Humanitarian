const express = require("express");

const ctrl = require("../controllers/auditLogs.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate, authorize("super_admin"));
router.get("/", ctrl.list);
router.get("/actions", ctrl.actions);

module.exports = router;
