// Phase C staff routes. Read = every signed-in role; write = Editor and above;
// site settings write = Super Admin only (spec §06).
const express = require("express");

const { authenticate, authorize } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { singleFile } = require("../middlewares/upload.middleware");
const rules = require("../validators/content.validator");
const settings = require("../controllers/siteSettings.controller");
const media = require("../controllers/media.controller");
const programs = require("../controllers/programs.controller");
const team = require("../controllers/teamMembers.controller");
const impact = require("../controllers/impact.controller");
const pages = require("../controllers/pages.controller");
const legal = require("../controllers/legalPages.controller");

const editor = authorize("super_admin", "editor");
const superAdmin = authorize("super_admin");

// ---- Site settings ------------------------------------------------------------
const siteSettings = express.Router();
siteSettings.use(authenticate);
siteSettings.get("/", settings.get);
siteSettings.put("/", superAdmin, rules.siteSettingsRules, validate, settings.update);

// ---- Media library ------------------------------------------------------------
const mediaRouter = express.Router();
mediaRouter.use(authenticate);
mediaRouter.get("/", rules.mediaListRules, validate, media.list);
mediaRouter.post("/", editor, singleFile("file"), media.upload);
mediaRouter.get("/:id", rules.idParam, validate, media.show);
mediaRouter.get("/:id/usage", rules.idParam, validate, media.usage);
mediaRouter.patch("/:id", editor, rules.idParam, rules.mediaMetaRules, validate, media.update);
mediaRouter.put("/:id/file", editor, rules.idParam, validate, singleFile("file"), media.replaceFile);
mediaRouter.delete("/:id", editor, rules.idParam, validate, media.destroy);

// ---- Programs -----------------------------------------------------------------
const programsRouter = express.Router();
programsRouter.use(authenticate);
programsRouter.get("/", programs.list);
programsRouter.post("/", editor, rules.programCreateRules, rules.programRules, validate, programs.create);
programsRouter.post("/reorder", editor, rules.reorderRules, validate, programs.reorder);
programsRouter.patch("/:id", editor, rules.idParam, rules.programRules, validate, programs.update);
programsRouter.delete("/:id", editor, rules.idParam, validate, programs.destroy);

// ---- Team ---------------------------------------------------------------------
const teamRouter = express.Router();
teamRouter.use(authenticate);
teamRouter.get("/", team.list);
teamRouter.post("/", editor, rules.teamCreateRules, rules.teamRules, validate, team.create);
teamRouter.post("/reorder", editor, rules.reorderRules, validate, team.reorder);
teamRouter.patch("/:id", editor, rules.idParam, rules.teamRules, validate, team.update);
teamRouter.delete("/:id", editor, rules.idParam, validate, team.destroy);
teamRouter.post("/:id/photo-approval", editor, rules.idParam, rules.photoApprovalRules, validate, team.approvePhoto);
teamRouter.delete("/:id/photo-approval", editor, rules.idParam, validate, team.revokePhotoApproval);

// ---- Impact -------------------------------------------------------------------
const impactRouter = express.Router();
impactRouter.use(authenticate);
impactRouter.get("/", impact.overview);
impactRouter.patch("/metrics/:id", editor, rules.idParam, rules.metricRules, validate, impact.updateMetric);
impactRouter.post("/stories", editor, rules.storyCreateRules, rules.storyRules, validate, impact.createStory);
impactRouter.patch("/stories/:id", editor, rules.idParam, rules.storyRules, validate, impact.updateStory);
impactRouter.post("/stories/:id/publish", editor, rules.idParam, validate, impact.publishStory);
impactRouter.post("/stories/:id/unpublish", editor, rules.idParam, validate, impact.unpublishStory);
impactRouter.delete("/stories/:id", editor, rules.idParam, validate, impact.destroyStory);
impactRouter.post("/updates", editor, rules.updateCreateRules, rules.updateRules, validate, impact.createUpdate);
impactRouter.patch("/updates/:id", editor, rules.idParam, rules.updateRules, validate, impact.updateUpdate);
impactRouter.post("/updates/:id/publish", editor, rules.idParam, validate, impact.publishUpdate);
impactRouter.post("/updates/:id/unpublish", editor, rules.idParam, validate, impact.unpublishUpdate);
impactRouter.delete("/updates/:id", editor, rules.idParam, validate, impact.destroyUpdate);

// ---- Pages --------------------------------------------------------------------
const pagesRouter = express.Router();
pagesRouter.use(authenticate);
pagesRouter.get("/schema", pages.schema);
pagesRouter.get("/", pages.list);
pagesRouter.get("/:slug", rules.pageSlugParam, validate, pages.show);
pagesRouter.put("/:slug/draft", editor, rules.pageSlugParam, rules.pageDraftRules, validate, pages.saveDraft);
pagesRouter.post("/:slug/publish", editor, rules.pageSlugParam, validate, pages.publish);
pagesRouter.post("/:slug/discard", editor, rules.pageSlugParam, validate, pages.discard);
pagesRouter.get("/:slug/versions", rules.pageSlugParam, validate, pages.versions);
pagesRouter.post("/:slug/versions/:versionId/restore", editor, rules.pageSlugParam, rules.versionParam, validate, pages.restore);

// ---- Legal pages --------------------------------------------------------------
const legalRouter = express.Router();
legalRouter.use(authenticate);
legalRouter.get("/", legal.list);
legalRouter.get("/:slug", rules.legalSlugParam, validate, legal.show);
legalRouter.put("/:slug", editor, rules.legalSlugParam, rules.legalRules, validate, legal.saveDraft);
legalRouter.post("/:slug/publish", editor, rules.legalSlugParam, validate, legal.publish);
legalRouter.get("/:slug/versions/:versionId", rules.legalSlugParam, rules.versionParam, validate, legal.version);
legalRouter.post("/:slug/versions/:versionId/restore", editor, rules.legalSlugParam, rules.versionParam, validate, legal.restore);

module.exports = { siteSettings, media: mediaRouter, programs: programsRouter, team: teamRouter, impact: impactRouter, pages: pagesRouter, legal: legalRouter };
