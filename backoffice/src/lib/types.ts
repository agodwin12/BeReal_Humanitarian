export type Role = "super_admin" | "editor" | "read_only";
export type UserStatus = "invited" | "active" | "disabled";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  read_only: "Read-only",
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  invited: "Invited",
  active: "Active",
  disabled: "Deactivated",
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  invitedById: number | null;
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled?: boolean;
  twoFactorEnabledAt?: string | null;
  recoveryCodesLeft?: number | null;
};

export type AuditEntry = {
  id: number | string;
  userId: number | null;
  actorName: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  meta: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: { id: number; name: string; email: string } | null;
};

export type PageMeta = { page: number; pageSize: number; total: number; totalPages: number };

// ---- Phase B: inbox, subscribers, notifications ------------------------------

export type FormType = "volunteer" | "partnership" | "assistance" | "contact";
export type NotificationFormType = FormType | "newsletter";
export type SubmissionStatus = "new" | "in_review" | "contacted" | "closed";
export type Locale = "en" | "fr" | "es";

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  new: "New",
  in_review: "In review",
  contacted: "Contacted",
  closed: "Closed",
};

export const LOCALE_LABEL: Record<Locale, string> = { en: "English", fr: "French", es: "Spanish" };

export type Assignee = { id: number; name: string; email: string };

export type SubmissionNote = {
  id: number;
  submissionId: number;
  userId: number | null;
  authorName: string | null;
  body: string;
  createdAt: string;
  author?: { id: number; name: string } | null;
};

export type Submission = {
  id: number;
  type: FormType;
  locale: Locale;
  name: string | null;
  email: string | null;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  assignedToId: number | null;
  assignee?: Assignee | null;
  isSpam: boolean;
  spamReason: string | null;
  sourcePage: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: SubmissionNote[];
};

export type InboxCount = { new: number; total: number; spam: number };
export type InboxCounts = Partial<Record<FormType, InboxCount>>;

export type SubscriberStatus = "subscribed" | "unsubscribed";

