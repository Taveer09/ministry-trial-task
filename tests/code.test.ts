import { describe, expect, it, vi } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateCode,
  generateUniqueCode,
  isValidCode,
  normalizeCode,
} from "@/lib/code";

describe("алфавит кода", () => {
  it("32 символа: A-Z без O и I, цифры 2-9", () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(CODE_ALPHABET).not.toMatch(/[OI01]/);
    expect(new Set(CODE_ALPHABET).size).toBe(32);
    for (const ch of "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") expect(CODE_ALPHABET).toContain(ch);
  });
});

describe("generateCode", () => {
  it("по умолчанию даёт 6 символов из алфавита (crypto.randomInt)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it("использует переданный генератор и запрашивает индекс в пределах алфавита", () => {
    const rng = vi.fn((max: number) => max - 1);
    expect(generateCode(rng)).toBe("999999");
    expect(rng).toHaveBeenCalledTimes(6);
    expect(rng).toHaveBeenCalledWith(32);
  });

  it("бросает ошибку, если генератор вернул индекс вне алфавита", () => {
    expect(() => generateCode(() => 32)).toThrow(RangeError);
    expect(() => generateCode(() => -1)).toThrow(RangeError);
  });
});

describe("generateUniqueCode", () => {
  it("при коллизии генерирует заново", () => {
    const taken = new Set(["AAAAAA", "BBBBBB"]);
    const sequence = [0, 1, 2];
    let call = 0;
    const rng = () => sequence[Math.floor(call++ / 6)];
    const exists = vi.fn((code: string) => taken.has(code));
    expect(generateUniqueCode(exists, rng)).toBe("CCCCCC");
    expect(exists).toHaveBeenCalledTimes(3);
  });

  it("сдаётся после лимита попыток", () => {
    expect(() => generateUniqueCode(() => true, () => 0, 5)).toThrow();
  });
});

describe("normalizeCode / isValidCode", () => {
  it("убирает пробелы и поднимает регистр", () => {
    expect(normalizeCode(" k7m 2qx ")).toBe("K7M2QX");
  });

  it("отклоняет O, I, 0, 1 и неверную длину", () => {
    expect(isValidCode("K7M2QX")).toBe(true);
    expect(isValidCode("K7M2QO")).toBe(false);
    expect(isValidCode("K7M2QI")).toBe(false);
    expect(isValidCode("K7M2Q0")).toBe(false);
    expect(isValidCode("K7M2Q1")).toBe(false);
    expect(isValidCode("K7M2Q")).toBe(false);
    expect(isValidCode("K7M2QXX")).toBe(false);
    expect(isValidCode("k7m2qx")).toBe(false);
  });
});
