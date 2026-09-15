const crypto = require("crypto");

const { gemini, siteUrl, jwt: jwtConfig, isProd } = require("../config/env");
const { LOCALES, NAV_ITEMS } = require("../config/content");
const { ChatSetting, ChatSession, ChatMessage, SiteSetting, Program, ImpactMetric, TeamMember, LegalPage, DonationSetting } = require("../models");
const ApiError = require("../utils/apiError");
const { pick } = require("../utils/localized");

// Website AI assistant on Google Gemini. The key never leaves this process:
// the site calls POST /api/public/chat, this service builds a prompt from the
// organization's own published content and asks Gemini for the reply.
//
// Grounding rules (spec: never invent facts): the system prompt carries the
// facts the assistant may use and tells it to say "I don't know" otherwise.

const LOCALE_NAME = { en: "English", fr: "French", es: "Spanish" };
const HISTORY_LIMIT = 12;
const MESSAGE_MAX_CHARS = 1500;
const REQUEST_TIMEOUT_MS = 25_000;

const DEFAULTS = {
  assistantName: "Be Real Assistant",
  welcome: {
    en: "Hello! I'm the Be Real Humanitarian Works assistant. Ask me about our programs, how to donate, volunteer, or request assistance.",
    fr: "Bonjour ! Je suis l'assistant de Be Real Humanitarian Works. Posez-moi vos questions sur nos programmes, les dons, le bénévolat ou les demandes d'aide.",
    es: "¡Hola! Soy el asistente de Be Real Humanitarian Works. Pregúntame sobre nuestros programas, cómo donar, ser voluntario o solicitar ayuda.",
  },
  suggestedQuestions: {
    en: ["What does Be Real Humanitarian Works do?", "How can I donate?", "How do I request assistance?", "How can I volunteer?"],
    fr: ["Que fait Be Real Humanitarian Works ?", "Comment faire un don ?", "Comment demander de l'aide ?", "Comment devenir bénévole ?"],
    es: ["¿Qué hace Be Real Humanitarian Works?", "¿Cómo puedo donar?", "¿Cómo solicito ayuda?", "¿Cómo puedo ser voluntario?"],
  },
};

const isConfigured = () => Boolean(gemini.apiKey);

// ---- Settings -----------------------------------------------------------------

async function ensureChatDefaults() {
  const [row] = await ChatSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1, enabled: true, assistantName: DEFAULTS.assistantName, welcome: DEFAULTS.welcome, suggestedQuestions: DEFAULTS.suggestedQuestions, extraKnowledge: { en: "", fr: "", es: "" }, maxMessagesPerSession: 30 },
  });
  return row;
}

const getSettings = () => ensureChatDefaults();

// What the website needs to render the widget (no key, no prompt).
async function publicConfig(locale) {
  const settings = await getSettings();
  const l = LOCALES.includes(locale) ? locale : "en";
  const questions = settings.suggestedQuestions?.[l]?.length ? settings.suggestedQuestions[l] : settings.suggestedQuestions?.en || [];
  return {
    enabled: Boolean(settings.enabled) && isConfigured(),
    name: settings.assistantName,
    welcome: pick(settings.welcome, l) || DEFAULTS.welcome[l],
    suggestedQuestions: questions.slice(0, 6),
  };
}

// ---- Facts the assistant may use ------------------------------------------------

let factsCache = { at: 0, byLocale: {} };

// Settings and content edits must reach the next answer at once.
const invalidateFacts = () => {
  factsCache = { at: 0, byLocale: {} };
};

