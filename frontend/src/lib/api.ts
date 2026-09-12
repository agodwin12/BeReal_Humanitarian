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

export type DonationStatus = {
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "partially_refunded";
  receiptNumber: string | null;
  amountCents: number;
  currency: string;
  donorName: string;
  donorEmail: string;
  locale: string;
  paidAt: string | null;
  receiptSentAt: string | null;
  mode: "live" | "test" | "simulated";
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { data?: T; message?: string; errors?: { field: string; message: string }[] };
  if (!response.ok) {
    const error = new Error(body.message || `Request failed with status ${response.status}`) as Error & { status?: number; errors?: { field: string; message: string }[] };
    error.status = response.status;
    error.errors = body.errors;
    throw error;
  }
  return body.data as T;
}

// Creates the donation and returns the hosted checkout URL to send the donor to.
export async function startDonation(payload: {
  amountCents: number;
  name: string;
  email: string;
  locale: string;
  anonymous: boolean;
  message?: string;
  website?: string;
}): Promise<{ url: string; donationId: number; mode: string }> {
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
