const PDFDocument = require("pdfkit");

const { resend, siteUrl } = require("../config/env");
const { DonationEvent, ReceiptSequence, SiteSetting } = require("../models");
const { pick } = require("../utils/localized");
const { sendEmail } = require("./email.service");

// Donation receipts in the donor's language: a PDF attached to an email, plus
// the same content on the printable thank-you page. Wording comes from
// Donation settings; identity (legal name, EIN, address) from Site settings.

const COPY = {
  en: {
    title: "Donation receipt",
    subject: (n) => `Your donation receipt ${n} — Be Real Humanitarian Works`,
    greeting: (name) => `Dear ${name},`,
    receiptNumber: "Receipt number",
    date: "Date",
    donor: "Donor",
    amount: "Amount",
    method: "Payment method",
    methodValue: "Card, via Stripe",
    reference: "Payment reference",
    intro: "Thank you for your generous gift to Be Real Humanitarian Works Inc. Your support helps us bring hope, care and practical assistance to vulnerable individuals and families.",
    irs: "No goods or services were provided in exchange for this contribution. Be Real Humanitarian Works Inc. is recognized by the IRS as a tax-exempt public charity under IRC §501(c)(3). Please keep this receipt for your tax records.",
    signoff: "With gratitude,",
    attached: "Your receipt is attached as a PDF.",
    footer: (legal) => `${legal} · This receipt was generated automatically.`,
    ein: "EIN",
  },
  fr: {
    title: "Reçu de don",
    subject: (n) => `Votre reçu de don ${n} — Be Real Humanitarian Works`,
    greeting: (name) => `Cher/Chère ${name},`,
    receiptNumber: "Numéro de reçu",
    date: "Date",
    donor: "Donateur",
    amount: "Montant",
    method: "Mode de paiement",
    methodValue: "Carte, via Stripe",
    reference: "Référence du paiement",
    intro: "Merci pour votre généreux don à Be Real Humanitarian Works Inc. Votre soutien nous aide à apporter espoir, soins et aide concrète aux personnes et familles vulnérables.",
    irs: "Aucun bien ni service n'a été fourni en échange de cette contribution. Be Real Humanitarian Works Inc. est reconnue par l'IRS comme organisme de bienfaisance public exonéré d'impôt au titre de l'IRC §501(c)(3). Veuillez conserver ce reçu pour vos dossiers fiscaux.",
    signoff: "Avec gratitude,",
    attached: "Votre reçu est joint au format PDF.",
    footer: (legal) => `${legal} · Ce reçu a été généré automatiquement.`,
    ein: "EIN",
  },
  es: {
    title: "Recibo de donación",
    subject: (n) => `Tu recibo de donación ${n} — Be Real Humanitarian Works`,
    greeting: (name) => `Estimado/a ${name}:`,
    receiptNumber: "Número de recibo",
    date: "Fecha",
    donor: "Donante",
    amount: "Importe",
    method: "Método de pago",
    methodValue: "Tarjeta, a través de Stripe",
    reference: "Referencia del pago",
    intro: "Gracias por tu generosa donación a Be Real Humanitarian Works Inc. Tu apoyo nos ayuda a llevar esperanza, cuidado y ayuda práctica a personas y familias vulnerables.",
    irs: "No se proporcionaron bienes ni servicios a cambio de esta contribución. Be Real Humanitarian Works Inc. está reconocida por el IRS como organización benéfica pública exenta de impuestos conforme al IRC §501(c)(3). Conserva este recibo para tus registros fiscales.",
    signoff: "Con gratitud,",
    attached: "Tu recibo se adjunta en formato PDF.",
    footer: (legal) => `${legal} · Este recibo se generó automáticamente.`,
    ein: "EIN",
  },
};

const LOCALE_TAG = { en: "en-US", fr: "fr-FR", es: "es-ES" };
const copyFor = (locale) => COPY[locale] || COPY.en;

