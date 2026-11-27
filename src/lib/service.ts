import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, type Category, type Status } from "./constants";
import { generateUniqueCode, isValidCode, normalizeCode, type RandomIntFn } from "./code";
import type { Db } from "./db";
import { checkRateLimit } from "./rate-limit";
import {
  codeExists,
  deviceTimestampsSince,
  findByCode,
  findById,
  insertRequest,
  listRequests,
  updateModeratedFields,
  type RequestRecord,
} from "./repository";
import { applyModeratorUpdate, type UpdateErrorCode } from "./status";
import { firstIssueMessage, moderatorUpdateSchema, submitRequestSchema } from "./validation";

export type Clock = () => number;

export interface ServiceDeps {
  db: Db;
  now: Clock;
  rng?: RandomIntFn;
}

/** То, что видит ученик по коду. Без текста обращения и кабинета. */
export interface PublicStatusView {
  category: Category;
  status: Status;
  publicReply: string | null;
  rejectionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

/** То, что видит модератор. Без device_id. */
export type ModeratorRequestView = Omit<RequestRecord, "deviceId">;

export function toPublicView(record: RequestRecord): PublicStatusView {
  return {
    category: record.category,
    status: record.status,
    publicReply: record.publicReply,
    rejectionReason: record.status === "rejected" ? record.rejectionReason : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toModeratorView(record: RequestRecord): ModeratorRequestView {
  return {
    id: record.id,
    code: record.code,
    category: record.category,
    text: record.text,
    room: record.room,
    status: record.status,
    publicReply: record.publicReply,
    rejectionReason: record.rejectionReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export type SubmitResult =
  | { ok: true; code: string }
  | { ok: false; error: "validation"; message: string }
  | { ok: false; error: "rate_limited"; message: string; retryAfterMs: number };

export function submitRequest(deps: ServiceDeps, deviceId: string, raw: unknown): SubmitResult {
  const parsed = submitRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: firstIssueMessage(parsed.error) };
  }
  const data = parsed.data;

  // Проверка лимита и вставка в одной транзакции: параллельные запросы не проскочат.
  const run = deps.db.transaction((): SubmitResult => {
    const now = deps.now();
    const timestamps = deviceTimestampsSince(deps.db, deviceId, now - RATE_LIMIT_WINDOW_MS);
    const limit = checkRateLimit(timestamps, now);
    if (!limit.allowed) {
      return {
        ok: false,
        error: "rate_limited",
        message: `Можно отправить не больше ${RATE_LIMIT_MAX} обращений в час. Попробуйте позже.`,
        retryAfterMs: limit.retryAfterMs,
      };
    }
    const code = generateUniqueCode((c) => codeExists(deps.db, c), deps.rng);
    insertRequest(deps.db, {
      code,
      category: data.category,
      text: data.text,
      room: data.room,
      deviceId,
      createdAt: now,
    });
    return { ok: true, code };
  });
  return run.immediate();
}

export type StatusLookupResult =
  | { ok: true; view: PublicStatusView }
  | { ok: false; error: "invalid_code" | "not_found"; message: string };

export function getPublicStatus(deps: ServiceDeps, rawCode: string): StatusLookupResult {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) {
    return { ok: false, error: "invalid_code", message: "Код состоит из 6 символов: буквы и цифры" };
  }
  const record = findByCode(deps.db, code);
  if (!record) {
    return { ok: false, error: "not_found", message: "Обращение с таким кодом не найдено" };
  }
  return { ok: true, view: toPublicView(record) };
}

export function listForModerator(deps: ServiceDeps, status?: Status, category?: Category): ModeratorRequestView[] {
  return listRequests(deps.db, status, category).map(toModeratorView);
}

export type ModeratorUpdateResult =
  | { ok: true; request: ModeratorRequestView }
  | { ok: false; error: "validation" | "not_found" | UpdateErrorCode; message: string };

export function updateByModerator(
  deps: ServiceDeps,
  id: number,
  raw: unknown,
): ModeratorUpdateResult {
  const parsed = moderatorUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: firstIssueMessage(parsed.error) };
  }

  // Чтение и запись в одной транзакции: два модератора не перезапишут переход друг друга.
  const run = deps.db.transaction((): ModeratorUpdateResult => {
    const current = findById(deps.db, id);
    if (!current) {
      return { ok: false, error: "not_found", message: "Обращение не найдено" };
    }
    const result = applyModeratorUpdate(current, parsed.data);
    if (!result.ok) {
      return { ok: false, error: result.code, message: result.message };
    }
    updateModeratedFields(deps.db, id, result.fields, deps.now());
    const updated = findById(deps.db, id);
    if (!updated) throw new Error("Обращение пропало во время обновления");
    return { ok: true, request: toModeratorView(updated) };
  });
  return run.immediate();
}
