import { listManagedUsers } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  const users = await listManagedUsers(admin.userid, { pageSize: 10_000 });
  const rows = [
    ["user_id", "name", "email", "status", "created_at", "last_login_at", "last_activity_at", "sessions", "flowers", "bugs", "snapshots"],
    ...users.items.map((user) => [user.userid, user.displayName, user.email, user.status, user.createdAt, user.lastLoginAt ?? "", user.lastActivityAt ?? "", user.sessionCount, user.flowerCount, user.bugCount, user.snapshotCount]),
  ];
  return csvResponse(rows, "bloompal-users.csv");
}

function csvResponse(rows: (string | number)[][], filename: string) {
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}
function cell(value: string | number) { const text = String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