async function loadFacts(locale) {
  if (Date.now() - factsCache.at > 60 * 1000) factsCache = { at: Date.now(), byLocale: {} };
  if (factsCache.byLocale[locale]) return factsCache.byLocale[locale];

  const [site, programs, metrics, team, legal, donation, settings] = await Promise.all([
    SiteSetting.findByPk(1),
    Program.findAll({ where: { visible: true }, order: [["order", "ASC"], ["id", "ASC"]] }),
    ImpactMetric.findAll({ where: { published: true }, order: [["order", "ASC"]] }),
    TeamMember.findAll({ where: { visible: true }, order: [["order", "ASC"], ["id", "ASC"]] }),
    LegalPage.findAll(),
    DonationSetting.findByPk(1),
    getSettings(),
  ]);

  const base = `${siteUrl.replace(/\/$/, "")}/${locale}`;
  const lines = [];
  const legalName = site?.legalName || "Be Real Humanitarian Works Inc.";
  lines.push(`Organization: ${legalName}${site?.shortName ? ` ("${site.shortName}")` : ""}.`);
  if (site?.tagline) lines.push(`Tagline: ${pick(site.tagline, locale)}`);
  if (site?.statusLine) lines.push(`Status: ${pick(site.statusLine, locale)}`);
  if (site?.showEin && site?.ein) lines.push(`EIN (tax ID): ${site.ein}.`);
  if (site?.neutralityStatement) lines.push(`Statement: ${pick(site.neutralityStatement, locale)}`);
  if (site?.addressLine) lines.push(`Location: ${site.addressLine}. The mailing address is available on request through the contact page.`);
  if (site?.contactEmail) lines.push(`Public email: ${site.contactEmail}.`);
  if (site?.contactPhone) lines.push(`Public phone: ${site.contactPhone}.`);
  if (!site?.contactEmail && !site?.contactPhone) lines.push(`No public email or phone is published; the contact form on the website is the way to reach the organization.`);
  if (site?.socialLinks?.length) lines.push(`Social media: ${site.socialLinks.map((s) => `${s.platform}: ${s.url}`).join(", ")}.`);

  lines.push("");
  lines.push("Programs:");
  for (const p of programs) {
    const focus = (p.focusItems?.[locale] || p.focusItems?.en || []).join("; ");
    lines.push(`- ${pick(p.name, locale)}: ${pick(p.purpose, locale) || pick(p.summary, locale)}${focus ? ` Focus: ${focus}.` : ""}`);
  }

  if (metrics.length) {
    lines.push("");
    lines.push("Published impact figures (only these numbers may be quoted):");
    for (const m of metrics) lines.push(`- ${pick(m.label, locale)}: ${m.value}${m.documentedOn ? ` (documented ${m.documentedOn})` : ""}`);
  } else {
    lines.push("");
    lines.push("Impact figures: none are published yet. Do not quote any number of people helped, meals, or amounts raised.");
  }

  if (team.length) {
    lines.push("");
    lines.push(`Leadership: ${team.map((t) => `${t.name} (${pick(t.role, locale)})`).join(", ")}.`);
  }

  lines.push("");
  lines.push("Donations:");
  const donateEnabled = site ? site.donateEnabled !== false : true;
  if (donateEnabled && donation) {
    const cur = (donation.currency || "usd").toUpperCase();
    lines.push(`- Online donations are accepted at ${base}/donate, by card through Stripe, in ${cur}. Suggested one-time amounts: ${donation.suggestedAmounts.join(", ")}.${donation.monthlyEnabled ? ` Monthly gifts are available (suggested ${donation.monthlySuggestedAmounts.join(", ")} per month) and can be changed or cancelled anytime from the link in the receipt email.` : ""}`);
    lines.push(`- Every gift gets an emailed receipt with a receipt number. Contributions are tax-deductible to the extent permitted by law (donors should check their own situation).`);
    if (donation.feeCoverEnabled) lines.push(`- Donors can optionally add the card processing fee so the full gift reaches the organization.`);
  } else {
    lines.push(`- Online donations are currently paused; visitors can use the contact page to ask how to give.`);
  }

  lines.push("");
  lines.push("How to get involved:");
  lines.push(`- Volunteer: fill in the volunteer interest form at ${base}/get-involved.`);
  lines.push(`- Partner (churches, businesses, organizations): partnership inquiry form at ${base}/get-involved.`);
  lines.push(`- Request assistance: the form at ${base}/request-assistance. Requests are reviewed by staff, who reply by email or phone; it is NOT an emergency service and there is no guarantee of approval. Support depends on available resources.`);
  lines.push(`- Newsletter: sign up on the contact page.`);

  lines.push("");
  lines.push("Website pages:");
  for (const item of NAV_ITEMS) lines.push(`- ${item.key}: ${base}${item.href === "/" ? "" : item.href}`);
  lines.push(`- donate: ${base}/donate`);
  for (const page of legal) if (page.version > 0) lines.push(`- ${page.slug}: ${base}/${page.slug}`);

  const extra = pick(settings.extraKnowledge, locale);
  if (extra) {
    lines.push("");
    lines.push("Additional information from the organization:");
    lines.push(extra);
  }

  const facts = lines.join("\n");
  factsCache.byLocale[locale] = facts;
  return facts;
}

