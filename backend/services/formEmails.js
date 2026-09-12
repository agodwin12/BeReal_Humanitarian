// Visitor-facing emails in the visitor's language (EN / FR / ES) and the
// staff alert. Copy follows the website brief: no promises of assistance,
// no timelines, and the "not an emergency service" line on assistance replies.
const { FORM_FIELDS, FIELD_LABELS } = require("../config/formFields");
const { backofficeUrl } = require("../config/env");

const ORG = "Be Real Humanitarian Works Inc.";

const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const wrap = (title, bodyHtml, footerLine) => `
<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f6fa;font-family:Arial,Helvetica,sans-serif;color:#211b38">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e3ef;border-radius:14px;padding:28px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5626a6">Be Real Humanitarian Works</div>
    <h1 style="font-size:20px;margin:14px 0 10px;color:#211044">${escape(title)}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#716c80;margin-top:28px">${escape(footerLine)}</p>
  </div>
</body></html>`;

const ACK = {
  en: {
    greeting: (name) => `Hi ${name || "there"},`,
    footer: `${ORG} · Texas nonprofit corporation · IRS-recognized 501(c)(3) public charity`,
    volunteer: {
      subject: "Thank you for offering your time — Be Real Humanitarian Works",
      body: "We've received your volunteer interest and will be in touch. Thank you for helping us turn compassion into action.",
    },
    partnership: {
      subject: "We've received your partnership inquiry — Be Real Humanitarian Works",
      body: "Thank you for reaching out. We'll review your proposal and get back to you.",
    },
    contact: {
      subject: "We've received your message — Be Real Humanitarian Works",
      body: "Thank you for contacting us. We'll reply as soon as we can.",
    },
    assistance: {
      subject: "Your request has been received — Be Real Humanitarian Works",
      body: "Your request for assistance has been received. Submitting a request does not guarantee assistance: requests are reviewed based on charitable need, program criteria, available resources, and the organization's capacity. We will contact you using your preferred method.",
      emergency:
        "Be Real Humanitarian Works Inc. is not an emergency response service. If you are experiencing an immediate medical or safety emergency, contact the appropriate local emergency service.",
    },
    newsletter: {
      subject: "You're subscribed — Be Real Humanitarian Works",
      body: "Thank you for subscribing. We'll share occasional updates about our programs, stories shared with consent, and ways to help.",
      unsubscribe: "You can unsubscribe at any time:",
      unsubscribeCta: "Unsubscribe",
    },
    summaryHeading: "What you sent us",
  },
  fr: {
    greeting: (name) => `Bonjour ${name || ""},`,
    footer: `${ORG} · Société à but non lucratif du Texas · Organisme de bienfaisance public 501(c)(3) reconnu par l'IRS`,
    volunteer: {
      subject: "Merci de nous offrir votre temps — Be Real Humanitarian Works",
      body: "Nous avons bien reçu votre intérêt pour le bénévolat et nous vous recontacterons. Merci de nous aider à transformer la compassion en action.",
    },
    partnership: {
      subject: "Nous avons reçu votre demande de partenariat — Be Real Humanitarian Works",
      body: "Merci de nous avoir contactés. Nous examinerons votre proposition et reviendrons vers vous.",
    },
    contact: {
      subject: "Nous avons reçu votre message — Be Real Humanitarian Works",
      body: "Merci de nous avoir écrit. Nous vous répondrons dès que possible.",
    },
    assistance: {
      subject: "Votre demande a bien été reçue — Be Real Humanitarian Works",
      body: "Votre demande d'aide a bien été reçue. Soumettre une demande ne garantit pas une aide : les demandes sont examinées selon le besoin caritatif, les critères des programmes, les ressources disponibles et la capacité de l'organisation. Nous vous contacterons par le moyen que vous préférez.",
      emergency:
        "Be Real Humanitarian Works Inc. n'est pas un service d'intervention d'urgence. En cas d'urgence médicale ou de sécurité immédiate, contactez le service d'urgence local approprié.",
    },
    newsletter: {
      subject: "Vous êtes abonné(e) — Be Real Humanitarian Works",
      body: "Merci de votre abonnement. Nous partagerons occasionnellement des nouvelles de nos programmes, des récits partagés avec consentement et des façons d'aider.",
      unsubscribe: "Vous pouvez vous désabonner à tout moment :",
      unsubscribeCta: "Se désabonner",
    },
    summaryHeading: "Ce que vous nous avez envoyé",
  },
  es: {
    greeting: (name) => `Hola ${name || ""},`,
    footer: `${ORG} · Corporación sin fines de lucro de Texas · Organización benéfica pública 501(c)(3) reconocida por el IRS`,
    volunteer: {
      subject: "Gracias por ofrecer tu tiempo — Be Real Humanitarian Works",
      body: "Recibimos tu interés en el voluntariado y nos pondremos en contacto. Gracias por ayudarnos a convertir la compasión en acción.",
    },
    partnership: {
      subject: "Recibimos tu consulta de alianza — Be Real Humanitarian Works",
      body: "Gracias por contactarnos. Revisaremos tu propuesta y te responderemos.",
    },
    contact: {
      subject: "Recibimos tu mensaje — Be Real Humanitarian Works",
      body: "Gracias por escribirnos. Te responderemos lo antes posible.",
    },
    assistance: {
      subject: "Tu solicitud ha sido recibida — Be Real Humanitarian Works",
      body: "Tu solicitud de ayuda ha sido recibida. Enviar una solicitud no garantiza asistencia: las solicitudes se revisan según la necesidad benéfica, los criterios de los programas, los recursos disponibles y la capacidad de la organización. Te contactaremos por el medio que prefieras.",
      emergency:
        "Be Real Humanitarian Works Inc. no es un servicio de respuesta a emergencias. Si tienes una emergencia médica o de seguridad inmediata, contacta al servicio de emergencia local correspondiente.",
    },
    newsletter: {
      subject: "Ya estás suscrito — Be Real Humanitarian Works",
      body: "Gracias por suscribirte. Compartiremos novedades ocasionales sobre nuestros programas, historias compartidas con consentimiento y formas de ayudar.",
      unsubscribe: "Puedes cancelar tu suscripción en cualquier momento:",
      unsubscribeCta: "Cancelar suscripción",
    },
    summaryHeading: "Lo que nos enviaste",
  },
};

