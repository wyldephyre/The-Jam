// Viewer account helpers: display-name rules, password hashing, session
// cookies, and the in-memory login/signup rate limit.
// Passwords are only ever passed to Bun.password. Do not log them.

import { createHash } from "node:crypto";
import type { Context } from "hono";

export const PLATFORMS = ["twitch", "youtube", "rumble", "x", "kick", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SESSION_COOKIE = "jam_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const NAME_RE = /^(?=.{2,40}$)[\p{L}\p{N}](?:[\p{L}\p{N}]|[ ._'-](?![ ._'-]))*[\p{L}\p{N}]$/u;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const IP_RE = /^[A-Za-z0-9.:]+$/;

export const PASSWORD_OPTIONS = {
  algorithm: "argon2id" as const,
  memoryCost: 19456,
  timeCost: 2,
};

export const authPolicy = {
  loginLimit: 10,
  signupLimit: 5,
  windowMs: 15 * 60 * 1000,
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function resetAuthRateLimits(): void {
  buckets.clear();
}

export function cleanDisplayName(value: unknown): { displayName: string; key: string } | null {
  if (typeof value !== "string") return null;
  const displayName = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!NAME_RE.test(displayName)) return null;
  return { displayName, key: displayName.toLocaleLowerCase("en-US") };
}

export function cleanPlatform(value: unknown): Platform | null {
  if (typeof value !== "string") return null;
  const platform = value.trim().toLowerCase();
  return (PLATFORMS as readonly string[]).includes(platform) ? (platform as Platform) : null;
}

// null means "not provided". "invalid" means the field was present but unusable.
export function cleanEmail(value: unknown): string | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254 || !EMAIL_RE.test(email)) return "invalid";
  return email;
}

export function cleanPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 200) return null;
  if (/[\u0000-\u001F\u007F]/.test(value)) return null;
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, PASSWORD_OPTIONS);
}

let dummyHashPromise: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  dummyHashPromise ??= Bun.password.hash("not-a-real-account-password", PASSWORD_OPTIONS);
  return dummyHashPromise;
}

// Always runs a verify, including for unknown usernames, so missing accounts
// do not return faster than a wrong password.
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const stored = hash ?? (await dummyHash());
  const ok = await Bun.password.verify(password, stored);
  return hash !== null && ok;
}

export function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length <= 64 && IP_RE.test(last)) return last;
  }
  const real = c.req.header("x-real-ip")?.trim();
  if (real && real.length <= 64 && IP_RE.test(real)) return real;
  return "local";
}

export function allowAuthAttempt(kind: "login" | "signup", ip: string, now = Date.now()): boolean {
  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }
  const limit = kind === "login" ? authPolicy.loginLimit : authPolicy.signupLimit;
  const key = `${kind}:${ip}`;
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + authPolicy.windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function newSessionToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieSecure(c: Context): boolean {
  const flag = (process.env.COOKIE_SECURE ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  const forwarded = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "https") return true;
  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
}
