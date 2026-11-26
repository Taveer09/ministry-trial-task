"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { CODE_LENGTH, isValidCode, normalizeCode } from "@/lib/code-format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { PublicStatusView } from "@/lib/service";
import { buttonClass, Card, ErrorMessage, inputClass, StatusBadge } from "./ui";

export default function StatusLookup() {
  const searchParams = useSearchParams();
  const initialCode = normalizeCode(searchParams.get("code") ?? "");
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<PublicStatusView | null>(null);
  const autoChecked = useRef(false);

  const lookup = useCallback(async (rawCode: string) => {
    const normalized = normalizeCode(rawCode);
    setError(null);
    setView(null);
    if (!isValidCode(normalized)) {
      setError("Код состоит из 6 символов: латинские буквы и цифры 2-9");
      return;
    }
    setLoading(true);
    const result = await apiFetch<{ request: PublicStatusView }>(
      `/api/status?code=${encodeURIComponent(normalized)}`,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setView(result.data.request);
  }, []);

  useEffect(() => {
    if (autoChecked.current || !initialCode) return;
    autoChecked.current = true;
    void lookup(initialCode);
  }, [initialCode, lookup]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(code);
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-xl font-semibold">Статус обращения</h1>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row" noValidate>
          <label htmlFor="code" className="sr-only">
            Код обращения
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            maxLength={CODE_LENGTH + 4}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Например: K7M2QX"
            className={`${inputClass} font-mono uppercase tracking-widest`}
          />
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading ? "Ищем…" : "Проверить"}
          </button>
        </form>
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      </Card>

      {view && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              Категория:{" "}
              <span className="font-medium text-slate-900">{CATEGORY_LABELS[view.category]}</span>
            </p>
            <StatusBadge status={view.status} />
          </div>

          {view.status === "rejected" && view.rejectionReason && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-slate-800">Причина отклонения</h2>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                {view.rejectionReason}
              </p>
            </div>
          )}

          <div className="mt-4">
            <h2 className="text-sm font-medium text-slate-800">Ответ модератора</h2>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
              {view.publicReply ?? "Пока ответа нет."}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <div>
              <dt className="inline">Создано: </dt>
              <dd className="inline">{formatDateTime(view.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline">Обновлено: </dt>
              <dd className="inline">{formatDateTime(view.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
