import { cookies } from "next/headers";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();
  const displayName = cookieStore.get("bloompal_display_name")?.value.trim();

  return (
    <DashboardShell userName={displayName || userId || "Demo Administrator"}>
      {children}
    </DashboardShell>
  );
}
