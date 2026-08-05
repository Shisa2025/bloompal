import Link from "next/link";
import { listAdminSessions } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { EmptyState, PageHeader, Panel, StatusBadge, TableShell } from "../_components/ui";
import { activityLabel, formatDateTime, formatDuration } from "../_lib/format";
import styles from "../dashboard.module.css";

export default async function MotionPage() {
  const admin = await requireAdmin();
  const result = await listAdminSessions(admin.userid, { pageSize: 100 });
  const measured = result.items.filter((session) => session.leftRepetitions !== null || session.rightRepetitions !== null);
  const averageLeft = average(measured.map((session) => session.leftRepetitions).filter(isNumber));
  const averageRight = average(measured.map((session) => session.rightRepetitions).filter(isNumber));
  const timed = measured.map((session) => session.durationSeconds).filter(isNumber);
  const bugSessions = measured.filter((session) => session.activityType === "collect_bugs" && session.totalAttempts);
  const averageSuccess = average(bugSessions.map((session) => Math.round(((session.successfulActions ?? 0) / (session.totalAttempts ?? 1)) * 100)));

  return <><PageHeader eyebrow="Hand tracking" title="Motion activity" description="Only aggregate repetitions and timing are stored. Webcam frames and MediaPipe landmarks are never saved." action={<Link className={styles.secondaryButton} href="/admin/dashboard/reports/sessions.csv">Export CSV</Link>} />
    <section className={styles.motionSummary} aria-label="Motion summary"><article className={styles.motionMetric}><span>Measured sessions</span><strong>{measured.length}</strong><small>New sessions with motion metrics</small></article><article className={styles.motionMetric}><span>Avg. left reps</span><strong>{display(averageLeft)}</strong><small>Per measured session</small></article><article className={styles.motionMetric}><span>Avg. right reps</span><strong>{display(averageRight)}</strong><small>Per measured session</small></article><article className={styles.motionMetric}><span>Avg. duration</span><strong>{formatDuration(average(timed))}</strong><small>Measured sessions</small></article><article className={styles.motionMetric}><span>Bug touch success</span><strong>{averageSuccess === null ? "—" : `${averageSuccess}%`}</strong><small>Correct / total touches</small></article><article className={styles.motionMetric}><span>Privacy</span><strong className={styles.compactMetric}>Metrics only</strong><small>No video or raw landmarks</small></article></section>
    <Panel title="Motion session log" subtitle="Backfilled history may show — where metrics were never recorded">
      {result.items.length ? <TableShell><thead><tr><th>User</th><th>Activity</th><th>Completed</th><th>Duration</th><th>Left</th><th>Right</th><th>Attempts</th><th>Success</th></tr></thead><tbody>{result.items.map((session) => <tr key={session.id}><td>{session.userName}</td><td>{activityLabel(session.activityType)}</td><td>{formatDateTime(session.completedAt)}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.leftRepetitions ?? "—"}</td><td>{session.rightRepetitions ?? "—"}</td><td>{session.totalAttempts ?? "—"}</td><td>{session.successfulActions !== null && session.totalAttempts ? <StatusBadge tone={(session.successfulActions / session.totalAttempts) >= .8 ? "success" : "warning"}>{Math.round((session.successfulActions / session.totalAttempts) * 100)}%</StatusBadge> : "—"}</td></tr>)}</tbody></TableShell> : <EmptyState>No motion sessions have been recorded.</EmptyState>}
    </Panel></>;
}

function isNumber(value: number | null): value is number { return value !== null; }
function average(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null; }
function display(value: number | null) { return value === null ? "—" : String(value); }
