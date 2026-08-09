import { Link } from "@/i18n/navigation";
import { listAdminSessions } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { EmptyState, PageHeader, Panel, StatusBadge, TableShell } from "@/app/admin/dashboard/_components/ui";
import { formatDateTime, formatDuration } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";

export default async function MotionPage() {
  const admin = await requireAdmin();
  const locale = (await getLocale()) as SupportedLocale;
  const t = await getTranslations("Admin");
  const number = new Intl.NumberFormat(locale);
  const result = await listAdminSessions(admin.userid, { pageSize: 100 });
  const measured = result.items.filter((session) => session.leftRepetitions !== null || session.rightRepetitions !== null);
  const averageLeft = average(measured.map((session) => session.leftRepetitions).filter(isNumber));
  const averageRight = average(measured.map((session) => session.rightRepetitions).filter(isNumber));
  const timed = measured.map((session) => session.durationSeconds).filter(isNumber);
  const bugSessions = measured.filter((session) => session.activityType === "collect_bugs" && session.totalAttempts);
  const averageSuccess = average(bugSessions.map((session) => Math.round(((session.successfulActions ?? 0) / (session.totalAttempts ?? 1)) * 100)));

  return <><PageHeader eyebrow={t("handTracking")} title={t("motionActivity")} description={t("motionDescription")} action={<Link className={styles.secondaryButton} href="/admin/dashboard/reports/sessions.csv">{t("exportCsv")}</Link>} />
    <section className={styles.motionSummary} aria-label={t("motionSummary")}><article className={styles.motionMetric}><span>{t("measuredSessions")}</span><strong>{number.format(measured.length)}</strong><small>{t("newMotionSessions")}</small></article><article className={styles.motionMetric}><span>{t("averageLeftReps")}</span><strong>{display(averageLeft, number)}</strong><small>{t("perMeasuredSession")}</small></article><article className={styles.motionMetric}><span>{t("averageRightReps")}</span><strong>{display(averageRight, number)}</strong><small>{t("perMeasuredSession")}</small></article><article className={styles.motionMetric}><span>{t("averageDuration")}</span><strong>{formatDuration(average(timed), locale)}</strong><small>{t("measuredSessions")}</small></article><article className={styles.motionMetric}><span>{t("bugTouchSuccess")}</span><strong>{averageSuccess === null ? "—" : new Intl.NumberFormat(locale, { style: "percent" }).format(averageSuccess / 100)}</strong><small>{t("correctTotalTouches")}</small></article><article className={styles.motionMetric}><span>{t("privacy")}</span><strong className={styles.compactMetric}>{t("metricsOnly")}</strong><small>{t("noVideoLandmarks")}</small></article></section>
    <Panel title={t("motionSessionLog")} subtitle={t("backfillHint")}>
      {result.items.length ? <TableShell><thead><tr><th>{t("user")}</th><th>{t("activity")}</th><th>{t("completed")}</th><th>{t("duration")}</th><th>{t("left")}</th><th>{t("right")}</th><th>{t("attempts")}</th><th>{t("success")}</th></tr></thead><tbody>{result.items.map((session) => <tr key={session.id}><td>{session.userName}</td><td>{t(`activityType.${session.activityType}`)}</td><td>{formatDateTime(session.completedAt, locale)}</td><td>{formatDuration(session.durationSeconds, locale)}</td><td>{session.leftRepetitions === null ? "—" : number.format(session.leftRepetitions)}</td><td>{session.rightRepetitions === null ? "—" : number.format(session.rightRepetitions)}</td><td>{session.totalAttempts === null ? "—" : number.format(session.totalAttempts)}</td><td>{session.successfulActions !== null && session.totalAttempts ? <StatusBadge tone={(session.successfulActions / session.totalAttempts) >= .8 ? "success" : "warning"}>{new Intl.NumberFormat(locale, { style: "percent" }).format(session.successfulActions / session.totalAttempts)}</StatusBadge> : "—"}</td></tr>)}</tbody></TableShell> : <EmptyState>{t("noMotionSessions")}</EmptyState>}
    </Panel></>;
}

function isNumber(value: number | null): value is number { return value !== null; }
function average(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null; }
function display(value: number | null, number: Intl.NumberFormat) { return value === null ? "—" : number.format(value); }
