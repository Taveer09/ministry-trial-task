import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "./config";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./constants";
import { getDb } from "./db";
import type { ServiceDeps } from "./service";
import { verifySessionToken } from "./session";

export function getServiceDeps(): ServiceDeps {
  return { db: getDb(), now: Date.now };
}

export function isSecureRequest(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

export function jsonError(status: number, error: string, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error, message }, { status, headers });
}

/** Проверяет подписанную cookie-сессию модератора. */
export function isModerator(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, getConfig().SESSION_SECRET, Date.now());
}

/** Возвращает ответ 401 для неавторизованного запроса, иначе null. */
export function requireModerator(request: NextRequest): NextResponse | null {
  if (isModerator(request)) return null;
  return jsonError(401, "unauthorized", "Нужно войти как модератор");
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/** Безопасно читает JSON-тело запроса. undefined, если тело не JSON. */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Логирует неожиданную ошибку и возвращает 500 без подробностей наружу. */
export function internalError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return jsonError(500, "internal", "Внутренняя ошибка сервера");
}
