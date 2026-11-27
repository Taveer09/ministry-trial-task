import type { Status } from "./constants";
import type { ModeratorUpdateInput } from "./validation";

/** Допустимые переходы. Из resolved и rejected переходов нет. */
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  new: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(from: Status): readonly Status[] {
  return TRANSITIONS[from];
}

export function isFinalStatus(status: Status): boolean {
  return TRANSITIONS[status].length === 0;
}

export function isValidRejectionReason(reason: string | null | undefined): boolean {
  if (typeof reason !== "string") return false;
  return reason.trim().length > 0;
}

export interface ModeratedFields {
  status: Status;
  publicReply: string | null;
  rejectionReason: string | null;
}

export type UpdateErrorCode = "invalid_transition" | "reason_required" | "reason_not_allowed";

export type UpdateResult =
  | { ok: true; fields: ModeratedFields; statusChanged: boolean }
  | { ok: false; code: UpdateErrorCode; message: string };

/**
 * Чистая функция: проверяет изменение модератора и возвращает новые значения полей.
 * Ничего не пишет в БД.
 */
export function applyModeratorUpdate(
  current: ModeratedFields,
  input: ModeratorUpdateInput,
): UpdateResult {
  const next: ModeratedFields = { ...current };
  let statusChanged = false;

  if (input.status !== undefined) {
    if (!canTransition(current.status, input.status)) {
      return {
        ok: false,
        code: "invalid_transition",
        message: `Переход ${current.status} → ${input.status} запрещён`,
      };
    }
    if (input.status === "rejected") {
      if (!isValidRejectionReason(input.rejectionReason)) {
        return {
          ok: false,
          code: "reason_required",
          message: "При отклонении укажите причину",
        };
      }
      next.rejectionReason = (input.rejectionReason as string).trim();
    } else if (input.rejectionReason !== undefined) {
      return {
        ok: false,
        code: "reason_not_allowed",
        message: "Причина указывается только при отклонении",
      };
    }
    next.status = input.status;
    statusChanged = true;
  } else if (input.rejectionReason !== undefined) {
    return {
      ok: false,
      code: "reason_not_allowed",
      message: "Причина указывается только при отклонении",
    };
  }

  if (input.publicReply !== undefined) {
    const reply = input.publicReply.trim();
    next.publicReply = reply.length > 0 ? reply : null;
  }

  return { ok: true, fields: next, statusChanged };
}
