import Link from "next/link";
import { getAdminAnalytics, getAdminOverview } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart, LineChart } from "./_components/charts";
import { Avatar, PageHeader, Panel, StatCard, StatusBadge, TableShell, TextLink } from "./_components/ui";
import { activityLabel, formatDateTime, formatDuration } from "./_lib/format";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [overview, analytics] = await Promise.all([
    getAdminOverview(admin.userid),
    getAdminAnalytics(admin.userid, 7),
  ]);
  const rewardCount = overview.flowerCount + overview.bugCount + overview.snapshotCount;

  return (
    <>
      <PageHeader eyebrow={new Intl.DateTimeFormat("en-SG", { dateStyle: "full", timeZone: "Asia/Singapore" }).format(new Date())} title="Admin dashboard overview" description="Live activity for users assigned to your Admin account." />
      <section className={styles.statsGrid} aria-label="Dashboard metrics">
        <StatCard label="Assigned Users" value={String(overview.totalUsers)} detail="Managed by this Admin" icon="users" />
        <StatCard label="Active Users" value={String(overview.activeUsers)} detail="Activity in the last 7 days" icon="activity" tone="blue" />
        <StatCard label="Sessions Today" value={String(overview.sessionsToday)} detail="Completed in Singapore time" icon="calendar" tone="purple" />
        <StatCard label="Avg. Duration" value={compactDuration(overview.averageDurationSeconds)} detail="Completed sessions, last 30 days" icon="clock" tone="amber" />
        <StatCard label="Rewards Earned" value={String(rewardCount)} detail={`${overview.flowerCount} flowers · ${overview.bugCount} bugs · ${overview.snapshotCount} snapshots`} icon="trend" />
        <StatCard label="Inactive 7+ Days" value={String(overview.inactiveUsers)} detail="Includes users with no sessions" icon="attention" tone="rose" />
      </section>
      <div className={styles.contentGrid}>
        <div>
          <Panel title="Recent sessions" subtitle="Latest completed activities" action={<TextLink href="/admin/dashboard/sessions">View all</TextLink>}>
            {overview.recentSessions.length ? <TableShell><thead><tr><th>User</th><th>Activity</th><th>Completed</th><th>Duration</th><th>Left / right</th></tr></thead><tbody>{overview.recentSessions.map((session) => <tr key={session.id}><td><Link className={styles.personCell} href={`/admin/dashboard/users/${encodeURIComponent(session.userid)}`}><Avatar name={session.userName} size="small" /><strong>{session.userName}</strong></Link></td><td>{activityLabel(session.activityType)}</td><td>{formatDateTime(session.completedAt)}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.leftRepetitions ?? "—"} / {session.rightRepetitions ?? "—"}</td></tr>)}</tbody></TableShell> : <p className={styles.emptyState}>Complete a game with an assigned user to see activity here.</p>}
          </Panel>
          <div className={`${styles.twoColumn} ${styles.sectionGap}`}><Panel title="Sessions this week" subtitle="Completed activity by day"><BarChart compact data={analytics.sessionsTrend} /></Panel><Panel title="Average duration" subtitle="Seconds per completed session"><LineChart data={analytics.durationTrend} suffix="s" /></Panel></div>
        </div>
        <div>
          <Panel title="Users needing a check-in" subtitle="No completed activity in the last 7 days" action={<TextLink href="/admin/dashboard/users">Review users</TextLink>}>
            <div className={styles.activityList}>{overview.attentionUsers.length ? overview.attentionUsers.map((user) => <article className={styles.activityItem} key={user.userid}><Avatar name={user.displayName} size="small" /><div><strong>{user.displayName}</strong><p>{user.sessionCount ? `Last activity ${formatDateTime(user.lastActivityAt!)}` : "No completed sessions"}</p><StatusBadge tone={user.status === "active" ? "warning" : "neutral"}>{user.status}</StatusBadge></div></article>) : <p className={styles.emptyState}>All assigned users have recent activity.</p>}</div>
          </Panel>
          <Panel className={styles.sectionGap} title="Reward inventory" subtitle="Rewards earned by assigned users"><div className={styles.metricList}><div className={styles.metricRow}><span>Flowers</span><strong>{overview.flowerCount}</strong></div><div className={styles.metricRow}><span>Collected bugs</span><strong>{overview.bugCount}</strong></div><div className={styles.metricRow}><span>Garden snapshots</span><strong>{overview.snapshotCount}</strong></div></div></Panel>
        </div>
      </div>
    </>
  );
}

function compactDuration(seconds: number | null) { if (seconds === null) return "—"; return seconds >= 60 ? `${Math.round(seconds / 60)}m` : `${seconds}s`; }
