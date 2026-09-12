import { z } from "zod";

// Error messages are keys into Forms.errors in src/messages/*.json so every
// validation message is translated. The backend mirrors these rules with
// express-validator (spec Section 09).

const required = z.string().trim().min(1, "required");
const email = z.email("email");
const phone = z.string().trim().min(6, "phone");
const mustBeChecked = (key: string) => z.boolean().refine((v) => v === true, key);
// Honeypot: real visitors never see this field, bots fill it.
const honeypot = z.string().max(0, "required").optional();

export const ORG_TYPES = [
  "church",
  "nonprofit",
  "community",
  "healthcare",
  "business",
  "other",
] as const;

export const CONTACT_METHODS = ["email", "phone", "text"] as const;

export const ASSISTANCE_TYPES = [
  "health",
  "essentials",
  "education",
  "outreach",
  "other",
] as const;

export const URGENCY_LEVELS = ["low", "month", "twoWeeks", "asap"] as const;

export const volunteerSchema = z.object({
  fullName: required,
  email,
  phone,
  location: required,
  interests: required,
  availability: required,
  ageConfirmed: mustBeChecked("age"),
  consent: mustBeChecked("consent"),
  website: honeypot,
});

export const partnershipSchema = z.object({
  organizationName: required,
  contactName: required,
  email,
  phone,
  organizationType: z.enum(ORG_TYPES, "select"),
  proposal: required,
  message: required,
  consent: mustBeChecked("consent"),
  website: honeypot,
});

export const assistanceSchema = z.object({
  fullName: required,
  email,
  phone,
  city: required,
  state: required,
  country: required,
  preferredContact: z.enum(CONTACT_METHODS, "select"),
  assistanceType: z.enum(ASSISTANCE_TYPES, "select"),
  needDescription: z.string().trim().min(20, "minDescription"),
  urgency: z.enum(URGENCY_LEVELS, "select"),
  deadline: z.string().trim().optional(),
  consent: mustBeChecked("consent"),
  privacyAcknowledged: mustBeChecked("privacy"),
  website: honeypot,
});

export const contactSchema = z.object({
  name: required,
  email,
  subject: required,
  message: required,
  website: honeypot,
});

export const newsletterSchema = z.object({
  email,
  consent: mustBeChecked("consent"),
  website: honeypot,
});

export type VolunteerFormValues = z.infer<typeof volunteerSchema>;
export type PartnershipFormValues = z.infer<typeof partnershipSchema>;
export type AssistanceFormValues = z.infer<typeof assistanceSchema>;
export type ContactFormValues = z.infer<typeof contactSchema>;
export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
