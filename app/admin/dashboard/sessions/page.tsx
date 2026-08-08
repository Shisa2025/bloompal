import Link from "next/link";
import { listAdminSessions, type ActivityType } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, EmptyState, PageHeader, Panel, TableShell } from "../_components/ui";
import { activityLabel, formatDateTime, formatDuration } from "../_lib/format";
import styles from "../dashboard.module.css";

export default async function SessionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin(); const params = await searchParams;
  const query = one(params?.q) ?? ""; const activity = validActivity(one(params?.activity)); const days = validDays(one(params?.days)); const page = Math.max(1, Number(one(params?.page)) || 1);
  const result = await listAdminSessions(admin.userid, { query, activity, days, page });
  return <><PageHeader eyebrow="Real game activity" title="Session history" description="Completed motion-game sessions for users assigned to your Admin account." action={<Link className={styles.secondaryButton} href="/admin/dashboard/reports/sessions.csv">Export CSV</Link>} />
    <Panel title="Completed sessions" subtitle={`${result.total} recorded session${result.total === 1 ? "" : "s"}`}>
      <form className={styles.filterBar} method="get"><input className={styles.filterInput} defaultValue={query} name="q" placeholder="Search session or user" /><select className={styles.filterSelect} defaultValue={activity} name="activity"><option value="all">All activities</option><option value="watering">Watering</option><option value="collect_bugs">Collect Bugs</option><option value="snapshot">Snapshot</option><option value="catch_fish">Catching fishes</option></select><select className={styles.filterSelect} defaultValue={String(days)} name="days"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="42">Last 6 weeks</option><option value="90">Last 90 days</option><option value="365">Last year</option></select><button className={styles.secondaryButton} type="submit">Apply filters</button></form>
      {result.items.length ? <TableShell><thead><tr><th>Session</th><th>User</th><th>Completed</th><th>Activity</th><th>Duration</th><th>Left / right</th><th>Success</th></tr></thead><tbody>{result.items.map((session) => <tr key={session.id}><td><strong>{shortId(session.id)}</strong></td><td><Link className={styles.personCell} href={`/admin/dashboard/users/${encodeURIComponent(session.userid)}`}><Avatar name={session.userName} size="small" /><strong>{session.userName}</strong></Link></td><td>{formatDateTime(session.completedAt)}</td><td>{activityLabel(session.activityType)}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.leftRepetitions ?? "—"} / {session.rightRepetitions ?? "—"}</td><td>{successRate(session.successfulActions, session.totalAttempts)}</td></tr>)}</tbody></TableShell> : <EmptyState>No sessions match the current filters.</EmptyState>}
      <nav className={styles.pagination}>{page > 1 ? <Link href={href(query, activity, days, page - 1)}>Previous</Link> : <span />}<span>Page {page} of {result.pageCount}</span>{page < result.pageCount ? <Link href={href(query, activity, days, page + 1)}>Next</Link> : <span />}</nav>
    </Panel></>;
}

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function validActivity(value?: string): ActivityType | "all" { return value === "watering" || value === "collect_bugs" || value === "snapshot" || value === "catch_fish" ? value : "all"; }
function validDays(value?: string) { const days = Number(value); return [7, 30, 42, 90, 365].includes(days) ? days : 42; }
function shortId(id: string) { return id.startsWith("legacy-") ? id.slice(0, 18) : id.slice(0, 8); }
function successRate(success: number | null, total: number | null) { return success !== null && total ? `${Math.round((success / total) * 100)}%` : "—"; }
function href(q: string, activity: string, days: number, page: number) { const params = new URLSearchParams({ activity, days: String(days), page: String(page) }); if (q) params.set("q", q); return `/admin/dashboard/sessions?${params}`; }
