import { describe, expect, it } from "vitest";
import { openDb } from "@/lib/db";

function count(db: ReturnType<typeof openDb>): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM requests").get() as { n: number };
  return row.n;
}

function insert(db: ReturnType<typeof openDb>, code: string) {
  db.prepare(
    "INSERT INTO requests (code, category, text, device_id, created_at, updated_at) VALUES (?, 'tech', 'x', 'd', 1, 1)",
  ).run(code);
}

describe("обёртка node:sqlite", () => {
  it("транзакция возвращает результат и фиксирует изменения", () => {
    const db = openDb(":memory:");
    const result = db.transaction(() => {
      insert(db, "AAAAAA");
      return "ok";
    }).immediate();
    expect(result).toBe("ok");
    expect(count(db)).toBe(1);
  });

  it("при ошибке транзакция откатывается и ошибка пробрасывается", () => {
    const db = openDb(":memory:");
    expect(() =>
      db.transaction(() => {
        insert(db, "AAAAAA");
        throw new Error("boom");
      }).immediate(),
    ).toThrow("boom");
    expect(count(db)).toBe(0);
    // После отката соединение снова принимает транзакции.
    db.transaction(() => insert(db, "BBBBBB"))();
    expect(count(db)).toBe(1);
  });

  it("вложенная транзакция откатывается отдельно через SAVEPOINT", () => {
    const db = openDb(":memory:");
    db.transaction(() => {
      insert(db, "AAAAAA");
      expect(() =>
        db.transaction(() => {
          insert(db, "BBBBBB");
          throw new Error("inner");
        })(),
      ).toThrow("inner");
    }).immediate();
    expect(count(db)).toBe(1);
  });

  it("нарушение UNIQUE внутри транзакции откатывает её", () => {
    const db = openDb(":memory:");
    insert(db, "AAAAAA");
    expect(() =>
      db.transaction(() => {
        insert(db, "BBBBBB");
        insert(db, "AAAAAA");
      }).immediate(),
    ).toThrow();
    expect(count(db)).toBe(1);
  });

  it("режимы deferred и exclusive тоже работают", () => {
    const db = openDb(":memory:");
    db.transaction(() => insert(db, "AAAAAA")).deferred();
    db.transaction(() => insert(db, "BBBBBB")).exclusive();
    expect(count(db)).toBe(2);
  });
});
