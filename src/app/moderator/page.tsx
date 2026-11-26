import { redirect } from "next/navigation";
import ModeratorDashboard from "@/components/ModeratorDashboard";
import { hasModeratorSession } from "@/lib/server-session";

export const metadata = { title: "Модератор — учебная копия" };

export default async function ModeratorPage() {
  if (!(await hasModeratorSession())) redirect("/moderator/login");
  return <ModeratorDashboard />;
}
