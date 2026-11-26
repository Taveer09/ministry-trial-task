import { NextResponse, type NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { SESSION_COOKIE } from "@/lib/constants";
import { internalError, isSecureRequest, jsonError, readJson, sessionCookieOptions } from "@/lib/http";
import { createSessionToken, verifyPassword } from "@/lib/session";
import { firstIssueMessage, loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "validation", firstIssueMessage(parsed.error));
    }
    const config = getConfig();
    if (!verifyPassword(parsed.data.password, config.MODERATOR_PASSWORD)) {
      return jsonError(401, "invalid_password", "Неверный пароль");
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(config.SESSION_SECRET, Date.now()),
      sessionCookieOptions(isSecureRequest(request)),
    );
    return response;
  } catch (error) {
    return internalError("POST /api/moderator/login", error);
  }
}
