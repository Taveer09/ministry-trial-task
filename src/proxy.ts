import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE } from "@/lib/constants";
import { deviceCookieOptions, isValidDeviceId, newDeviceId } from "@/lib/device";

/**
 * Выдаёт httpOnly cookie device_id при первом заходе.
 * Новое значение сразу кладётся и в текущий запрос, чтобы route handler увидел тот же id.
 */
export function proxy(request: NextRequest) {
  if (isValidDeviceId(request.cookies.get(DEVICE_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const deviceId = newDeviceId();
  request.cookies.set(DEVICE_COOKIE, deviceId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(
    DEVICE_COOKIE,
    deviceId,
    deviceCookieOptions(request.nextUrl.protocol === "https:"),
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
