import { Suspense } from "react";
import StatusLookup from "@/components/StatusLookup";

export const metadata = { title: "Статус обращения — учебная копия" };

export default function StatusPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Загрузка…</p>}>
      <StatusLookup />
    </Suspense>
  );
}
