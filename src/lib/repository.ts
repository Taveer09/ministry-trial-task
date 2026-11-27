import type { Category, Status } from "./constants";
import type { Db } from "./db";

export interface RequestRecord {
  id: number;
  code: string;
  category: Category;
  text: string;
  room: string | null;
  status: Status;
  publicReply: string | null;
  rejectionReason: string | null;
  deviceId: string;
  createdAt: number;
  updatedAt: number;
}

interface RequestRow {
  id: number;
  code: string;
  category: Category;
  text: string;
  room: string | null;
  status: Status;
  public_reply: string | null;
  rejection_reason: string | null;
  device_id: string;
  created_at: number;
  updated_at: number;
}

function toRecord(row: RequestRow): RequestRecord {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    text: row.text,
    room: row.room,
    status: row.status,
    publicReply: row.public_reply,
    rejectionReason: row.rejection_reason,
    deviceId: row.device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface NewRequest {
  code: string;
  category: Category;
  text: string;
  room: string | null;
  deviceId: string;
  createdAt: number;
  status?: Status;
  publicReply?: string | null;
  rejectionReason?: string | null;
  updatedAt?: number;
}

export function insertRequest(db: Db, data: NewRequest): RequestRecord {
  const info = db
    .prepare(
      `INSERT INTO requests
        (code, category, text, room, status, public_reply, rejection_reason, device_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.code,
      data.category,
      data.text,
      data.room,
      data.status ?? "new",
      data.publicReply ?? null,
      data.rejectionReason ?? null,
      data.deviceId,
      data.createdAt,
      data.updatedAt ?? data.createdAt,
    );
  const created = findById(db, Number(info.lastInsertRowid));
  if (!created) throw new Error("Обращение не сохранилось");
  return created;
}

export function codeExists(db: Db, code: string): boolean {
  return db.prepare("SELECT 1 FROM requests WHERE code = ?").get(code) !== undefined;
}

export function findById(db: Db, id: number): RequestRecord | null {
  const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as unknown as RequestRow | undefined;
  return row ? toRecord(row) : null;
}

export function findByCode(db: Db, code: string): RequestRecord | null {
  const row = db.prepare("SELECT * FROM requests WHERE code = ?").get(code) as unknown as
    | RequestRow
    | undefined;
  return row ? toRecord(row) : null;
}

/** Времена создания обращений устройства, попавших в окно (created_at > since). */
export function deviceTimestampsSince(db: Db, deviceId: string, since: number): number[] {
  const rows = db
    .prepare("SELECT created_at FROM requests WHERE device_id = ? AND created_at > ?")
    .all(deviceId, since) as unknown as { created_at: number }[];
  return rows.map((r) => r.created_at);
}

export function listRequests(db: Db, status?: Status, category?: Category): RequestRecord[] {
  const conditions: string[] = [];
  const params: string[] = [];
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const rows = db
    .prepare(`SELECT * FROM requests ${where} ORDER BY created_at DESC, id DESC`)
    .all(...params) as unknown as RequestRow[];
  return rows.map(toRecord);
}

export function updateModeratedFields(
  db: Db,
  id: number,
  fields: { status: Status; publicReply: string | null; rejectionReason: string | null },
  updatedAt: number,
): void {
  db.prepare(
    `UPDATE requests
        SET status = ?, public_reply = ?, rejection_reason = ?, updated_at = ?
      WHERE id = ?`,
  ).run(fields.status, fields.publicReply, fields.rejectionReason, updatedAt, id);
}

export function deleteAllRequests(db: Db): void {
  db.prepare("DELETE FROM requests").run();
}
