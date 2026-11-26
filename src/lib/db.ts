import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { getDatabasePath } from "./config";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('tech', 'room', 'canteen', 'idea', 'other')),
  text TEXT NOT NULL,
  room TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'rejected')),
  public_reply TEXT,
  rejection_reason TEXT,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_device_created ON requests (device_id, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests (status, created_at);
`;

type TransactionMode = "DEFERRED" | "IMMEDIATE" | "EXCLUSIVE";

/** Функция-транзакция: прямой вызов открывает DEFERRED, .immediate() сразу берёт блокировку записи. */
export interface Transaction<T> {
  (): T;
  deferred(): T;
  immediate(): T;
  exclusive(): T;
}

/**
 * Тонкая обёртка над встроенным node:sqlite (DatabaseSync).
 * Даёт prepare/exec/close и transaction(fn) с режимами deferred/immediate/exclusive.
 * Вложенные транзакции работают через SAVEPOINT.
 */
export class Db {
  private readonly connection: DatabaseSync;
  private depth = 0;
  private savepointCounter = 0;

  constructor(filePath: string) {
    this.connection = new DatabaseSync(filePath);
  }

  prepare(sql: string): StatementSync {
    return this.connection.prepare(sql);
  }

  exec(sql: string): void {
    this.connection.exec(sql);
  }

  close(): void {
    this.connection.close();
  }

  transaction<T>(fn: () => T): Transaction<T> {
    const run = (mode: TransactionMode) => () => this.runInTransaction(mode, fn);
    const tx = run("DEFERRED") as Transaction<T>;
    tx.deferred = run("DEFERRED");
    tx.immediate = run("IMMEDIATE");
    tx.exclusive = run("EXCLUSIVE");
    return tx;
  }

  private runInTransaction<T>(mode: TransactionMode, fn: () => T): T {
    if (this.depth > 0) return this.runInSavepoint(fn);

    this.connection.exec(`BEGIN ${mode}`);
    this.depth = 1;
    try {
      const result = fn();
      this.connection.exec("COMMIT");
      return result;
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    } finally {
      this.depth = 0;
    }
  }

  private runInSavepoint<T>(fn: () => T): T {
    const name = `sp_${++this.savepointCounter}`;
    this.connection.exec(`SAVEPOINT ${name}`);
    this.depth++;
    try {
      const result = fn();
      this.connection.exec(`RELEASE ${name}`);
      return result;
    } catch (error) {
      this.connection.exec(`ROLLBACK TO ${name}`);
      this.connection.exec(`RELEASE ${name}`);
      throw error;
    } finally {
      this.depth--;
    }
  }
}

/** Открывает БД по пути (или ":memory:") и создаёт схему. */
export function openDb(filePath: string): Db {
  if (filePath !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  }
  const db = new Db(filePath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

const globalForDb = globalThis as unknown as { __schoolRequestsDb?: Db };

/** Одно соединение на процесс (переживает hot reload в dev). */
export function getDb(): Db {
  if (!globalForDb.__schoolRequestsDb) {
    globalForDb.__schoolRequestsDb = openDb(getDatabasePath());
  }
  return globalForDb.__schoolRequestsDb;
}

/** Только для тестов: подменить или сбросить общее соединение. */
export function setDbForTesting(db: Db | undefined): void {
  globalForDb.__schoolRequestsDb = db;
}
