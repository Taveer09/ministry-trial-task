import { NextResponse, type NextRequest } from "next/server";
import { getServiceDeps, internalError, jsonError } from "@/lib/http";
import { getPublicStatus } from "@/lib/service";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code") ?? "";
    const result = getPublicStatus(getServiceDeps(), code);
    if (!result.ok) {
      return jsonError(result.error === "not_found" ? 404 : 400, result.error, result.message);
    }
    return NextResponse.json({ request: result.view });
  } catch (error) {
    return internalError("GET /api/status", error);
  }
}
