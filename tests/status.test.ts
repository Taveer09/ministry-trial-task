import { describe, expect, it } from "vitest";
import { STATUSES, type Status } from "@/lib/constants";
import {
  allowedNextStatuses,
  applyModeratorUpdate,
  canTransition,
  isFinalStatus,
  isValidRejectionReason,
  type ModeratedFields,
} from "@/lib/status";

const VALID: [Status, Status][] = [
  ["new", "in_progress"],
  ["new", "rejected"],
  ["in_progress", "resolved"],
  ["in_progress", "rejected"],
];

const isValidPair = (from: Status, to: Status) =>
  VALID.some(([f, t]) => f === from && t === to);

const INVALID: [Status, Status][] = STATUSES.flatMap((from) =>
  STATUSES.filter((to) => !isValidPair(from, to)).map((to) => [from, to] as [Status, Status]),
);

function fields(status: Status, extra: Partial<ModeratedFields> = {}): ModeratedFields {
  return { status, publicReply: null, rejectionReason: null, ...extra };
}

describe("переходы статусов", () => {
  it.each(VALID)("%s -> %s разрешён", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(INVALID)("%s -> %s запрещён", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("всего 4 разрешённых и 12 запрещённых пар", () => {
    expect(VALID).toHaveLength(4);
    expect(INVALID).toHaveLength(12);
  });

  it("resolved и rejected — финальные", () => {
    expect(isFinalStatus("resolved")).toBe(true);
    expect(isFinalStatus("rejected")).toBe(true);
    expect(isFinalStatus("new")).toBe(false);
    expect(isFinalStatus("in_progress")).toBe(false);
    expect(allowedNextStatuses("resolved")).toEqual([]);
    expect(allowedNextStatuses("rejected")).toEqual([]);
  });
});

describe("причина отклонения", () => {
  it('"" — не причина', () => {
    expect(isValidRejectionReason("")).toBe(false);
  });

  it('"ok" — причина', () => {
    expect(isValidRejectionReason("ok")).toBe(true);
  });

  it("null и undefined — не причина", () => {
    expect(isValidRejectionReason(null)).toBe(false);
    expect(isValidRejectionReason(undefined)).toBe(false);
  });
});

describe("applyModeratorUpdate", () => {
  it.each(VALID.filter(([, to]) => to !== "rejected"))(
    "%s -> %s без причины проходит",
    (from, to) => {
      const result = applyModeratorUpdate(fields(from), { status: to });
      expect(result).toMatchObject({ ok: true, statusChanged: true, fields: { status: to } });
    },
  );

  it.each(INVALID)("%s -> %s отклоняется как invalid_transition", (from, to) => {
    const result = applyModeratorUpdate(fields(from), {
      status: to,
      rejectionReason: to === "rejected" ? "ok" : undefined,
    });
    expect(result).toMatchObject({ ok: false, code: "invalid_transition" });
  });

  it("отклонение без причины — reason_required", () => {
    expect(applyModeratorUpdate(fields("new"), { status: "rejected" })).toMatchObject({
      ok: false,
      code: "reason_required",
    });
  });

  it('отклонение с причиной "" — reason_required', () => {
    expect(
      applyModeratorUpdate(fields("new"), { status: "rejected", rejectionReason: "" }),
    ).toMatchObject({ ok: false, code: "reason_required" });
  });

  it('отклонение с причиной " ok "', () => {
    const result = applyModeratorUpdate(fields("new"), {
      status: "rejected",
      rejectionReason: " ok ",
    });
    expect(result).toMatchObject({ ok: true, fields: { status: "rejected", rejectionReason: "ok" } });
  });

  it("причина без отклонения — reason_not_allowed", () => {
    expect(
      applyModeratorUpdate(fields("new"), { status: "in_progress", rejectionReason: "x" }),
    ).toMatchObject({ ok: false, code: "reason_not_allowed" });
    expect(applyModeratorUpdate(fields("new"), { publicReply: "x", rejectionReason: "x" })).toMatchObject({
      ok: false,
      code: "reason_not_allowed",
    });
  });

  it("ответ без смены статуса меняет только ответ", () => {
    const result = applyModeratorUpdate(fields("resolved"), { publicReply: "  Готово  " });
    expect(result).toEqual({
      ok: true,
      statusChanged: false,
      fields: { status: "resolved", publicReply: "Готово", rejectionReason: null },
    });
  });

  it("пустой ответ стирает ответ", () => {
    const result = applyModeratorUpdate(fields("new", { publicReply: "старый" }), { publicReply: "  " });
    expect(result).toMatchObject({ ok: true, fields: { publicReply: null } });
  });
});
