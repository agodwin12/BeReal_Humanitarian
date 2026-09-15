// Website AI assistant — staff routes. The public widget endpoints live in
// public.routes.js (/api/public/chat/config and /api/public/chat).
const express = require("express");

const ctrl = require("../controllers/chat.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const rules = require("../validators/chat.validator");

const superAdmin = authorize("super_admin");

// Settings (Super Admin only: the assistant speaks for the organization).
const chatSettings = express.Router();
chatSettings.use(authenticate, superAdmin);
chatSettings.get("/", ctrl.getSettings);
chatSettings.put("/", rules.settingsRules, validate, ctrl.updateSettings);
chatSettings.post("/preview", rules.previewRules, validate, ctrl.preview);

// Conversations (Super Admin only: they can contain what visitors typed).
const chatSessions = express.Router();
chatSessions.use(authenticate, superAdmin);
chatSessions.get("/stats", ctrl.stats);
chatSessions.get("/", rules.listRules, validate, ctrl.listSessions);
chatSessions.get("/:id", rules.idParam, validate, ctrl.showSession);
chatSessions.delete("/:id", rules.idParam, validate, ctrl.destroySession);

module.exports = { chatSettings, chatSessions };
