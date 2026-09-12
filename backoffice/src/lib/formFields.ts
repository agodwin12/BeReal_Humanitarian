import type { LucideIcon } from "lucide-react";
import { HandHelping, Handshake, LifeBuoy, Mail } from "lucide-react";

import type { FormType, Role } from "@/lib/types";

// Mirrors backend/config/formFields.js and the public forms' option lists
// (frontend/src/messages/en.json → Forms.options). Staff always read the
// inbox in English; the visitor's language is shown as a badge.

export const FORM_TYPES: FormType[] = ["volunteer", "partnership", "assistance", "contact"];

export function isFormType(value: string): value is FormType {
  return (FORM_TYPES as string[]).includes(value);
}

export type InboxMeta = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Omit = every role can open it. */
  roles?: Role[];
  /** Payload field used as the row headline next to the sender's name. */
  headline?: string;
};

export const INBOX: Record<FormType, InboxMeta> = {
  volunteer: {
    title: "Volunteer interest",
    description: "Submissions from the Get Involved page volunteer form.",
    icon: HandHelping,
  },
  partnership: {
    title: "Partnership inquiries",
    description: "Submissions from the Get Involved page partnership form.",
    icon: Handshake,
    headline: "organizationName",
  },
  assistance: {
    title: "Request assistance",
    description: "Requests from people in hardship. Restricted to Super Admins and handled with extra care.",
    icon: LifeBuoy,
    roles: ["super_admin"],
  },
  contact: {
    title: "General contact",
    description: "Messages from the Contact page form.",
    icon: Mail,
    headline: "subject",
  },
};

export const FORM_FIELDS: Record<FormType, string[]> = {
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

export const FIELD_LABELS: Record<string, string> = {
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
  privacyAcknowledged: "Privacy notice acknowledged",
  subject: "Subject",
};

// Fields rendered as multi-line blocks in the detail panel.
export const LONG_FIELDS = new Set(["interests", "availability", "proposal", "message", "needDescription"]);

// Fields whose stored value is an option key.
export const OPTION_LABELS: Record<string, Record<string, string>> = {
  organizationType: {
    church: "Church",
    nonprofit: "Nonprofit",
    community: "Community organization",
    healthcare: "Healthcare or social-service partner",
    business: "Business or corporate sponsor",
    other: "Other",
  },
  preferredContact: { email: "Email", phone: "Phone call", text: "Text message" },
  assistanceType: {
    health: "Health-related support",
    essentials: "Food and essential needs",
    education: "Education and skills",
    outreach: "Community or faith outreach",
    other: "Other",
  },
  urgency: {
    low: "Not urgent",
    month: "Within the next month",
    twoWeeks: "Within the next two weeks",
    asap: "As soon as possible",
  },
};

// Fields surfaced at the top of the detail panel (and in the list for assistance).
export const HIGHLIGHT_FIELDS: Partial<Record<FormType, string[]>> = {
  assistance: ["assistanceType", "urgency", "preferredContact", "deadline"],
  partnership: ["organizationType"],
};

export function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return OPTION_LABELS[field]?.[text] ?? text;
}
