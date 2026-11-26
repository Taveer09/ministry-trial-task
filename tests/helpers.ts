import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { openDb, type Db } from "@/lib/db";
import type { ServiceDeps } from "@/lib/service";
import { createSessionToken } from "@/lib/session";

export const TEST_SECRET = "test-secret-change-me";
export const TEST_PASSWORD = "test-moderator-123";
export const T0 = Date.UTC(2026, 10, 26, 16, 0, 0);
export const MINUTE = 60 * 1000;

/** Подменяемые часы для тестов. */
export function createClock(start: number = T0) {
  let current = start;
  return {
    now: () => current,
    set: (value: number) => {
      current = value;
    },
    advance: (ms: number) => {
      current += ms;
    },
  };
}

export function createTestDeps(start: number = T0): ServiceDeps & {
  db: Db;
  clock: ReturnType<typeof createClock>;
} {
  const clock = createClock(start);
  return { db: openDb(":memory:"), now: clock.now, clock };
}

export function validSessionCookie(now: number = Date.now()): string {
  return `${SESSION_COOKIE}=${createSessionToken(TEST_SECRET, now)}`;
}

export function makeRequest(
  url: string,
  init: { method?: string; body?: unknown; cookie?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (init.cookie) headers.set("cookie", init.cookie);
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export function routeParams(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}
