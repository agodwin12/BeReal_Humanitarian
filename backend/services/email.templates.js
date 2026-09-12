// Staff emails for the backoffice (English — the backoffice UI is English-only).
// Donor/visitor emails (Phase B / E) get localized templates of their own.

const wrap = (title, bodyHtml) => `
<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f6fa;font-family:Arial,Helvetica,sans-serif;color:#211b38">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e8e3ef;border-radius:14px;padding:28px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5626a6">Be Real Humanitarian Works · Backoffice</div>
    <h1 style="font-size:20px;margin:14px 0 10px;color:#211044">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#716c80;margin-top:28px">If you did not expect this email, you can ignore it.</p>
  </div>
</body></html>`;

const button = (href, label) =>
  `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:#ff7065;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${label}</a></p>
   <p style="font-size:12px;color:#716c80;word-break:break-all">Or copy this link: ${href}</p>`;

function inviteEmail({ name, invitedBy, link, role }) {
  return {
    subject: "You've been invited to the Be Real backoffice",
    html: wrap(
      `Welcome, ${name}`,
      `<p>${invitedBy} invited you to the Be Real Humanitarian Works backoffice as <strong>${role}</strong>.</p>
       <p>Set your password to activate your account. This link is valid for 72 hours.</p>
       ${button(link, "Set my password")}`,
    ),
    text: `${invitedBy} invited you to the Be Real backoffice as ${role}. Set your password (valid 72h): ${link}`,
  };
}

function resetEmail({ name, link }) {
  return {
    subject: "Reset your Be Real backoffice password",
    html: wrap(
      `Password reset`,
      `<p>Hi ${name}, a password reset was requested for your account.</p>
       <p>This link is valid for 2 hours.</p>
       ${button(link, "Choose a new password")}`,
    ),
    text: `Reset your Be Real backoffice password (valid 2h): ${link}`,
  };
}

module.exports = { inviteEmail, resetEmail };
