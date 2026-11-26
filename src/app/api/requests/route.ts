import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/constants";
import { deviceCookieOptions, isValidDeviceId, newDeviceId } from "@/lib/device";
import { getServiceDeps, internalError, isSecureRequest, jsonError, readJson } from "@/lib/http";
import { submitRequest } from "@/lib/service";

export async function POST(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get(DEVICE_COOKIE)?.value;
    const hasDevice = isValidDeviceId(cookieValue);
    const deviceId = hasDevice ? cookieValue : newDeviceId();

    const body = await readJson(request);
    const result = submitRequest(getServiceDeps(), deviceId, body);

    let response: NextResponse;
    if (result.ok) {
      response = NextResponse.json({ code: result.code }, { status: 201 });
    } else if (result.error === "rate_limited") {
      response = jsonError(429, result.error, result.message, {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      });
    } else {
      response = jsonError(400, result.error, result.message);
    }

    if (!hasDevice) {
      response.cookies.set(DEVICE_COOKIE, deviceId, deviceCookieOptions(isSecureRequest(request)));
    }
    return response;
  } catch (error) {
    return internalError("POST /api/requests", error);
  }
}
