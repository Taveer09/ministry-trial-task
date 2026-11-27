import { describe, expect, it } from "vitest";
import { isValidCode } from "@/lib/code";
import { findByCode } from "@/lib/repository";
import {
  getPublicStatus,
  listForModerator,
  submitRequest,
  updateByModerator,
} from "@/lib/service";
import { createTestDeps, MINUTE } from "./helpers";

const DEVICE = "33333333-3333-4333-8333-333333333333";

function submit(deps: ReturnType<typeof createTestDeps>, text: string, device = DEVICE) {
  const result = submitRequest(deps, device, { category: "room", text, room: "Т-101" });
  if (!result.ok) throw new Error(result.message);
  return result.code;
}

describe("подача обращения", () => {
  it("возвращает валидный код и сохраняет обращение со статусом new", () => {
    const deps = createTestDeps();
    const code = submit(deps, "Холодно");
    expect(isValidCode(code)).toBe(true);
    const record = findByCode(deps.db, code);
    expect(record).toMatchObject({ status: "new", text: "Холодно", room: "Т-101", category: "room" });
  });

  it("невалидные данные не сохраняются", () => {
    const deps = createTestDeps();
    const result = submitRequest(deps, DEVICE, { category: "room", text: "a".repeat(1001) });
    expect(result).toMatchObject({ ok: false, error: "validation" });
    expect(listForModerator(deps)).toHaveLength(0);
  });

  it("при коллизии кода берёт следующий", () => {
    const deps = createTestDeps();
    let call = 0;
    // Первые два кода одинаковые (AAAAAA), третий — BBBBBB.
    deps.rng = () => (call++ < 12 ? 0 : 1);
    const first = submit(deps, "раз", "44444444-4444-4444-8444-444444444444");
    const second = submit(deps, "два", "55555555-5555-4555-8555-555555555555");
    expect(first).toBe("AAAAAA");
    expect(second).toBe("BBBBBB");
  });
});

describe("страница статуса", () => {
  it("показывает только категорию, статус, ответ, причину и даты", () => {
    const deps = createTestDeps();
    const code = submit(deps, "Секретный текст");
    const result = getPublicStatus(deps, code);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.view).sort()).toEqual(
      ["category", "createdAt", "publicReply", "rejectionReason", "status", "updatedAt"].sort(),
    );
    expect(JSON.stringify(result.view)).not.toContain("Секретный текст");
    expect(JSON.stringify(result.view)).not.toContain("Т-101");
  });

  it("код можно ввести строчными и с пробелами", () => {
    const deps = createTestDeps();
    const code = submit(deps, "x");
    const messy = ` ${code.slice(0, 3).toLowerCase()} ${code.slice(3)} `;
    expect(getPublicStatus(deps, messy).ok).toBe(true);
  });

  it("неверный формат и несуществующий код", () => {
    const deps = createTestDeps();
    expect(getPublicStatus(deps, "123")).toMatchObject({ ok: false, error: "invalid_code" });
    expect(getPublicStatus(deps, "ZZZZZZ")).toMatchObject({ ok: false, error: "not_found" });
  });

  it("ученик видит ответ и причину отклонения", () => {
    const deps = createTestDeps();
    const code = submit(deps, "x");
    const id = findByCode(deps.db, code)!.id;
    deps.clock.advance(5 * MINUTE);
    expect(
      updateByModerator(deps, id, { status: "rejected", rejectionReason: "Дубликат", publicReply: "См. другое" }).ok,
    ).toBe(true);
    const result = getPublicStatus(deps, code);
    expect(result).toMatchObject({
      ok: true,
      view: { status: "rejected", rejectionReason: "Дубликат", publicReply: "См. другое" },
    });
    if (result.ok) expect(result.view.updatedAt - result.view.createdAt).toBe(5 * MINUTE);
  });
});

describe("список модератора", () => {

  it("показывает новые обращения первыми, при равной дате — по убыванию id", () => {
    const deps = createTestDeps();
    submit(deps, "Первое");
    deps.clock.advance(MINUTE);
    submit(deps, "Второе");
    submit(deps, "Третье");
    expect(listForModerator(deps).map((r) => r.text)).toEqual(["Третье", "Второе", "Первое"]);
  });

  it("фильтр по статусу", () => {
    const deps = createTestDeps();
    submit(deps, "a");
    const codeB = submit(deps, "b");
    const idB = findByCode(deps.db, codeB)!.id;
    updateByModerator(deps, idB, { status: "in_progress" });
    expect(listForModerator(deps, "new").map((r) => r.text)).toEqual(["a"]);
    expect(listForModerator(deps, "in_progress").map((r) => r.text)).toEqual(["b"]);
    expect(listForModerator(deps, "resolved")).toEqual([]);
  });

  it("модератор видит текст и кабинет, но не device_id", () => {
    const deps = createTestDeps();
    submit(deps, "текст");
    const [item] = listForModerator(deps);
    expect(item).toMatchObject({ text: "текст", room: "Т-101" });
    expect(item).not.toHaveProperty("deviceId");
  });
});

describe("изменение модератором", () => {
  it("полный путь new -> in_progress -> resolved с ответом", () => {
    const deps = createTestDeps();
    const id = findByCode(deps.db, submit(deps, "x"))!.id;
    expect(updateByModerator(deps, id, { status: "in_progress" })).toMatchObject({
      ok: true,
      request: { status: "in_progress" },
    });
    expect(updateByModerator(deps, id, { status: "resolved", publicReply: "Готово" })).toMatchObject({
      ok: true,
      request: { status: "resolved", publicReply: "Готово" },
    });
    expect(updateByModerator(deps, id, { status: "new" })).toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
  });

  it("несуществующее обращение", () => {
    const deps = createTestDeps();
    expect(updateByModerator(deps, 999, { status: "in_progress" })).toMatchObject({
      ok: false,
      error: "not_found",
    });
  });

  it("отклонение без причины не меняет статус", () => {
    const deps = createTestDeps();
    const code = submit(deps, "x");
    const id = findByCode(deps.db, code)!.id;
    expect(updateByModerator(deps, id, { status: "rejected", rejectionReason: "" })).toMatchObject({
      ok: false,
      error: "reason_required",
    });
    expect(findByCode(deps.db, code)!.status).toBe("new");
  });
});
