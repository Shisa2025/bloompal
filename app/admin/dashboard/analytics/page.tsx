import Link from "next/link";
import { getAdminAnalytics } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart, HorizontalBars, LineChart } from "../_components/charts";
import { PageHeader, Panel } from "../_components/ui";
import { formatDuration } from "../_lib/format";
import styles from "../dashboard.module.css";

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<{ days?: string | string[] }> }) {
  const admin = await requireAdmin(); const params = await searchParams; const rawDays = Array.isArray(params?.days) ? params.days[0] : params?.days; const analytics = await getAdminAnalytics(admin.userid, Number(rawDays) || 42);
  return <><PageHeader eyebrow="Activity insights" title="Analytics" description="Aggregated real sessions for users assigned to this Admin." action={<div className={styles.periodLinks}>{[7, 30, 42, 90].map((days) => <Link className={analytics.days === days ? styles.periodLinkActive : ""} href={`/admin/dashboard/analytics?days=${days}`} key={days}>{days === 42 ? "6 weeks" : `${days} days`}</Link>)}</div>} />
    <section className={styles.insightStrip}><article className={styles.insight}><span>Completed sessions</span><strong>{analytics.totalSessions}</strong><p>During the selected period.</p></article><article className={styles.insight}><span>Active users</span><strong>{analytics.activeUsers}</strong><p>Distinct users with completed activity.</p></article><article className={styles.insight}><span>Average duration</span><strong>{formatDuration(analytics.averageDurationSeconds)}</strong><p>Sessions with timing data.</p></article></section>
    <div className={styles.analyticsGrid}><Panel title="Session trend" subtitle="Completed activity over time"><BarChart data={analytics.sessionsTrend} /></Panel><Panel title="Average duration" subtitle="Seconds per session"><LineChart data={analytics.durationTrend} suffix="s" /></Panel><Panel title="Activity popularity" subtitle="Completed sessions by game"><HorizontalBars data={analytics.activityPopularity} suffix="" /></Panel><Panel title="Data coverage" subtitle="How these charts are calculated"><div className={styles.metricList}><div className={styles.metricRow}><span>Period</span><strong>{analytics.days} days</strong></div><div className={styles.metricRow}><span>Scope</span><strong>Assigned users only</strong></div><div className={styles.metricRow}><span>Source</span><strong>game_sessions</strong></div></div></Panel></div></>;
}
