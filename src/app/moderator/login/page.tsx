import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { hasModeratorSession } from "@/lib/server-session";

export const metadata = { title: "Вход модератора — учебная копия" };

export default async function ModeratorLoginPage() {
  if (await hasModeratorSession()) redirect("/moderator");
  return <LoginForm />;
}
