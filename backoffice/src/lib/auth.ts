import type { Role } from "@/lib/types";

// Session handling. The API issues an 8-hour JWT on login; we keep it in a
// cookie (so proxy.ts can protect routes) and the user profile in localStorage
// (for the UI). In demo mode (no NEXT_PUBLIC_API_URL) any credentials sign in
// as a demo Super Admin so the shell can be reviewed.

export const SESSION_COOKIE = "brhw_admin_session";
const USER_KEY = "brhw_admin_user";
const SESSION_HOURS = 8;
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export type SessionUser = {
  id: number | string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled?: boolean;
};

export type LoginResult = { status: "ok"; user: SessionUser } | { status: "two_factor"; challengeToken: string };

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, hours: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + hours * 3_600_000).toUTCString();
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getSessionToken(): string | null {
  return readCookie(SESSION_COOKIE);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  writeCookie(SESSION_COOKIE, token, SESSION_HOURS);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  clearCookie(SESSION_COOKIE);
  if (typeof window !== "undefined") localStorage.removeItem(USER_KEY);
}

export const logout = clearSession;

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const user: SessionUser = {
      id: "demo",
      name: "Demo Admin",
      email: email || "demo@berealhumanitarian.test",
      role: "super_admin",
    };
    setSession("demo", user);
    return { status: "ok", user };
  }

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: { token?: string; user?: SessionUser; requiresTwoFactor?: boolean; challengeToken?: string };
    message?: string;
  };
  if (!response.ok || !body.data) {
    throw new Error(
      response.status === 401
        ? "Invalid email or password."
        : response.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : body.message || "Sign-in failed. Please try again.",
    );
  }
  // Accounts with two-factor authentication get a second step.
  if (body.data.requiresTwoFactor && body.data.challengeToken) {
    return { status: "two_factor", challengeToken: body.data.challengeToken };
  }
  if (!body.data.token || !body.data.user) throw new Error("Sign-in failed. Please try again.");
  setSession(body.data.token, body.data.user);
  return { status: "ok", user: body.data.user };
}

// Second sign-in step: 6-digit authenticator code or a recovery code.
export async function loginTwoFactor(challengeToken: string, code: string): Promise<SessionUser> {
  const response = await fetch(`${API_URL}/api/auth/login/2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeToken, code }),
  });
  const body = (await response.json().catch(() => ({}))) as { data?: { token: string; user: SessionUser }; message?: string };
  if (!response.ok || !body.data) {
    throw new Error(
      response.status === 401
        ? body.message || "That code is not valid."
        : response.status === 429
          ? "Too many attempts. Please wait a few minutes and try again."
          : body.message || "Sign-in failed. Please try again.",
    );
  }
  setSession(body.data.token, body.data.user);
  return body.data.user;
}
