// Field order per public form (mirrors frontend/src/lib/zod-schemas/forms.ts).
// Used for CSV exports, staff notification emails and payload sanitizing.
const FORM_TYPES = ["volunteer", "partnership", "assistance", "contact"];

const FORM_FIELDS = {
  volunteer: ["fullName", "email", "phone", "location", "interests", "availability", "ageConfirmed", "consent"],
  partnership: ["organizationName", "contactName", "email", "phone", "organizationType", "proposal", "message", "consent"],
  assistance: [
    "fullName",
    "email",
    "phone",
    "city",
    "state",
    "country",
    "preferredContact",
    "assistanceType",
    "needDescription",
    "urgency",
    "deadline",
    "consent",
    "privacyAcknowledged",
  ],
  contact: ["name", "email", "subject", "message"],
};

const FIELD_LABELS = {
  fullName: "Full name",
  name: "Name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  interests: "Interests / skills",
  availability: "Availability",
  ageConfirmed: "18 or older",
  consent: "Consent to contact",
  organizationName: "Organization",
  contactName: "Contact name",
  organizationType: "Organization type",
  proposal: "Proposed partnership",
  message: "Message",
  city: "City",
  state: "State / region",
  country: "Country",
  preferredContact: "Preferred contact",
  assistanceType: "Assistance type",
  needDescription: "Description of need",
  urgency: "Urgency",
  deadline: "Deadline",
  privacyAcknowledged: "Privacy acknowledged",
  subject: "Subject",
};

const ORG_TYPES = ["church", "nonprofit", "community", "healthcare", "business", "other"];
const CONTACT_METHODS = ["email", "phone", "text"];
const ASSISTANCE_TYPES = ["health", "essentials", "education", "outreach", "other"];
const URGENCY_LEVELS = ["low", "month", "twoWeeks", "asap"];
const LOCALES = ["en", "fr", "es"];

// Who the submission is "from", for list views and notifications.
function extractIdentity(type, payload) {
  const name = payload.fullName || payload.contactName || payload.name || null;
  return { name: name ? String(name).slice(0, 160) : null, email: payload.email ? String(payload.email).toLowerCase() : null };
}

function pickFields(type, body) {
  const out = {};
  for (const key of FORM_FIELDS[type]) if (body[key] !== undefined) out[key] = body[key];
  return out;
}

module.exports = {
  FORM_TYPES,
  FORM_FIELDS,
  FIELD_LABELS,
  ORG_TYPES,
  CONTACT_METHODS,
  ASSISTANCE_TYPES,
  URGENCY_LEVELS,
  LOCALES,
  extractIdentity,
  pickFields,
};
