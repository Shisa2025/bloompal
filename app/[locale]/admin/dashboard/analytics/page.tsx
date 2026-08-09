import { Link } from "@/i18n/navigation";
import { getAdminAnalytics } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart, HorizontalBars, LineChart } from "@/app/admin/dashboard/_components/charts";
import { PageHeader, Panel } from "@/app/admin/dashboard/_components/ui";
import { formatDuration } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<{ days?: string | string[] }> }) {
  const admin = await requireAdmin(); const params = await searchParams; const rawDays = Array.isArray(params?.days) ? params.days[0] : params?.days; const analytics = await getAdminAnalytics(admin.userid, Number(rawDays) || 42);
  const locale = (await getLocale()) as SupportedLocale; const t = await getTranslations("Admin");
  const number = new Intl.NumberFormat(locale);
  const trend = (rows: { bucket: string; value: number }[]) => rows.map((row) => ({ label: new Intl.DateTimeFormat(locale, analytics.days === 7 ? { weekday: "short", timeZone: "Asia/Singapore" } : { day: "numeric", month: "short", timeZone: "Asia/Singapore" }).format(new Date(row.bucket)), value: row.value }));
  return <><PageHeader eyebrow={t("activityInsights")} title={t("analytics")} description={t("analyticsDescription")} action={<div className={styles.periodLinks}>{[7, 30, 42, 90].map((days) => <Link className={analytics.days === days ? styles.periodLinkActive : ""} href={`/admin/dashboard/analytics?days=${days}`} key={days}>{days === 42 ? t("sixWeeks") : t("days", { count: days })}</Link>)}</div>} />
    <section className={styles.insightStrip}><article className={styles.insight}><span>{t("completedSessions")}</span><strong>{number.format(analytics.totalSessions)}</strong><p>{t("selectedPeriod")}</p></article><article className={styles.insight}><span>{t("activeUsers")}</span><strong>{number.format(analytics.activeUsers)}</strong><p>{t("distinctActiveUsers")}</p></article><article className={styles.insight}><span>{t("averageDuration")}</span><strong>{formatDuration(analytics.averageDurationSeconds, locale)}</strong><p>{t("sessionsWithTiming")}</p></article></section>
    <div className={styles.analyticsGrid}><Panel title={t("sessionTrend")} subtitle={t("activityOverTime")}><BarChart data={trend(analytics.sessionsTrend)} /></Panel><Panel title={t("averageDuration")} subtitle={t("secondsPerSession")}><LineChart data={trend(analytics.durationTrend)} suffix={t("secondsShort")} /></Panel><Panel title={t("activityPopularity")} subtitle={t("sessionsByGame")}><HorizontalBars data={analytics.activityPopularity.map((row) => ({ label: t(`activityType.${row.activityType}`), value: row.value }))} suffix="" /></Panel><Panel title={t("dataCoverage")} subtitle={t("chartsCalculated")}><div className={styles.metricList}><div className={styles.metricRow}><span>{t("period")}</span><strong>{t("days", { count: analytics.days })}</strong></div><div className={styles.metricRow}><span>{t("scope")}</span><strong>{t("assignedUsersOnly")}</strong></div><div className={styles.metricRow}><span>{t("source")}</span><strong>game_sessions</strong></div></div></Panel></div></>;
}