const pickLocale = (locale) => (ACK[locale] ? locale : "en");

function fieldsTable(type, payload) {
  const rows = FORM_FIELDS[type]
    .filter((key) => payload[key] !== undefined && payload[key] !== "" && payload[key] !== null)
    .map(
      (key) =>
        `<tr><td style="padding:6px 10px 6px 0;color:#716c80;font-size:12px;vertical-align:top;white-space:nowrap">${escape(FIELD_LABELS[key] || key)}</td><td style="padding:6px 0;font-size:13px">${escape(typeof payload[key] === "boolean" ? (payload[key] ? "Yes" : "No") : payload[key])}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;margin-top:10px">${rows}</table>`;
}

function acknowledgment(type, locale, { name, payload }) {
  const t = ACK[pickLocale(locale)];
  const copy = t[type];
  const extra = type === "assistance" ? `<p style="font-size:13px;color:#7a4a12;background:#fff5f2;border:1px solid #ffe4df;border-radius:10px;padding:10px 12px">${escape(copy.emergency)}</p>` : "";
  const html = wrap(
    copy.subject.split(" — ")[0],
    `<p>${escape(t.greeting(name))}</p><p>${escape(copy.body)}</p>${extra}
     <h2 style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#716c80;margin-top:22px">${escape(t.summaryHeading)}</h2>
     ${fieldsTable(type, payload)}`,
    t.footer,
  );
  return { subject: copy.subject, html, text: `${t.greeting(name)}\n\n${copy.body}${type === "assistance" ? `\n\n${copy.emergency}` : ""}\n\n${t.footer}` };
}

function newsletterWelcome(locale, { unsubscribeUrl }) {
  const t = ACK[pickLocale(locale)];
  const copy = t.newsletter;
  const html = wrap(
    copy.subject.split(" — ")[0],
    `<p>${escape(copy.body)}</p>
     <p style="font-size:12px;color:#716c80;margin-top:22px">${escape(copy.unsubscribe)} <a href="${unsubscribeUrl}" style="color:#5626a6">${escape(copy.unsubscribeCta)}</a></p>`,
    t.footer,
  );
  return { subject: copy.subject, html, text: `${copy.body}\n\n${copy.unsubscribe} ${unsubscribeUrl}\n\n${t.footer}` };
}

// Staff alert copy in the language chosen per form in Notification settings.
// Field labels in the summary table stay in English (the backoffice is
// English-only); the visitor's own answers are shown verbatim.
const STAFF = {
  en: {
    titles: { volunteer: "New volunteer interest", partnership: "New partnership inquiry", assistance: "New request for assistance", contact: "New contact message" },
    fallbackTitle: "New submission",
    language: "language",
    from: "from",
    visitor: "a visitor",
    open: "Open in the backoffice",
    footer: "Sent by the Be Real Humanitarian Works API.",
  },
  fr: {
    titles: { volunteer: "Nouvel intérêt pour le bénévolat", partnership: "Nouvelle demande de partenariat", assistance: "Nouvelle demande d'aide", contact: "Nouveau message de contact" },
    fallbackTitle: "Nouvelle soumission",
    language: "langue",
    from: "de",
    visitor: "un visiteur",
    open: "Ouvrir dans le backoffice",
    footer: "Envoyé par l'API de Be Real Humanitarian Works.",
  },
  es: {
    titles: { volunteer: "Nuevo interés en voluntariado", partnership: "Nueva consulta de alianza", assistance: "Nueva solicitud de ayuda", contact: "Nuevo mensaje de contacto" },
    fallbackTitle: "Nuevo envío",
    language: "idioma",
    from: "de",
    visitor: "un visitante",
    open: "Abrir en el backoffice",
    footer: "Enviado por la API de Be Real Humanitarian Works.",
  },
};

function staffAlert(type, submission, locale = "en") {
  const t = STAFF[pickLocale(locale)];
  const link = `${backofficeUrl}/inbox/${type}?id=${submission.id}`;
  const title = t.titles[type] || t.fallbackTitle;
  const who = submission.name || submission.email || t.visitor;
  const html = wrap(
    title,
    `<p><strong>${escape(submission.name || "—")}</strong> · ${escape(submission.email || "—")} · ${escape(t.language)}: ${escape(submission.locale)}</p>
     ${fieldsTable(type, submission.payload)}
     <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#5626a6;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px">${escape(t.open)}</a></p>`,
    t.footer,
  );
  return {
    subject: `[Be Real] ${title} ${t.from} ${who}`,
    html,
    text: `${title}: ${submission.name || ""} ${submission.email || ""} (${t.language}: ${submission.locale})\n${t.open}: ${link}`,
  };
}

module.exports = { acknowledgment, newsletterWelcome, staffAlert, pickLocale };
