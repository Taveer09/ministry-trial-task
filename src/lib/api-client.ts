/** Ответ API в виде { ok, data } или { ok: false, status, message }. */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, message: "Нет связи с сервером. Проверьте интернет." };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `Ошибка ${response.status}`;
    return { ok: false, status: response.status, message };
  }
  return { ok: true, status: response.status, data: body as T };
}
