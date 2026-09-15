// Thin client for the Express backend (spec Section 04). Set
// NEXT_PUBLIC_API_URL (e.g. http://localhost:4000) in .env.local; while it is
// unset, submissions run in demo mode — validated client-side, never sent —
// so the UI can be reviewed before the backend endpoints exist.

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export type FormType =
  | "volunteer"
  | "partnership"
  | "assistance"
  | "contact"
  | "newsletter";

export type SubmitResult = { ok: true; mocked: boolean };

export async function submitForm(
  type: FormType,
  payload: Record<string, unknown>,
  locale: string,
): Promise<SubmitResult> {
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { ok: true, mocked: true };
  }

  const response = await fetch(`${API_URL}/api/forms/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, locale }),
  });

  if (!response.ok) {
    throw new Error(`Form submission failed with status ${response.status}`);
  }

  return { ok: true, mocked: false };
}

export const isDemoMode = !API_URL;

export type UnsubscribeResult = { unsubscribed: boolean; email?: string; reason?: string };

// Newsletter one-click unsubscribe (token from the link in every email).
export async function unsubscribeNewsletter(token: string): Promise<UnsubscribeResult> {
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { unsubscribed: true };
  }
  const response = await fetch(`${API_URL}/api/forms/newsletter/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  // A malformed token fails validation (422): that is an invalid link, not an outage.
  if (response.status === 422) return { unsubscribed: false, reason: "invalid_token" };
  if (!response.ok) throw new Error(`Unsubscribe failed with status ${response.status}`);
  const body = (await response.json()) as { data?: UnsubscribeResult };
  return body.data ?? { unsubscribed: false };
}

// ---- Donations (Phase E) ------------------------------------------------------

export type DonationFrequency = "one_time" | "monthly";

export type PublicSubscription = {
  id: number;
  status: "pending" | "active" | "past_due" | "canceled" | "incomplete";
  amountCents: number;
  feeCoverCents: number;
  currency: string;
  interval: string;
  donorName: string;
  donorEmail: string;
  locale: string;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  lastPaymentAt: string | null;
  paymentsCount: number;
  mode: "live" | "test" | "simulated";
  portalAvailable?: boolean;
  manageToken?: string;
};

export type DonationStatus = {
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";
  receiptNumber: string | null;
  amountCents: number;
  feeCoverCents: number;
  currency: string;
  frequency: DonationFrequency;
  donorName: string;
  donorEmail: string;
  locale: string;
  paidAt: string | null;
  receiptSentAt: string | null;
  mode: "live" | "test" | "simulated";
  subscription: PublicSubscription | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as { success?: boolean; data?: T; message?: string } | null;
  if (!response.ok || !body?.success) throw new Error(body?.message || `Request failed with status ${response.status}`);
  return body.data as T;
}

// Creates the donation (and the monthly gift when frequency is "monthly") and
// returns the hosted checkout URL to send the donor to.
export async function startDonation(payload: {
  amountCents: number;
  frequency: DonationFrequency;
  coverFees: boolean;
  name: string;
  email: string;
  locale: string;
  anonymous: boolean;
  message?: string;
  website?: string;
}): Promise<{ url: string; donationId: number; subscriptionId: number | null; frequency: DonationFrequency; amountCents: number; feeCoverCents: number; mode: string }> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(response);
}

export async function getDonationStatus(session: string): Promise<DonationStatus> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/status?session=${encodeURIComponent(session)}`, { cache: "no-store" });
  return readJson(response);
}

// Donor self-service for a monthly gift (private token from the receipt email).
export async function getSubscription(token: string): Promise<PublicSubscription> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/subscription?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  return readJson(response);
}

export async function cancelSubscription(token: string): Promise<PublicSubscription> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/subscription/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return readJson(response);
}

export async function subscriptionPortal(token: string): Promise<{ url: string }> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/subscription/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return readJson(response);
}

// Local review only (no Stripe keys): the simulated checkout page's buttons.
export async function simulateDonation(session: string, outcome: "paid" | "cancel"): Promise<{ status: string; receiptNumber?: string | null }> {
  if (!API_URL) throw new Error("API not configured");
  const response = await fetch(`${API_URL}/api/public/donations/simulate/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, outcome }),
  });
  return readJson(response);
}

// ---- AI assistant -------------------------------------------------------------
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatReply = { reply: string; sessionKey: string };

// One turn of the website chat. The API holds the model key and the prompt;
// a 429 (per-visitor rate limit) surfaces as the "limit" error.
export async function sendChatMessage(payload: { sessionKey: string | null; locale: string; page: string; messages: ChatTurn[] }): Promise<ChatReply> {
  if (!API_URL) throw new Error("unavailable");
  const response = await fetch(`${API_URL}/api/public/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionKey: payload.sessionKey ?? undefined, locale: payload.locale, page: payload.page, messages: payload.messages }),
  });
  if (response.status === 429) throw new Error("limit");
  if (!response.ok) throw new Error(`Chat failed with status ${response.status}`);
  const body = (await response.json()) as { data?: ChatReply };
  if (!body.data) throw new Error("Chat failed");
  return body.data;
}