function formatAmount(cents, currency = "usd", locale = "en") {
  return new Intl.NumberFormat(LOCALE_TAG[locale] || "en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function formatDate(date, locale = "en") {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] || "en-US", { dateStyle: "long", timeZone: "America/Chicago" }).format(new Date(date));
}

// BRHW-2026-00001, sequence locked per fiscal year inside the caller's transaction.
async function nextReceiptNumber(paidAt, transaction) {
  const year = new Date(paidAt).getUTCFullYear();
  const [row] = await ReceiptSequence.findOrCreate({ where: { year }, defaults: { last: 0 }, transaction, lock: transaction.LOCK.UPDATE });
  await row.reload({ transaction, lock: transaction.LOCK.UPDATE });
  row.last += 1;
  await row.save({ transaction });
  return `BRHW-${year}-${String(row.last).padStart(5, "0")}`;
}

// Everything a receipt shows, resolved for one donation.
async function receiptContext(donation, settings) {
  const site = await SiteSetting.findByPk(1);
  const locale = ["en", "fr", "es"].includes(donation.locale) ? donation.locale : "en";
  const t = copyFor(locale);
  return {
    locale,
    t,
    legalName: site?.legalName || "Be Real Humanitarian Works Inc.",
    ein: site?.showEin === false ? null : site?.ein || null,
    address: site?.addressLine || null,
    intro: pick(settings?.receiptIntro, locale) || t.intro,
    irs: pick(settings?.receiptIrsStatement, locale) || t.irs,
    signoff: pick(settings?.receiptSignoff, locale) || t.signoff,
    senderName: settings?.receiptSenderName || "Be Real Humanitarian Works Inc.",
    replyTo: settings?.receiptReplyTo || null,
    amount: formatAmount(donation.amountCents, donation.currency, locale),
    date: formatDate(donation.paidAt || donation.createdAt, locale),
    reference: donation.providerPaymentIntentId || donation.providerSessionId || String(donation.id),
  };
}

function buildReceiptPdf(donation, ctx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56, info: { Title: `${ctx.t.title} ${donation.receiptNumber}`, Author: ctx.legalName } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const purple = "#5626a6";
    const ink = "#211044";
    const muted = "#716c80";

    doc.fillColor(purple).font("Helvetica-Bold").fontSize(10).text("BE REAL HUMANITARIAN WORKS", { characterSpacing: 2 });
    doc.moveDown(0.3);
    doc.fillColor(ink).fontSize(22).text(ctx.t.title);
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(10).fillColor(muted).text(ctx.legalName);
    if (ctx.address) doc.text(ctx.address);
    if (ctx.ein) doc.text(`${ctx.t.ein} ${ctx.ein}`);
    doc.moveDown(1.2);

    const rows = [
      [ctx.t.receiptNumber, donation.receiptNumber],
      [ctx.t.date, ctx.date],
      [ctx.t.donor, `${donation.donorName} · ${donation.donorEmail}`],
      [ctx.t.amount, ctx.amount],
      [ctx.t.method, ctx.t.methodValue],
      [ctx.t.reference, ctx.reference],
    ];
    const left = doc.x;
    const top = doc.y;
    doc.roundedRect(left, top, 500, rows.length * 22 + 16, 8).fillAndStroke("#f7f6fa", "#e8e3ef");
    let y = top + 12;
    for (const [label, value] of rows) {
      doc.fillColor(muted).font("Helvetica").fontSize(9).text(label.toUpperCase(), left + 14, y, { width: 150, characterSpacing: 0.5 });
      doc.fillColor(ink).font(label === ctx.t.amount ? "Helvetica-Bold" : "Helvetica").fontSize(11).text(value, left + 170, y - 1, { width: 316 });
      y += 22;
    }
    doc.y = top + rows.length * 22 + 36;
    doc.x = left;

    doc.fillColor(ink).font("Helvetica").fontSize(11).text(ctx.t.greeting(donation.donorName));
    doc.moveDown(0.6);
    doc.text(ctx.intro, { lineGap: 3 });
    doc.moveDown(0.8);
    doc.fillColor("#7a4a12").fontSize(10).text(ctx.irs, { lineGap: 2 });
    doc.moveDown(1);
    doc.fillColor(ink).fontSize(11).text(ctx.signoff);
    doc.font("Helvetica-Bold").text(ctx.senderName);
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(8).fillColor(muted).text(ctx.t.footer(ctx.legalName));
    doc.text(siteUrl);
    doc.end();
  });
}

