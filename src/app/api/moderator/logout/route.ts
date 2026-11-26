import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { isSecureRequest, sessionCookieOptions } from "@/lib/http";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(isSecureRequest(request)),
    maxAge: 0,
  });
  return response;
}
