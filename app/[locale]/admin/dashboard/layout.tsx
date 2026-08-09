import { DashboardShell } from "@/app/admin/dashboard/_components/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAdmin();

  return (
    <DashboardShell userName={account.displayName}>
      {children}
    </DashboardShell>
  );
}
