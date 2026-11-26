"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/constants";
import type { ModeratorRequestView } from "@/lib/service";
import RequestCard from "./RequestCard";
import { Card, ErrorMessage, secondaryButtonClass } from "./ui";

type Filter = Status | "all";

const FILTERS: Filter[] = ["all", ...STATUSES];

export default function ModeratorDashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [requests, setRequests] = useState<ModeratorRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = filter === "all" ? "" : `?status=${filter}`;
    apiFetch<{ requests: ModeratorRequestView[] }>(`/api/moderator/requests${query}`).then(
      (result) => {
        if (cancelled) return;
        setLoading(false);
        if (!result.ok) {
          if (result.status === 401) {
            router.replace("/moderator/login");
            return;
          }
          setError(result.message);
          return;
        }
        setError(null);
        setRequests(result.data.requests);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey, router]);

  function changeFilter(next: Filter) {
    if (next === filter) return;
    setLoading(true);
    setFilter(next);
  }

  function handleUpdated(updated: ModeratorRequestView) {
    if (filter !== "all" && updated.status !== filter) {
      setLoading(true);
      setReloadKey((k) => k + 1);
      return;
    }
    setRequests((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function logout() {
    await apiFetch("/api/moderator/logout", { method: "POST" });
    router.replace("/moderator/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Обращения</h1>
        <button type="button" onClick={logout} className={secondaryButtonClass}>
          Выйти
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4" role="tablist" aria-label="Фильтр по статусу">
        <div className="flex w-max gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => changeFilter(value)}
              className={`min-h-10 rounded-full border px-4 text-sm ${
                filter === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {value === "all" ? "Все" : STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : requests.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">Обращений нет.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {requests.map((item) => (
            <li key={`${item.id}-${item.updatedAt}`}>
              <RequestCard request={item} onUpdated={handleUpdated} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
