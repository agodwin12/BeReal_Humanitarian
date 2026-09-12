const { NotificationSetting } = require("../models");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/apiResponse");
const audit = require("../utils/audit");
const { ensureDefaults } = require("../services/notifications.service");

exports.list = asyncHandler(async (req, res) => {
  await ensureDefaults();
  const rows = await NotificationSetting.findAll({ order: [["formType", "ASC"]] });
  return ok(res, rows);
});

exports.update = asyncHandler(async (req, res) => {
  const setting = await NotificationSetting.findOne({ where: { formType: req.params.formType } });
  if (!setting) throw ApiError.notFound("Unknown form type");

  const before = { recipients: setting.recipients, locale: setting.locale, enabled: setting.enabled };
  setting.recipients = [...new Set(req.body.recipients.map((e) => String(e).toLowerCase()))];
  if (req.body.locale) setting.locale = req.body.locale;
  if (req.body.enabled !== undefined) setting.enabled = Boolean(req.body.enabled);
  await setting.save();

  await audit.record(req, {
    action: "notifications.updated",
    entity: "notification_setting",
    entityId: setting.formType,
    before,
    after: { recipients: setting.recipients, locale: setting.locale, enabled: setting.enabled },
  });
  return ok(res, setting);
});
