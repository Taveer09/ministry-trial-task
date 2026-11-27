import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/moderator/login/route";
import { POST as logout } from "@/app/api/moderator/logout/route";
import { PATCH as patchRequest } from "@/app/api/moderator/requests/[id]/route";
import { GET as listRequests } from "@/app/api/moderator/requests/route";
import { POST as createRequest } from "@/app/api/requests/route";
import { GET as getStatus } from "@/app/api/status/route";
import { DEVICE_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { openDb, setDbForTesting, type Db } from "@/lib/db";
import { findByCode } from "@/lib/repository";
import { createSessionToken } from "@/lib/session";
import { makeRequest, routeParams, TEST_PASSWORD, TEST_SECRET, validSessionCookie } from "./helpers";

const DEVICE = "66666666-6666-4666-8666-666666666666";
let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  setDbForTesting(db);
});

afterEach(() => {
  setDbForTesting(undefined);
  db.close();
});

async function createOne(text = "Тестовое обращение") {
  const res = await createRequest(
    makeRequest("/api/requests", {
      method: "POST",
      body: { category: "tech", text, room: "Т-101" },
      cookie: `${DEVICE_COOKIE}=${DEVICE}`,
    }),
  );
  const body = (await res.json()) as { code: string };
  const record = findByCode(db, body.code);
  if (!record) throw new Error("обращение не создано");
  return record;
}

describe("POST /api/requests", () => {
  it("201 и код; без cookie сервер выдаёт httpOnly device_id", async () => {
    const res = await createRequest(
      makeRequest("/api/requests", { method: "POST", body: { category: "idea", text: "Идея" } }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${DEVICE_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("с валидной cookie новую не выдаёт", async () => {
    const res = await createRequest(
      makeRequest("/api/requests", {
        method: "POST",
        body: { category: "idea", text: "Идея" },
        cookie: `${DEVICE_COOKIE}=${DEVICE}`,
      }),
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("400 на невалидные данные и не-JSON", async () => {
    const bad = await createRequest(
      makeRequest("/api/requests", { method: "POST", body: { category: "idea", text: "" } }),
    );
    expect(bad.status).toBe(400);
    const notJson = await createRequest(
      new (await import("next/server")).NextRequest("http://localhost:3000/api/requests", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(notJson.status).toBe(400);
  });

  it("4-е обращение за час с одного устройства — 429 с Retry-After", async () => {
    for (let i = 0; i < 3; i++) await createOne(`обращение ${i}`);
    const res = await createRequest(
      makeRequest("/api/requests", {
        method: "POST",
        body: { category: "tech", text: "четвёртое" },
        cookie: `${DEVICE_COOKIE}=${DEVICE}`,
      }),
    );
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("GET /api/status", () => {
  it("отдаёт публичные поля без текста и кабинета", async () => {
    const record = await createOne("Секрет");
    const res = await getStatus(makeRequest(`/api/status?code=${record.code}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.request).toMatchObject({ category: "tech", status: "new", publicReply: null });
    expect(body.request).not.toHaveProperty("text");
    expect(body.request).not.toHaveProperty("room");
    expect(JSON.stringify(body)).not.toContain("Секрет");
  });

  it("400 на неверный формат, 404 на неизвестный код", async () => {
    expect((await getStatus(makeRequest("/api/status?code=abc"))).status).toBe(400);
    expect((await getStatus(makeRequest("/api/status"))).status).toBe(400);
    expect((await getStatus(makeRequest("/api/status?code=ZZZZZZ"))).status).toBe(404);
  });
});

describe("вход модератора", () => {
  it("верный пароль — 200 и подписанная httpOnly cookie", async () => {
    const res = await login(
      makeRequest("/api/moderator/login", { method: "POST", body: { password: TEST_PASSWORD } }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("неверный пароль — 401 без cookie", async () => {
    const res = await login(
      makeRequest("/api/moderator/login", { method: "POST", body: { password: "wrong-password" } }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("пустое тело — 400", async () => {
    expect((await login(makeRequest("/api/moderator/login", { method: "POST", body: {} }))).status).toBe(400);
  });

  it("выход стирает cookie", async () => {
    const res = await logout(makeRequest("/api/moderator/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });
});

describe("GET /api/moderator/requests", () => {
  it("без cookie — 401", async () => {
    expect((await listRequests(makeRequest("/api/moderator/requests"))).status).toBe(401);
  });

  it("с поддельной или просроченной сессией — 401", async () => {
    const forged = `${SESSION_COOKIE}=${createSessionToken("wrong-secret-123456789", Date.now())}`;
    expect((await listRequests(makeRequest("/api/moderator/requests", { cookie: forged }))).status).toBe(401);
    const expired = `${SESSION_COOKIE}=${createSessionToken(TEST_SECRET, Date.now() - 9 * 60 * 60 * 1000)}`;
    expect((await listRequests(makeRequest("/api/moderator/requests", { cookie: expired }))).status).toBe(401);
  });

  it("с сессией — 200 и список с текстом", async () => {
    await createOne("Видно модератору");
    const res = await listRequests(makeRequest("/api/moderator/requests", { cookie: validSessionCookie() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0]).toMatchObject({ text: "Видно модератору", room: "Т-101" });
  });

  it("фильтр по статусу и 400 на неизвестный", async () => {
    await createOne();
    const cookie = validSessionCookie();
    const res = await listRequests(makeRequest("/api/moderator/requests?status=resolved", { cookie }));
    expect((await res.json()).requests).toEqual([]);
    expect((await listRequests(makeRequest("/api/moderator/requests?status=done", { cookie }))).status).toBe(400);
  });
});

describe("PATCH /api/moderator/requests/[id]", () => {

  it("требует вход до проверки параметров изменения", async () => {
    const response = await patchRequest(makeRequest("/"), routeParams("invalid"));
    expect(response.status).toBe(401);
  });

  it("с сессией — меняет статус и ответ", async () => {
    const record = await createOne();
    const res = await patchRequest(
      makeRequest(`/api/moderator/requests/${record.id}`, {
        method: "PATCH",
        body: { status: "in_progress", publicReply: "Смотрим" },
        cookie: validSessionCookie(),
      }),
      routeParams(record.id),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).request).toMatchObject({ status: "in_progress", publicReply: "Смотрим" });
  });

  it("с сессией: запрещённый переход — 409, без причины — 400, нет обращения — 404, плохой id — 400", async () => {
    const record = await createOne();
    const cookie = validSessionCookie();
    const call = (id: string | number, body: unknown) =>
      patchRequest(
        makeRequest(`/api/moderator/requests/${id}`, { method: "PATCH", body, cookie }),
        routeParams(id),
      );
    expect((await call(record.id, { status: "resolved" })).status).toBe(409);
    expect((await call(record.id, { status: "rejected", rejectionReason: "" })).status).toBe(400);
    expect((await call(9999, { status: "in_progress" })).status).toBe(404);
    expect((await call("abc", { status: "in_progress" })).status).toBe(400);
  });
});