function receiptEmail(donation, ctx) {
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const line = (label, value) => `<tr><td style="padding:5px 12px 5px 0;color:#716c80;font-size:12px">${esc(label)}</td><td style="padding:5px 0;font-size:13px;color:#211044"><strong>${esc(value)}</strong></td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f6fa;font-family:Arial,Helvetica,sans-serif;color:#211b38">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e3ef;border-radius:14px;padding:28px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5626a6">Be Real Humanitarian Works</div>
    <h1 style="font-size:20px;margin:14px 0 10px;color:#211044">${esc(ctx.t.title)} ${esc(donation.receiptNumber)}</h1>
    <p>${esc(ctx.t.greeting(donation.donorName))}</p>
    <p>${esc(ctx.intro)}</p>
    <table style="border-collapse:collapse;margin:16px 0">${line(ctx.t.receiptNumber, donation.receiptNumber)}${line(ctx.t.date, ctx.date)}${line(ctx.t.amount, ctx.amount)}${line(ctx.t.method, ctx.t.methodValue)}</table>
    <p style="font-size:12px;color:#7a4a12;background:#fff5f2;border:1px solid #ffe4df;border-radius:10px;padding:10px 12px">${esc(ctx.irs)}</p>
    <p style="font-size:12px;color:#716c80">${esc(ctx.t.attached)}</p>
    <p>${esc(ctx.signoff)}<br><strong>${esc(ctx.senderName)}</strong></p>
    <p style="font-size:11px;color:#716c80;margin-top:28px">${esc(ctx.legalName)}${ctx.ein ? ` · ${esc(ctx.t.ein)} ${esc(ctx.ein)}` : ""}${ctx.address ? ` · ${esc(ctx.address)}` : ""}</p>
  </div></body></html>`;
  const text = `${ctx.t.greeting(donation.donorName)}\n\n${ctx.intro}\n\n${ctx.t.receiptNumber}: ${donation.receiptNumber}\n${ctx.t.date}: ${ctx.date}\n${ctx.t.amount}: ${ctx.amount}\n${ctx.t.method}: ${ctx.t.methodValue}\n\n${ctx.irs}\n\n${ctx.signoff}\n${ctx.senderName}\n\n${ctx.legalName}${ctx.ein ? ` · ${ctx.t.ein} ${ctx.ein}` : ""}`;
  return { subject: ctx.t.subject(donation.receiptNumber), html, text };
}

async function renderReceipt(donation, settings) {
  const ctx = await receiptContext(donation, settings);
  const pdf = await buildReceiptPdf(donation, ctx);
  return { ctx, pdf, filename: `${donation.receiptNumber}.pdf` };
}

// Emails the receipt (PDF attached) and records it on the donation timeline.
async function sendReceipt(donation, settings, { resent = false, actorName = null } = {}) {
  const { ctx, pdf, filename } = await renderReceipt(donation, settings);
  const mail = receiptEmail(donation, ctx);
  await sendEmail({
    to: donation.donorEmail,
    kind: resent ? "donation_receipt_resent" : "donation_receipt",
    replyTo: ctx.replyTo || undefined,
    attachments: [{ filename, content: pdf.toString("base64") }],
    ...mail,
  });
  donation.receiptSentAt = new Date();
  donation.receiptSendCount = (donation.receiptSendCount || 0) + 1;
  await donation.save();
  await DonationEvent.create({ donationId: donation.id, type: resent ? "receipt_resent" : "receipt_sent", data: { to: donation.donorEmail, locale: ctx.locale }, actorName });
  return { from: resend.fromEmail, to: donation.donorEmail };
}

module.exports = { COPY, formatAmount, formatDate, nextReceiptNumber, receiptContext, renderReceipt, receiptEmail, sendReceipt };
