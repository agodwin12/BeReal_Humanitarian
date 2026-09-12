const { resend, isProd } = require("../config/env");

// Transactional email via Resend's HTTP API (no SDK needed on Node 22).
// Without RESEND_API_KEY the message is printed to the console instead — so
// invite / reset links are still usable in development. Every attempt is
// written to email_logs for the System screen. `attachments` = [{ filename,
// content: base64 }] (donation receipts).
async function sendEmail({ to, subject, html, text, kind, replyTo, attachments }) {
  const recipients = Array.isArray(to) ? to.join(", ") : String(to);
  const log = async (status, extra = {}) => {
    try {
      // Required lazily: models load the database config, this service is
      // also imported by scripts that run before it is ready.
      const { EmailLog } = require("../models");
      await EmailLog.create({ to: recipients.slice(0, 500), subject: String(subject).slice(0, 300), kind: kind || null, status, ...extra });
    } catch (error) {
      console.warn("[email] could not write email log:", error.message);
    }
  };

  if (!resend.apiKey) {
    if (isProd) {
      await log("failed", { error: "RESEND_API_KEY is not configured" });
      throw new Error("RESEND_API_KEY is not configured");
    }
    const files = (attachments || []).map((a) => `${a.filename} (${Math.round(Buffer.from(a.content, "base64").length / 1024)} KB)`).join(", ");
    console.log(`\n[email:dev] To: ${recipients}\n[email:dev] Subject: ${subject}${files ? `\n[email:dev] Attachments: ${files}` : ""}\n${text || html}\n`);
    await log("console");
    return { id: "dev-console", delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resend.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: resend.fromEmail,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    await log("failed", { error: `Resend ${response.status}: ${body}`.slice(0, 2000) });
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  const data = await response.json();
  await log("sent", { providerId: data.id || null });
  return { id: data.id, delivered: true };
}

module.exports = { sendEmail };
