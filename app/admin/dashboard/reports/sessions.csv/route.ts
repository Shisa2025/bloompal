import { listAdminSessions } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  const sessions = await listAdminSessions(admin.userid, { pageSize: 10_000 });
  const rows = [
    ["session_id", "user_id", "user_name", "activity", "started_at", "completed_at", "duration_seconds", "left_repetitions", "right_repetitions", "successful_actions", "total_attempts", "result_metadata"],
    ...sessions.items.map((session) => [session.id, session.userid, session.userName, session.activityType, session.startedAt, session.completedAt, session.durationSeconds ?? "", session.leftRepetitions ?? "", session.rightRepetitions ?? "", session.successfulActions ?? "", session.totalAttempts ?? "", JSON.stringify(session.resultMetadata)]),
  ];
  return csvResponse(rows, "bloompal-sessions.csv");
}

function csvResponse(rows: (string | number)[][], filename: string) {
  const csv = rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}
function cell(value: string | number) { const text = String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
