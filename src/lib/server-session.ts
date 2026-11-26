import { cookies } from "next/headers";
import { getConfig } from "./config";
import { SESSION_COOKIE } from "./constants";
import { verifySessionToken } from "./session";

/** Есть ли у посетителя права модератора (для серверных компонентов). */
export async function hasModeratorSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, getConfig().SESSION_SECRET, Date.now());
}
