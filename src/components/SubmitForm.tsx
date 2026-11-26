"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ROOM_MAX_LENGTH,
  TEXT_MAX_LENGTH,
  type Category,
} from "@/lib/constants";
import { firstIssueMessage, submitRequestSchema } from "@/lib/validation";
import { buttonClass, Card, ErrorMessage, inputClass, secondaryButtonClass } from "./ui";

export default function SubmitForm() {
  const [category, setCategory] = useState<Category | "">("");
  const [text, setText] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = { category, text, room };
    const parsed = submitRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiFetch<{ code: string }>("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCode(result.data.code);
    setCategory("");
    setText("");
    setRoom("");
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (code) {
    return (
      <Card>
        <h1 className="text-xl font-semibold">Обращение отправлено</h1>
        <p className="mt-2 text-sm text-slate-600">
          Сохраните код. По нему можно узнать статус и ответ. Восстановить код нельзя.
        </p>
        <p
          className="mt-4 select-all rounded-lg bg-slate-100 px-4 py-3 text-center font-mono text-3xl font-semibold tracking-[0.3em]"
          data-testid="request-code"
        >
          {code}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={copyCode} className={secondaryButtonClass}>
            {copied ? "Скопировано" : "Скопировать код"}
          </button>
          <Link href={`/status?code=${code}`} className={buttonClass}>
            Проверить статус
          </Link>
          <button
            type="button"
            onClick={() => {
              setCode(null);
              setCopied(false);
            }}
            className={secondaryButtonClass}
          >
            Новое обращение
          </button>
        </div>
      </Card>
    );
  }

  const trimmedLength = text.trim().length;

  return (
    <Card>
      <h1 className="text-xl font-semibold">Новое обращение</h1>
      <p className="mt-1 text-sm text-slate-600">Без регистрации и без имени.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Категория</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CATEGORIES.map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm ${
                  category === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                {CATEGORY_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="text" className="text-sm font-medium text-slate-800">
            Что случилось или что предлагаете
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={TEXT_MAX_LENGTH + 200}
            className={`${inputClass} mt-2`}
            placeholder="Например: в кабинете не работает проектор"
          />
          <p
            className={`mt-1 text-right text-xs ${
              trimmedLength > TEXT_MAX_LENGTH ? "text-rose-700" : "text-slate-500"
            }`}
          >
            {trimmedLength} / {TEXT_MAX_LENGTH}
          </p>
        </div>

        <div>
          <label htmlFor="room" className="text-sm font-medium text-slate-800">
            Кабинет <span className="font-normal text-slate-500">(необязательно)</span>
          </label>
          <input
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            maxLength={ROOM_MAX_LENGTH}
            className={`${inputClass} mt-2`}
            placeholder="Например: Т-101"
          />
        </div>

        <ErrorMessage message={error} />

        <button type="submit" disabled={submitting} className={`${buttonClass} w-full`}>
          {submitting ? "Отправляем…" : "Отправить"}
        </button>
        <p className="text-xs text-slate-500">Не больше 3 обращений в час с одного устройства.</p>
      </form>
    </Card>
  );
}
