"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { buttonClass, Card, ErrorMessage, inputClass } from "./ui";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!password) {
      setError("Введите пароль");
      return;
    }
    setSubmitting(true);
    const result = await apiFetch<{ ok: true }>("/api/moderator/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPassword("");
    router.replace("/moderator");
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold">Вход для модератора</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-800">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>
        <ErrorMessage message={error} />
        <button type="submit" disabled={submitting} className={`${buttonClass} w-full`}>
          {submitting ? "Входим…" : "Войти"}
        </button>
      </form>
    </Card>
  );
}
