import { describe, expect, it } from "vitest";
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitRequest } from "@/lib/service";
import { createTestDeps, MINUTE, T0 } from "./helpers";

const DEVICE_A = "11111111-1111-4111-8111-111111111111";
const DEVICE_B = "22222222-2222-4222-8222-222222222222";
const input = { category: "tech", text: "Тестовое обращение" };

describe("checkRateLimit (чистая функция)", () => {
  it("лимит 3 за 60 минут", () => {
    expect(RATE_LIMIT_MAX).toBe(3);
    expect(RATE_LIMIT_WINDOW_MS).toBe(60 * MINUTE);
  });

  it("пусто — можно", () => {
    expect(checkRateLimit([], T0)).toEqual({ allowed: true, used: 0, retryAfterMs: 0 });
  });

  it("2 в окне — 3-е можно", () => {
    expect(checkRateLimit([T0 - 10 * MINUTE, T0 - 5 * MINUTE], T0).allowed).toBe(true);
  });

  it("3 в окне — 4-е нельзя, retryAfter до выхода самого старого", () => {
    const result = checkRateLimit([T0 - 50 * MINUTE, T0 - 20 * MINUTE, T0 - 1 * MINUTE], T0);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(10 * MINUTE);
  });

  it("обращение ровно 60 минут назад уже не считается", () => {
    expect(checkRateLimit([T0 - 60 * MINUTE, T0 - 1, T0 - 2], T0).allowed).toBe(true);
  });

  it("обращение 59:59.999 назад ещё считается", () => {
    expect(checkRateLimit([T0 - 60 * MINUTE + 1, T0 - 1, T0 - 2], T0).allowed).toBe(false);
  });
});

describe("лимит на сервере (сервис + БД, подменённые часы)", () => {
  it("1-3 обращения проходят, 4-е отклоняется", () => {
    const deps = createTestDeps();
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
    deps.clock.advance(MINUTE);
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
    deps.clock.advance(MINUTE);
    const third = submitRequest(deps, DEVICE_A, input);
    expect(third.ok).toBe(true);
    deps.clock.advance(MINUTE);
    const fourth = submitRequest(deps, DEVICE_A, input);
    expect(fourth).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("через 60 минут после первого снова можно", () => {
    const deps = createTestDeps();
    for (let i = 0; i < 3; i++) {
      expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
      deps.clock.advance(MINUTE);
    }
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(false);
    // Первое было в T0. Ровно через 60 минут оно выходит из окна.
    deps.clock.set(T0 + 60 * MINUTE);
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
    // Теперь в окне снова 3 (T0+1м, T0+2м, T0+60м).
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(false);
  });

  it("окно скользящее, а не по календарному часу", () => {
    const deps = createTestDeps(T0 + 50 * MINUTE);
    for (let i = 0; i < 3; i++) expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
    deps.clock.set(T0 + 70 * MINUTE); // новый календарный час, но прошло 20 минут
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(false);
  });

  it("устройства считаются отдельно", () => {
    const deps = createTestDeps();
    for (let i = 0; i < 3; i++) submitRequest(deps, DEVICE_A, input);
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(false);
    expect(submitRequest(deps, DEVICE_B, input).ok).toBe(true);
  });

  it("невалидное обращение не тратит лимит", () => {
    const deps = createTestDeps();
    for (let i = 0; i < 5; i++) {
      expect(submitRequest(deps, DEVICE_A, { category: "tech", text: "" }).ok).toBe(false);
    }
    expect(submitRequest(deps, DEVICE_A, input).ok).toBe(true);
  });
});
