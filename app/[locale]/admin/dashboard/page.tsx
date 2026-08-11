import { Link } from "@/i18n/navigation";
import { getAdminAnalytics, getAdminOverview } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart, HorizontalBars, LineChart } from "@/app/admin/dashboard/_components/charts";
import { Avatar, PageHeader, Panel, StatCard, StatusBadge, TableShell, TextLink } from "@/app/admin/dashboard/_components/ui";
import { formatDateTime, formatDuration } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const locale = (await getLocale()) as SupportedLocale;
  const t = await getTranslations("Admin");
  const number = new Intl.NumberFormat(locale);
  const [overview, analytics] = await Promise.all([
    getAdminOverview(admin.userid),
    getAdminAnalytics(admin.userid, 7),
  ]);
  const rewardCount = overview.flowerCount + overview.fruitCount + overview.fishCount + overview.bugCount + overview.snapshotCount;

  return (
    <>
      <PageHeader eyebrow={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "Asia/Singapore" }).format(new Date())} title={t("overviewTitle")} description={t("overviewDescription")} />
      <section className={styles.statsGrid} aria-label={t("dashboardMetrics")}>
        <StatCard label={t("assignedUsers")} value={number.format(overview.totalUsers)} detail={t("managedByAdmin")} icon="users" />
        <StatCard label={t("activeUsers")} value={number.format(overview.activeUsers)} detail={t("activityLast7Days")} icon="activity" tone="blue" />
        <StatCard label={t("sessionsToday")} value={number.format(overview.sessionsToday)} detail={t("singaporeTime")} icon="calendar" tone="purple" />
        <StatCard label={t("averageDuration")} value={compactDuration(overview.averageDurationSeconds, locale)} detail={t("completedLast30Days")} icon="clock" tone="amber" />
        <StatCard label={t("rewardsEarned")} value={number.format(rewardCount)} detail={t("rewardDetail", { flowers: overview.flowerCount, fruits: overview.fruitCount, fish: overview.fishCount, bugs: overview.bugCount, snapshots: overview.snapshotCount })} icon="trend" />
        <StatCard label={t("inactive7Days")} value={number.format(overview.inactiveUsers)} detail={t("includesNoSessions")} icon="attention" tone="rose" />
      </section>
      <div className={styles.contentGrid}>
        <div>
          <Panel title={t("recentSessions")} subtitle={t("latestActivities")} action={<TextLink href="/admin/dashboard/sessions">{t("viewAll")}</TextLink>}>
            {overview.recentSessions.length ? <TableShell><thead><tr><th>{t("user")}</th><th>{t("activity")}</th><th>{t("completed")}</th><th>{t("duration")}</th><th>{t("leftRight")}</th></tr></thead><tbody>{overview.recentSessions.map((session) => <tr key={session.id}><td><Link className={styles.personCell} href={`/admin/dashboard/users/${encodeURIComponent(session.userid)}`}><Avatar name={session.userName} size="small" /><strong>{session.userName}</strong></Link></td><td>{t(`activityType.${session.activityType}`)}</td><td>{formatDateTime(session.completedAt, locale)}</td><td>{formatDuration(session.durationSeconds, locale)}</td><td>{session.leftRepetitions === null ? "—" : number.format(session.leftRepetitions)} / {session.rightRepetitions === null ? "—" : number.format(session.rightRepetitions)}</td></tr>)}</tbody></TableShell> : <p className={styles.emptyState}>{t("completeGameHint")}</p>}
          </Panel>
          <div className={`${styles.twoColumn} ${styles.sectionGap}`}><Panel title={t("sessionsThisWeek")} subtitle={t("activityByDay")}><BarChart compact data={localiseTrend(analytics.sessionsTrend, locale, analytics.days)} /></Panel><Panel title={t("averageDuration")} subtitle={t("secondsPerSession")}><LineChart data={localiseTrend(analytics.durationTrend, locale, analytics.days)} suffix={t("secondsShort")} /></Panel></div>
          <Panel className={styles.sectionGap} title={t("activityPopularity")} subtitle={t("sessionsByGame")}><HorizontalBars data={analytics.activityPopularity.map((row) => ({ label: t(`activityType.${row.activityType}`), value: row.value }))} suffix="" /></Panel>
        </div>
        <div>
          <Panel title={t("usersCheckIn")} subtitle={t("noActivity7Days")} action={<TextLink href="/admin/dashboard/users">{t("reviewUsers")}</TextLink>}>
            <div className={styles.activityList}>{overview.attentionUsers.length ? overview.attentionUsers.map((user) => <article className={styles.activityItem} key={user.userid}><Avatar name={user.displayName} size="small" /><div><strong>{user.displayName}</strong><p>{user.sessionCount ? t("lastActivity", { date: formatDateTime(user.lastActivityAt!, locale) }) : t("noCompletedSessions")}</p><StatusBadge tone={user.status === "active" ? "warning" : "neutral"}>{t(`status.${user.status}`)}</StatusBadge></div></article>) : <p className={styles.emptyState}>{t("allUsersRecent")}</p>}</div>
          </Panel>
          <Panel className={styles.sectionGap} title={t("rewardInventory")} subtitle={t("assignedRewards")}><div className={styles.metricList}><div className={styles.metricRow}><span>{t("flowers")}</span><strong>{number.format(overview.flowerCount)}</strong></div><div className={styles.metricRow}><span>{t("fruits")}</span><strong>{number.format(overview.fruitCount)}</strong></div><div className={styles.metricRow}><span>{t("fish")}</span><strong>{number.format(overview.fishCount)}</strong></div><div className={styles.metricRow}><span>{t("collectedBugs")}</span><strong>{number.format(overview.bugCount)}</strong></div><div className={styles.metricRow}><span>{t("gardenSnapshots")}</span><strong>{number.format(overview.snapshotCount)}</strong></div></div></Panel>
        </div>
      </div>
    </>
  );
}

function compactDuration(seconds: number | null, locale: SupportedLocale) { if (seconds === null) return "—"; return locale === "zh-CN" ? (seconds >= 60 ? `${Math.round(seconds / 60)} 分` : `${seconds} 秒`) : (seconds >= 60 ? `${Math.round(seconds / 60)}m` : `${seconds}s`); }

function localiseTrend(rows: { bucket: string; value: number }[], locale: SupportedLocale, days: number) {
  return rows.map((row) => ({ label: new Intl.DateTimeFormat(locale, days === 7 ? { weekday: "short", timeZone: "Asia/Singapore" } : { day: "numeric", month: "short", timeZone: "Asia/Singapore" }).format(new Date(row.bucket)), value: row.value }));
}
