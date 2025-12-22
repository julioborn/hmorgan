import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic"; // 👈 MUY importante

export default function LoginPage() {
  const hasSession = !!cookies().get("session")?.value;

  if (hasSession) {
    redirect("/");
  }

  return <LoginClient />;
}
