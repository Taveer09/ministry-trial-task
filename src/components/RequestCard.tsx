"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  CATEGORY_LABELS,
  REASON_MAX_LENGTH,
  REPLY_MAX_LENGTH,
  STATUS_LABELS,
  type Status,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ModeratorRequestView } from "@/lib/service";
import { allowedNextStatuses, isValidRejectionReason } from "@/lib/status";
import type { ModeratorUpdateInput } from "@/lib/validation";
import { buttonClass, Card, ErrorMessage, inputClass, StatusBadge } from "./ui";

interface Props {
  request: ModeratorRequestView;
  onUpdated: (updated: ModeratorRequestView) => void;
}

export default function RequestCard({ request, onUpdated }: Props) {
  const nextStatuses = allowedNextStatuses(request.status);
  const [nextStatus, setNextStatus] = useState<Status | "">("");
  const [reply, setReply] = useState(request.publicReply ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const replyChanged = reply.trim() !== (request.publicReply ?? "");
  const hasChanges = nextStatus !== "" || replyChanged;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const body: ModeratorUpdateInput = {};
    if (nextStatus !== "") body.status = nextStatus;
    if (replyChanged) body.publicReply = reply;
    if (nextStatus === "rejected") {
      if (!isValidRejectionReason(reason)) {
        setError("При отклонении укажите причину");
        return;
      }
      body.rejectionReason = reason;
    }
    if (body.status === undefined && body.publicReply === undefined) {
      setError("Нет изменений");
      return;
    }

    setSaving(true);
    const result = await apiFetch<{ request: ModeratorRequestView }>(
      `/api/moderator/requests/${request.id}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUpdated(result.data.request);
  }

  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold tracking-wider">{request.code}</span>
        <StatusBadge status={request.status} />
        <span className="text-xs text-slate-500">{CATEGORY_LABELS[request.category]}</span>
        {request.room && <span className="text-xs text-slate-500">· {request.room}</span>}
        <time className="ml-auto text-xs text-slate-500" dateTime={new Date(request.createdAt).toISOString()}>
          {formatDateTime(request.createdAt)}
        </time>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-800">{request.text}</p>

      {request.status === "rejected" && request.rejectionReason !== null && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium">Причина отклонения:</span> {request.rejectionReason}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4" noValidate>
        {nextStatuses.length > 0 && (
          <div>
            <label htmlFor={`status-${request.id}`} className="text-sm font-medium text-slate-800">
              Новый статус
            </label>
            <select
              id={`status-${request.id}`}
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as Status | "")}
              className={`${inputClass} mt-1`}
            >
              <option value="">Не менять ({STATUS_LABELS[request.status]})</option>
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}

        {nextStatus === "rejected" && (
          <div>
            <label htmlFor={`reason-${request.id}`} className="text-sm font-medium text-slate-800">
              Причина отклонения <span className="font-normal text-slate-500">(увидит ученик)</span>
            </label>
            <textarea
              id={`reason-${request.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={REASON_MAX_LENGTH}
              className={`${inputClass} mt-1`}
            />
          </div>
        )}

        <div>
          <label htmlFor={`reply-${request.id}`} className="text-sm font-medium text-slate-800">
            Публичный ответ <span className="font-normal text-slate-500">(увидит ученик)</span>
          </label>
          <textarea
            id={`reply-${request.id}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={REPLY_MAX_LENGTH}
            className={`${inputClass} mt-1`}
          />
        </div>

        <ErrorMessage message={error} />

        <button type="submit" disabled={saving || !hasChanges} className={`${buttonClass} w-full sm:w-auto`}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </form>
    </Card>
  );
}
