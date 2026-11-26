import { describe, expect, it } from "vitest";
import { createSessionToken, verifyPassword, verifySessionToken } from "@/lib/session";
import { MINUTE, T0, TEST_SECRET } from "./helpers";

describe("сессия модератора", () => {
  it("свежий токен проходит проверку", () => {
    expect(verifySessionToken(createSessionToken(TEST_SECRET, T0), TEST_SECRET, T0 + MINUTE)).toBe(true);
  });

  it("просроченный токен не проходит", () => {
    const token = createSessionToken(TEST_SECRET, T0, 10 * MINUTE);
    expect(verifySessionToken(token, TEST_SECRET, T0 + 10 * MINUTE)).toBe(false);
  });

  it("токен с чужим секретом не проходит", () => {
    const token = createSessionToken("another-secret-1234567", T0);
    expect(verifySessionToken(token, TEST_SECRET, T0)).toBe(false);
  });

  it("подделанный payload не проходит", () => {
    const token = createSessionToken(TEST_SECRET, T0);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "moderator", exp: T0 + 10 ** 12 })).toString(
      "base64url",
    );
    expect(verifySessionToken(`${forged}.${signature}`, TEST_SECRET, T0)).toBe(false);
  });

  it("мусор и пустые значения не проходят", () => {
    for (const value of [undefined, null, "", "abc", "a.b.c", ".", "x."]) {
      expect(verifySessionToken(value, TEST_SECRET, T0)).toBe(false);
    }
  });
});

describe("пароль модератора", () => {
  it("верный пароль", () => {
    expect(verifyPassword("test-moderator-123", "test-moderator-123")).toBe(true);
  });

  it("неверный пароль и пароль другой длины", () => {
    expect(verifyPassword("test-moderator-124", "test-moderator-123")).toBe(false);
    expect(verifyPassword("x", "test-moderator-123")).toBe(false);
    expect(verifyPassword("", "test-moderator-123")).toBe(false);
  });
});
