const { NotificationSetting } = require("../models");
const { resend } = require("../config/env");
const { sendEmail } = require("./email.service");
const { acknowledgment, newsletterWelcome, staffAlert } = require("./formEmails");

const FORM_TYPES = ["volunteer", "partnership", "assistance", "contact", "newsletter"];

// One settings row per form type. Created at startup so the backoffice
// screen always has something to edit; defaults to EMAIL_NOTIFY_TO if set.
async function ensureDefaults() {
  const defaults = resend.notifyEmail ? [resend.notifyEmail] : [];
  for (const formType of FORM_TYPES) {
    await NotificationSetting.findOrCreate({ where: { formType }, defaults: { recipients: defaults, locale: "en", enabled: true } });
  }
}

// Staff alert for a new submission. Errors are logged, never thrown — the
// visitor's submission is already saved.
async function notifyStaff(type, submission) {
  try {
    const setting = await NotificationSetting.findOne({ where: { formType: type } });
    if (!setting || !setting.enabled || !setting.recipients.length) {
      console.log(`[notify] no recipients configured for "${type}" — skipped`);
      return;
    }
    const mail = staffAlert(type, submission, setting.locale);
    await sendEmail({ to: setting.recipients, kind: `staff_alert_${type}`, ...mail });
  } catch (error) {
    console.error("[notify] staff alert failed", error.message);
  }
}

async function acknowledgeVisitor(type, submission) {
  if (!submission.email) return;
  try {
    const mail = acknowledgment(type, submission.locale, { name: submission.name, payload: submission.payload });
    await sendEmail({ to: submission.email, kind: `acknowledgment_${type}`, ...mail });
  } catch (error) {
    console.error("[notify] acknowledgment failed", error.message);
  }
}

async function welcomeSubscriber(subscriber, unsubscribeUrl) {
  try {
    const mail = newsletterWelcome(subscriber.locale, { unsubscribeUrl });
    await sendEmail({ to: subscriber.email, kind: "newsletter_welcome", ...mail });
  } catch (error) {
    console.error("[notify] newsletter welcome failed", error.message);
  }
}

module.exports = { FORM_TYPES, ensureDefaults, notifyStaff, acknowledgeVisitor, welcomeSubscriber };
