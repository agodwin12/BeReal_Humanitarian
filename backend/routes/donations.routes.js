const express = require("express");

const ctrl = require("../controllers/donations.controller");
const settings = require("../controllers/donationSettings.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/donations.validator");

// Donations ledger: Super Admin + Read-only can look (spec §06); only Super
// Admin acts (resend, notes, export). Settings: Super Admin only.
const viewer = authorize("super_admin", "read_only");
const superAdmin = authorize("super_admin");

const donations = express.Router();
donations.use(authenticate);
donations.get("/summary", viewer, ctrl.summary);
donations.get("/export", superAdmin, rules.listRules, validate, ctrl.exportCsv);
donations.get("/donors", viewer, rules.donorRules, validate, ctrl.donor);
donations.get("/stripe-events", superAdmin, ctrl.stripeEvents);
donations.get("/", viewer, rules.listRules, validate, ctrl.list);
donations.get("/:id", viewer, rules.idParam, validate, ctrl.show);
donations.get("/:id/receipt.pdf", viewer, rules.idParam, validate, ctrl.receiptPdf);
donations.patch("/:id", superAdmin, rules.updateRules, validate, ctrl.update);
donations.post("/:id/resend-receipt", superAdmin, rules.idParam, validate, ctrl.resendReceipt);

const donationSettings = express.Router();
donationSettings.use(authenticate, superAdmin);
donationSettings.get("/", settings.get);
donationSettings.put("/", rules.settingsRules, validate, settings.update);
donationSettings.post("/test-receipt", rules.testReceiptRules, validate, settings.testReceipt);
donationSettings.get("/receipt-preview.pdf", settings.previewReceipt);

module.exports = { donations, donationSettings };
