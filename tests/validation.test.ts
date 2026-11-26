import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/constants";
import { moderatorUpdateSchema, submitRequestSchema } from "@/lib/validation";

const base = { category: "tech", room: "" };

describe("текст обращения: 1-1000 символов", () => {
  it("0 символов — нельзя", () => {
    expect(submitRequestSchema.safeParse({ ...base, text: "" }).success).toBe(false);
  });

  it("1 символ — можно", () => {
    expect(submitRequestSchema.safeParse({ ...base, text: "a" }).success).toBe(true);
  });

  it("1000 символов — можно", () => {
    expect(submitRequestSchema.safeParse({ ...base, text: "a".repeat(1000) }).success).toBe(true);
  });

  it("1001 символ — нельзя", () => {
    expect(submitRequestSchema.safeParse({ ...base, text: "a".repeat(1001) }).success).toBe(false);
  });

  it("только пробелы — нельзя", () => {
    expect(submitRequestSchema.safeParse({ ...base, text: "   \n " }).success).toBe(false);
  });

  it("текст без поля — нельзя", () => {
    expect(submitRequestSchema.safeParse({ category: "tech" }).success).toBe(false);
  });

  it("пробелы по краям обрезаются", () => {
    const parsed = submitRequestSchema.parse({ ...base, text: "  проектор  " });
    expect(parsed.text).toBe("проектор");
  });
});

describe("категория", () => {
  it.each(CATEGORIES)("категория %s допустима", (category) => {
    expect(submitRequestSchema.safeParse({ category, text: "x" }).success).toBe(true);
  });

  it("неизвестная категория — нельзя", () => {
    expect(submitRequestSchema.safeParse({ category: "sport", text: "x" }).success).toBe(false);
  });
});

describe("кабинет необязателен", () => {
  it("без кабинета", () => {
    expect(submitRequestSchema.parse({ category: "idea", text: "x" }).room).toBeNull();
  });

  it("пустая строка превращается в null", () => {
    expect(submitRequestSchema.parse({ category: "idea", text: "x", room: "  " }).room).toBeNull();
  });

  it("слишком длинный кабинет — нельзя", () => {
    expect(
      submitRequestSchema.safeParse({ category: "idea", text: "x", room: "a".repeat(21) }).success,
    ).toBe(false);
  });
});

describe("тело запроса модератора", () => {
  it("пустое тело — нельзя", () => {
    expect(moderatorUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("лишние поля — нельзя", () => {
    expect(moderatorUpdateSchema.safeParse({ status: "in_progress", text: "x" }).success).toBe(false);
  });

  it("неизвестный статус — нельзя", () => {
    expect(moderatorUpdateSchema.safeParse({ status: "done" }).success).toBe(false);
  });

  it("только ответ — можно", () => {
    expect(moderatorUpdateSchema.safeParse({ publicReply: "Спасибо" }).success).toBe(true);
  });
});