export type Subscriber = {
  id: number;
  email: string;
  locale: Locale;
  status: SubscriberStatus;
  consentAt: string | null;
  unsubscribedAt: string | null;
  sourcePage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationSetting = {
  id: number;
  formType: NotificationFormType;
  recipients: string[];
  locale: Locale;
  enabled: boolean;
  updatedAt: string;
};

// ---- Phase C: content ---------------------------------------------------------

export type Localized = Partial<Record<Locale, string>>;
export type LocalizedList = Partial<Record<Locale, string[]>>;

export type MediaVariant = { url: string; width: number; height: number };

export type Media = {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  variants: Partial<Record<"thumb" | "medium" | "large", MediaVariant>>;
  alt: Localized;
  caption: Localized;
  credit: string | null;
  consentOnFile: boolean;
  storage?: string;
  uploadedBy?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MediaUsage = { type: string; id: number; label: string; field: string; href: string };

export type SocialLink = { platform: string; url: string };
export type NavEntry = { key: string; href: string; visible: boolean };

export type SiteSettings = {
  id: number;
  legalName: string;
  shortName: string;
  tagline: Localized;
  statusLine: Localized;
  neutralityStatement: Localized;
  fiscalYear: Localized;
  ein: string | null;
  showEin: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  addressNote: Localized;
  socialLinks: SocialLink[];
  navigation: NavEntry[];
  donateEnabled: boolean;
  donateDisabledMessage: Localized;
  enabledLocales: Locale[];
  seoDescription: Localized;
  brandPrimary: string | null;
  brandAccent: string | null;
  logoMediaId: number | null;
  faviconMediaId: number | null;
  shareMediaId: number | null;
  logo: Media | null;
  favicon: Media | null;
  shareImage: Media | null;
  heroSlideIds: number[];
  heroSlides: Media[];
  updatedAt: string;
};

export type Program = {
  id: number;
  slug: string;
  order: number;
  visible: boolean;
  icon: string;
  tint: "lavender" | "coral";
  name: Localized;
  cardLine1: Localized;
  cardLine2: Localized;
  summary: Localized;
  purpose: Localized;
  focusItems: LocalizedList;
  cardMediaId: number | null;
  detailMediaId: number | null;
  cardMedia: Media | null;
  detailMedia: Media | null;
  updatedAt: string;
};

export type TeamMember = {
  id: number;
  order: number;
  visible: boolean;
  name: string;
  role: Localized;
  bio: Localized;
  photoMediaId: number | null;
  photo: Media | null;
  photoApprovedAt: string | null;
  photoApprovedBy: string | null;
  updatedAt: string;
};

export type ImpactStoryRef = { id: number; slug: string | null; title: Localized; status?: "draft" | "published" };

export type GalleryItem = {
  id: number;
  kind: "image" | "video";
  media: Media | null;
  videoUrl: string | null;
  embedUrl: string | null;
  title: Localized;
  description: Localized;
  happenedOn: string | null;
  location: string | null;
  published: boolean;
  impactStoryId: number | null;
  impactStory: ImpactStoryRef | null;
  createdAt: string;
  updatedAt: string;
};

export type ImpactMetric = {
  id: number;
  key: string;
  order: number;
  icon: string;
  label: Localized;
  value: string | null;
  documentedOn: string | null;
  sourceNote: string | null;
  published: boolean;
  updatedAt: string;
};

export type ImpactStory = {
  id: number;
  order: number;
  slug: string | null;
  programId: number | null;
  program: { id: number; slug: string; name: Localized } | null;
  title: Localized;
  purpose: Localized;
  whatWeDid: Localized;
  summary: Localized;
  assistanceProvided: LocalizedList;
  peopleReachedCount: number | null;
  peopleReachedUnit: Localized;
  happenedOn: string | null;
  location: string | null;
  mediaId: number | null;
  media: Media | null;
  consentConfirmed: boolean;
  consentConfirmedAt: string | null;
  consentConfirmedBy: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
};

export type StewardshipUpdate = {
  id: number;
  date: string;
  title: Localized;
  body: Localized;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
};

export type ImpactOverview = { metrics: ImpactMetric[]; stories: ImpactStory[]; updates: StewardshipUpdate[] };

export type PageImageSlot = { slot: string; label: string; default: string };
export type PageSectionSchema = {
  key: string;
  title: string;
  description?: string;
  locked?: boolean;
  shared?: boolean;
  seo?: boolean;
  /** Absent on shared sections (edited under Global). */
  messageKeys?: string[];
  images?: PageImageSlot[];
};
export type PageSchema = { slug: string; title: string; path: string | null; sections: PageSectionSchema[] };

export type PageContent = {
  messages: Partial<Record<Locale, Record<string, string>>>;
  images: Record<string, number>;
  sections: { key: string; visible: boolean }[];
};

export type PageSummary = {
  slug: string;
  title: string;
  path: string | null;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
  hasUnpublishedChanges: boolean;
  overrideCount: number;
};

export type PageVersion = { id: number; note: string | null; createdAt: string; createdBy: { id: number; name: string } | null };

export type PageDetail = PageSummary & {
  schema: PageSchema;
  draft: PageContent;
  published: PageContent;
  draftImages: Record<string, Media>;
  publishedImages: Record<string, Media>;
  versions: PageVersion[];
};

export type LegalVersion = { id: number; version: number; effectiveDate: string | null; createdAt: string; createdBy: { id: number; name: string } | null };

export type LegalPage = {
  id: number;
  slug: string;
  label: string;
  title: Localized;
  body: Localized;
  effectiveDate: string | null;
  publishedTitle: Localized;
  publishedBody: Localized;
  publishedEffectiveDate: string | null;
  version: number;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  isPublished: boolean;
  versions: LegalVersion[];
};

// ---- Phase D: translations, system, 2FA --------------------------------------

export type TranslationStatus = "missing" | "needs_review" | "reviewed";
export type TargetLocale = "fr" | "es";

export type TranslationLocaleState = {
  text: string;
  origin: "built-in" | "edited";
  status: TranslationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  staleReview: boolean;
};

export type TranslationField = {
  id: string;
  kind: string;
  page: string;
  pageTitle: string;
  section: string;
  label: string;
  key?: string;
  multiline: boolean;
  rich: boolean;
  note?: string;
  en: string;
  fr: TranslationLocaleState;
  es: TranslationLocaleState;
};

export type TranslationCounts = { total: number; missing: number; needs_review: number; reviewed: number };
export type TranslationSummary = {
  locales: Record<TargetLocale, TranslationCounts>;
  pages: Record<string, { title: string; fr: TranslationCounts; es: TranslationCounts }>;
};

export type ImportReport = { applied: number; unchanged: number; unknown: number; errors: string[] };

export type SystemStatus = {
  api: { version: string; env: string; node: string; uptimeSeconds: number; startedAt: string; siteUrl: string; backofficeUrl: string };
  database: { ok: boolean; latencyMs: number | null; sizeBytes: number | null; name: string; error?: string };
  migrations: { applied: string[]; pending: string[] };
  storage: { driver: string; mediaCount: number; mediaBytes: number; r2Bucket: string | null };
  email: { provider: string; configured: boolean; from: string; last24h: Record<string, number>; lastAt: string | null };
  turnstile: { configured: boolean };
  preview: { configured: boolean };
  stripe: { mode: string; configured: boolean; webhookConfigured: boolean; eventCount?: number; lastEventAt?: string | null };
  backup: { configured: boolean; lastRunAt?: string; status?: string; sizeBytes?: number; location?: string; error?: string };
  audit: { last24h: number; lastAction: string | null; lastAt: string | null };
};

export type EmailLogEntry = {
  id: number;
  to: string;
  subject: string;
  kind: string | null;
  status: "sent" | "failed" | "console";
  providerId: string | null;
  error: string | null;
  createdAt: string;
};

// ---- Phase E: donations ---------------------------------------------------------

export type DonationStatus = "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";

export type DonationEvent = { id: number; type: string; data: Record<string, unknown> | null; actorName: string | null; createdAt: string };

export type DonationFrequency = "one_time" | "monthly";
export type SubscriptionStatus = "pending" | "active" | "past_due" | "canceled" | "incomplete";

export type DonationSubscriptionSummary = {
  id: number;
  status: SubscriptionStatus;
  amountCents: number;
  currency: string;
  paymentsCount: number;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  provider: "stripe" | "simulated";
  providerSubscriptionId: string | null;
  stripeUrl: string | null;
};

export type DonationSubscription = DonationSubscriptionSummary & {
  feeCoverCents: number;
  interval: string;
  donorName: string;
  donorEmail: string;
  locale: Locale;
  anonymous: boolean;
  message: string | null;
  note: string | null;
  cancelAtPeriodEnd: boolean;
  cancelReason: string | null;
  canceledBy: string | null;
  lastPaymentAt: string | null;
  providerCustomerId: string | null;
  events: DonationEvent[];
  donations: { id: number; receiptNumber: string | null; status: DonationStatus; amountCents: number; currency: string; feeCents: number | null; refundedCents: number; netCents: number; paidAt: string | null; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

export type Donation = {
  id: number;
  receiptNumber: string | null;
  status: DonationStatus;
  provider: "stripe" | "simulated";
  providerSessionId: string | null;
  providerPaymentIntentId: string | null;
  providerChargeId: string | null;
  providerInvoiceId: string | null;
  frequency: DonationFrequency;
  subscriptionId: number | null;
  subscription: DonationSubscriptionSummary | null;
  amountCents: number;
  coverFees: boolean;
  feeCoverCents: number;
  currency: string;
  feeCents: number | null;
  refundedCents: number;
  netCents: number;
  donorName: string;
  donorEmail: string;
  locale: Locale;
  anonymous: boolean;
  message: string | null;
  note: string | null;
  sourcePage: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  receiptSentAt: string | null;
  receiptSendCount: number;
  stripeUrl: string | null;
  events: DonationEvent[];
  createdAt: string;
  updatedAt: string;
};

export type DonationTotals = { count: number; grossCents: number; feeCents: number; refundedCents: number; feeCoverCents: number; netCents: number };

export type RecurringSummary = { active: number; pastDue: number; canceled: number; monthlyCommittedCents: number; newThisMonth: number };

export type DonationSummary = {
  year: number;
  currency: string;
  mode: "live" | "test" | "simulated";
  periods: { today: DonationTotals; month: DonationTotals; year: DonationTotals; allTime: DonationTotals };
  months: { month: string; count: number; grossCents: number; netCents: number; monthlyCents: number }[];
  byLocale: Record<string, { count: number; grossCents: number }>;
  byBand: Record<string, { label: string; count: number; grossCents: number }>;
  byFrequency: Record<DonationFrequency, { count: number; grossCents: number }>;
  byPage: Record<string, { count: number; grossCents: number }>;
  recurring: RecurringSummary;
  payouts: { availableCents: number; pendingCents: number; recent: { id: string; amountCents: number; status: string; arrivalDate: string; currency: string }[] } | { error: string } | null;
};

export type DonorLookup = {
  email: string;
  names: string[];
  gifts: number;
  grossCents: number;
  netCents: number;
  firstGiftAt: string | null;
  lastGiftAt: string | null;
  monthlyGifts: { id: number; status: SubscriptionStatus; amountCents: number; currency: string; paymentsCount: number; startedAt: string | null; canceledAt: string | null }[];
  donations: Donation[];
};

export type DonationSettings = {
  id: number;
  currency: string;
  suggestedAmounts: number[];
  minimumAmountCents: number;
  maximumAmountCents: number;
  monthlyEnabled: boolean;
  monthlySuggestedAmounts: number[];
  feeCoverEnabled: boolean;
  feeCoverPercentBp: number;
  feeCoverFixedCents: number;
  feeCoverDefaultChecked: boolean;
  thankYouMessage: Localized;
  receiptIntro: Localized;
  receiptIrsStatement: Localized;
  receiptSignoff: Localized;
  receiptSenderName: string | null;
  receiptReplyTo: string | null;
  statementDescriptor: string | null;
  donateEnabled: boolean;
  donateDisabledMessage: Localized;
  updatedAt: string;
  stripe: {
    mode: "live" | "test" | "simulated";
    configured: boolean;
    simulated: boolean;
    publishableKeyHint: string | null;
    webhookConfigured: boolean;
    webhookEndpoint: string;
    lastEventAt: string | null;
    lastEventType: string | null;
    eventCount: number;
  };
};

export type StripeEventEntry = { id: number; eventId: string; type: string; livemode: boolean; processed: boolean; donationId: number | null; error: string | null; createdAt: string };

// ---- AI assistant (website chat) ----------------------------------------------
export type ChatSettings = {
  id: number;
  enabled: boolean;
  assistantName: string;
  welcome: Localized;
  suggestedQuestions: LocalizedList;
  extraKnowledge: Localized;
  maxMessagesPerSession: number;
  updatedAt: string;
  gemini: { configured: boolean; model: string };
};
export type ChatSessionSummary = {
  id: number;
  sessionKey: string;
  locale: Locale;
  page: string | null;
  userAgent: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  preview: string;
  errors: number;
};
export type ChatMessageEntry = { id: number; role: "user" | "assistant"; content: string; model: string | null; latencyMs: number | null; error: string | null; createdAt: string };
export type ChatSessionDetail = Omit<ChatSessionSummary, "preview" | "errors"> & { messages: ChatMessageEntry[] };
export type ChatStats = { sessions30d: number; messages30d: number; errors30d: number; total: number };
