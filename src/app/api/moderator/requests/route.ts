import { NextResponse, type NextRequest } from "next/server";
import { getServiceDeps, internalError, jsonError, requireModerator } from "@/lib/http";
import { listForModerator } from "@/lib/service";
import { statusFilterSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const denied = requireModerator(request);
    if (denied) return denied;

    const rawStatus = request.nextUrl.searchParams.get("status") || undefined;
    const status = statusFilterSchema.safeParse(rawStatus);
    if (!status.success) {
      return jsonError(400, "validation", "Неизвестный статус для фильтра");
    }
    return NextResponse.json({ requests: listForModerator(getServiceDeps(), status.data) });
  } catch (error) {
    return internalError("GET /api/moderator/requests", error);
  }
}