function systemPrompt({ name, locale, facts, siteName }) {
  return [
    `You are "${name}", the virtual assistant on the website of ${siteName}, a Texas 501(c)(3) public charity.`,
    `Answer visitors' questions about the organization using ONLY the facts listed under FACTS. Rules:`,
    `1. Reply in the language the visitor writes in (the site is currently shown in ${LOCALE_NAME[locale] || "English"}). Keep answers short: two to five sentences, warm and plain. Use a short list only for step-by-step instructions.`,
    `2. If the facts do not contain the answer, say you do not have that information and point to the contact page. Never invent numbers, dates, names, places, prices, deadlines or results.`,
    `3. The organization does NOT provide emergency services. If someone describes an emergency or a danger to life, tell them to contact local emergency services right away; the Request Assistance form is reviewed by staff and is not immediate.`,
    `4. Do not give medical, legal, tax, financial or immigration advice. Suggest a qualified professional. For donations you may say receipts are provided and that tax treatment depends on the donor's situation.`,
    `5. Do not ask for or collect sensitive personal information (health details, identity or card numbers). People who need help should use the Request Assistance page.`,
    `6. Stay on topics related to the organization, its programs and humanitarian help. For unrelated requests, politely say you can only help with questions about the organization.`,
    `7. Never claim to be human. Never promise that a request or application will be approved.`,
    `8. Only use links that appear in FACTS, written as plain URLs.`,
    ``,
    `FACTS`,
    facts,
  ].join("\n");
}

// ---- Gemini call ----------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function askGemini({ system, history }) {
  const model = gemini.model;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 700, ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
  };
  // A 429 (per-minute quota on the free tier, or a burst of visitors) is
  // retried once after a short pause before giving up.
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": gemini.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 429 && attempt === 0) {
        await sleep(2500);
        continue;
      }
      if (!response.ok) {
        const error = new Error(`Gemini ${response.status}: ${data.error?.message || "request failed"}`);
        error.status = response.status;
        throw error;
      }
      const candidate = data.candidates?.[0];
      const text = (candidate?.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (!text) {
        const reason = candidate?.finishReason || data.promptFeedback?.blockReason || "empty";
        throw new Error(`Gemini returned no text (${reason})`);
      }
      return { text, model };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Gemini 429: quota exceeded");
}

// ---- Conversation ---------------------------------------------------------------

const hashIp = (ip) => (ip ? crypto.createHash("sha256").update(`${ip}|${jwtConfig.secret}`).digest("hex").slice(0, 32) : null);

// One turn: validates, records the visitor's message, asks Gemini, records the reply.
async function reply({ sessionKey, locale, page, messages, ip, userAgent }) {
  const settings = await getSettings();
  if (!settings.enabled || !isConfigured()) throw new ApiError(503, "The assistant is not available right now");

  const l = LOCALES.includes(locale) ? locale : "en";
  const history = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MESSAGE_MAX_CHARS) }))
    .slice(-HISTORY_LIMIT);
  if (!history.length || history[history.length - 1].role !== "user") throw ApiError.badRequest("The last message must come from the visitor");

  let session = sessionKey ? await ChatSession.findOne({ where: { sessionKey } }) : null;
  if (!session) {
    session = await ChatSession.create({ sessionKey: crypto.randomUUID(), locale: l, page: page ? String(page).slice(0, 200) : null, ipHash: hashIp(ip), userAgent: userAgent ? String(userAgent).slice(0, 255) : null });
  }
  if (session.messageCount >= settings.maxMessagesPerSession * 2) throw new ApiError(429, "This conversation has reached its limit. Please start a new one.");

  const question = history[history.length - 1];
  await ChatMessage.create({ sessionId: session.id, role: "user", content: question.content });

  const [site, facts] = await Promise.all([SiteSetting.findByPk(1), loadFacts(l)]);
  const system = systemPrompt({ name: settings.assistantName, locale: l, facts, siteName: site?.legalName || "Be Real Humanitarian Works Inc." });

  const started = Date.now();
  try {
    const { text, model } = await askGemini({ system, history });
    await ChatMessage.create({ sessionId: session.id, role: "assistant", content: text, model, latencyMs: Date.now() - started });
    await session.update({ messageCount: session.messageCount + 2, lastMessageAt: new Date(), locale: l });
    return { reply: text, sessionKey: session.sessionKey };
  } catch (error) {
    await ChatMessage.create({ sessionId: session.id, role: "assistant", content: "", model: gemini.model, latencyMs: Date.now() - started, error: String(error.message).slice(0, 1000) });
    await session.update({ messageCount: session.messageCount + 1, lastMessageAt: new Date() });
    if (!isProd) console.error("[chat]", error.message);
    if (error.status === 429) throw new ApiError(503, "The assistant is busy right now. Please try again in a minute.");
    throw new ApiError(502, "The assistant could not answer right now. Please try again in a moment.");
  }
}

module.exports = { DEFAULTS, isConfigured, ensureChatDefaults, getSettings, publicConfig, loadFacts, invalidateFacts, systemPrompt, askGemini, reply };
