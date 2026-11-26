import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_TTL_MS } from "./constants";

/**
 * Сессия модератора: "<payload>.<signature>", где payload = base64url(JSON {exp}),
 * signature = base64url(HMAC-SHA256(payload, SESSION_SECRET)).
 */

interface SessionPayload {
  role: "moderator";
  exp: number;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionToken(
  secret: string,
  now: number,
  ttlMs: number = SESSION_TTL_MS,
): string {
  const payload: SessionPayload = { role: "moderator", exp: now + ttlMs };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  secret: string,
  now: number,
): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return false;
  if (!safeEqual(signature, sign(encoded, secret))) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (typeof payload !== "object" || payload === null) return false;
  const { role, exp } = payload as Partial<SessionPayload>;
  if (role !== "moderator") return false;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  return exp > now;
}

/** Сравнение пароля за постоянное время: сравниваются хэши одинаковой длины. */
export function verifyPassword(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
