import { DEVICE_COOKIE_MAX_AGE_S } from "./constants";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidDeviceId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function newDeviceId(): string {
  return crypto.randomUUID();
}

export function deviceCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE_S,
  };
}
