import { Link } from "@/i18n/navigation";
import { listAdminSessions, type ActivityType } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, EmptyState, PageHeader, Panel, TableShell } from "@/app/admin/dashboard/_components/ui";
import { formatDateTime, formatDuration } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";

export default async function SessionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const locale = (await getLocale()) as SupportedLocale;
  const t = await getTranslations("Admin");
  const number = new Intl.NumberFormat(locale);
  const query = one(params?.q) ?? "";
  const activity = validActivity(one(params?.activity));
  const days = validDays(one(params?.days));
  const page = Math.max(1, Number(one(params?.page)) || 1);
  const result = await listAdminSessions(admin.userid, { query, activity, days, page });

  return (
    <>
      <PageHeader eyebrow={t("realGameActivity")} title={t("sessionHistory")} description={t("sessionHistoryDescription")} action={<Link className={styles.secondaryButton} href="/admin/dashboard/reports/sessions.csv">{t("exportCsv")}</Link>} />
      <Panel title={t("completedSessions")} subtitle={t("recordedSessions", { count: result.total })}>
        <form className={styles.filterBar} method="get">
          <input aria-label={t("searchSessionUser")} className={styles.filterInput} defaultValue={query} name="q" placeholder={t("searchSessionUser")} />
          <select aria-label={t("filterActivity")} className={styles.filterSelect} defaultValue={activity} name="activity">
            <option value="all">{t("allActivities")}</option>
            <option value="watering">{t("activityType.watering")}</option>
            <option value="collect_bugs">{t("activityType.collect_bugs")}</option>
            <option value="snapshot">{t("activityType.snapshot")}</option>
            <option value="catch_fish">{t("activityType.catch_fish")}</option>
            <option value="pluck_fruit">{t("activityType.pluck_fruit")}</option>
          </select>
          <select aria-label={t("filterPeriod")} className={styles.filterSelect} defaultValue={String(days)} name="days">
            <option value="7">{t("lastDays", { count: 7 })}</option>
            <option value="30">{t("lastDays", { count: 30 })}</option>
            <option value="42">{t("lastSixWeeks")}</option>
            <option value="90">{t("lastDays", { count: 90 })}</option>
            <option value="365">{t("lastYear")}</option>
          </select>
          <button className={styles.secondaryButton} type="submit">{t("applyFilters")}</button>
        </form>
        {result.items.length ? (
          <TableShell>
            <thead><tr><th>{t("session")}</th><th>{t("user")}</th><th>{t("completed")}</th><th>{t("activity")}</th><th>{t("duration")}</th><th>{t("leftRight")}</th><th>{t("success")}</th><th>{t("result")}</th></tr></thead>
            <tbody>
              {result.items.map((session) => (
                <tr key={session.id}>
                  <td><strong>{shortId(session.id)}</strong></td>
                  <td><Link className={styles.personCell} href={`/admin/dashboard/users/${encodeURIComponent(session.userid)}`}><Avatar name={session.userName} size="small" /><strong>{session.userName}</strong></Link></td>
                  <td>{formatDateTime(session.completedAt, locale)}</td>
                  <td>{t(`activityType.${session.activityType}`)}</td>
                  <td>{formatDuration(session.durationSeconds, locale)}</td>
                  <td>{session.leftRepetitions === null ? "—" : number.format(session.leftRepetitions)} / {session.rightRepetitions === null ? "—" : number.format(session.rightRepetitions)}</td>
                  <td>{supportsAttemptSuccess(session.activityType) ? successDisplay(session.successfulActions, session.totalAttempts, locale) : "—"}</td>
                  <td>{sessionResult(session.resultMetadata, t("completed"))}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : <EmptyState>{t("noMatchingSessions")}</EmptyState>}
        <nav className={styles.pagination} aria-label={t("sessionsPagination")}>
          {page > 1 ? <Link href={href(query, activity, days, page - 1)}>{t("previous")}</Link> : <span />}
          <span>{t("pageOf", { page, pages: result.pageCount })}</span>
          {page < result.pageCount ? <Link href={href(query, activity, days, page + 1)}>{t("next")}</Link> : <span />}
        </nav>
      </Panel>
    </>
  );
}

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function validActivity(value?: string): ActivityType | "all" { return value === "watering" || value === "collect_bugs" || value === "snapshot" || value === "catch_fish" || value === "pluck_fruit" ? value : "all"; }
function validDays(value?: string) { const days = Number(value); return [7, 30, 42, 90, 365].includes(days) ? days : 42; }
function shortId(id: string) { return id.startsWith("legacy-") ? id.slice(0, 18) : id.slice(0, 8); }
function supportsAttemptSuccess(activityType: ActivityType) { return activityType === "collect_bugs" || activityType === "catch_fish"; }
function successDisplay(success: number | null, total: number | null, locale: SupportedLocale) {
  if (success === null || total === null) return "—";
  const formatted = `${new Intl.NumberFormat(locale).format(success)} / ${new Intl.NumberFormat(locale).format(total)}`;
  return total > 0 ? `${formatted} (${new Intl.NumberFormat(locale, { style: "percent" }).format(success / total)})` : formatted;
}
function sessionResult(metadata: Record<string, unknown>, completed: string) { const reward = metadata.flowerAsset ?? metadata.bugAsset ?? metadata.fruitKind ?? metadata.fishKind; return typeof reward === "string" ? reward.replace(/\.glb$/i, "") : completed; }
function href(q: string, activity: string, days: number, page: number) { const params = new URLSearchParams({ activity, days: String(days), page: String(page) }); if (q) params.set("q", q); return `/admin/dashboard/sessions?${params}`; }
