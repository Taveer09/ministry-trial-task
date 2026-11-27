import { NextResponse, type NextRequest } from "next/server";
import { getServiceDeps, internalError, jsonError, readJson, requireModerator } from "@/lib/http";
import { updateByModerator } from "@/lib/service";

const ERROR_STATUS: Record<string, number> = {
  validation: 400,
  reason_required: 400,
  reason_not_allowed: 400,
  not_found: 404,
  invalid_transition: 409,
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const denied = requireModerator(request);
    if (denied) return denied;

    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return jsonError(400, "validation", "Некорректный id обращения");
    }

    const result = updateByModerator(getServiceDeps(), id, await readJson(request));
    if (!result.ok) {
      return jsonError(ERROR_STATUS[result.error] ?? 400, result.error, result.message);
    }
    return NextResponse.json({ request: result.request });
  } catch (error) {
    return internalError("PATCH /api/moderator/requests/[id]", error);
  }
}
