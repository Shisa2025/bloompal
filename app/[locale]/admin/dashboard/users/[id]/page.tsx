import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import PasswordInput from "@/app/components/PasswordInput";
import { getManagedUser } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, Panel, StatusBadge, TableShell } from "@/app/admin/dashboard/_components/ui";
import { formatDateTime, formatDuration } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { releaseManagedUserAction, resetManagedPasswordAction, setManagedUserStatusAction, updateManagedUserAction } from "@/app/admin/dashboard/users/actions";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";
import { isErrorCode, isNoticeCode } from "@/lib/message-codes";
import {
  getCatalogAssetBySource,
  type AssetCategory,
  type AssetNameKey,
} from "@/lib/asset-catalog";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>;
}) {
  const admin = await requireAdmin();
  const locale = (await getLocale()) as SupportedLocale;
  const t = await getTranslations("Admin");
  const tErrors = await getTranslations("Errors");
  const tNotices = await getTranslations("Notices");
  const tAssets = await getTranslations("Assets");
  const number = new Intl.NumberFormat(locale);
  const { id } = await params;
  const result = await getManagedUser(admin.userid, id);
  if (!result) notFound();

  const query = await searchParams;
  const noticeCode = one(query?.notice);
  const errorCode = one(query?.error);
  const notice = isNoticeCode(noticeCode) ? tNotices(noticeCode) : undefined;
  const error = isErrorCode(errorCode) ? tErrors(errorCode) : undefined;
  const { user, sessions, activityBreakdown } = result;
  const daysSinceActivity = user.lastActivityAt ? daysSince(user.lastActivityAt) : null;

  return (
    <>
      <section className={styles.profileHero}>
        <div className={styles.profileIdentity}>
          <Avatar name={user.displayName} size="large" />
          <div>
            <p className={styles.eyebrow}>{t("managedUser")}</p>
            <h1>{user.displayName}</h1>
            <p>{user.userid} · {user.email}</p>
            <div className={styles.profileBadges}>
              <StatusBadge tone={user.status === "active" ? "success" : "neutral"}>{t(`status.${user.status}`)}</StatusBadge>
              {user.mustChangePassword ? <StatusBadge tone="warning">{t("passwordChangeDue")}</StatusBadge> : null}
            </div>
          </div>
        </div>
        <Link className={styles.secondaryButton} href="/admin/dashboard/users">{t("backToUsers")}</Link>
      </section>

      {notice ? <p className={styles.noticeBanner}>{notice}</p> : null}
      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}

      <section className={styles.statsGrid} aria-label={t("userActivityMetrics")}>
        <article className={styles.motionMetric}><span>{t("sessions")}</span><strong>{number.format(user.sessionCount)}</strong><small>{t("completedActivities")}</small></article>
        <article className={styles.motionMetric}><span>{t("averageDuration")}</span><strong>{formatDuration(user.averageDurationSeconds, locale)}</strong><small>{t("sessionsWithTiming")}</small></article>
        <article className={styles.motionMetric}><span>{t("flowers")}</span><strong>{number.format(user.flowerCount)}</strong><small>{t("wateringRewards")}</small></article>
        <article className={styles.motionMetric}><span>{t("fruits")}</span><strong>{number.format(user.fruitCount)}</strong><small>{t("fruitRewards")}</small></article>
        <article className={styles.motionMetric}><span>{t("fish")}</span><strong>{number.format(user.fishCount)}</strong><small>{t("fishRewards")}</small></article>
        <article className={styles.motionMetric}><span>{t("bugs")}</span><strong>{number.format(user.bugCount)}</strong><small>{t("collectedRewards")}</small></article>
        <article className={styles.motionMetric}><span>{t("snapshots")}</span><strong>{number.format(user.snapshotCount)}</strong><small>{t("savedGardenMoments")}</small></article>
        <article className={styles.motionMetric}><span>{t("daysSinceLastActivity")}</span><strong>{daysSinceActivity === null ? "—" : number.format(daysSinceActivity)}</strong><small>{user.lastActivityAt ? formatDateTime(user.lastActivityAt, locale) : t("noActivityYet")}</small></article>
      </section>

      <div className={styles.profileGrid}>
        <div>
          <Panel title={t("sessionHistory")} subtitle={t("realCompletedActivity")}>
            {sessions.length ? (
              <TableShell>
                <thead><tr><th>{t("completed")}</th><th>{t("activity")}</th><th>{t("duration")}</th><th>{t("leftRight")}</th><th>{t("result")}</th></tr></thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{formatDateTime(session.completedAt, locale)}</td>
                      <td>{t(`activityType.${session.activityType}`)}</td>
                      <td>{formatDuration(session.durationSeconds, locale)}</td>
                      <td>{session.leftRepetitions === null ? "—" : number.format(session.leftRepetitions)} / {session.rightRepetitions === null ? "—" : number.format(session.rightRepetitions)}</td>
                      <td>{sessionResult(session.resultMetadata, t("completed"), tAssets)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            ) : <p className={styles.emptyState}>{t("noCompletedSessionsYet")}</p>}
          </Panel>
        </div>
        <div>
          <Panel title={t("activityBreakdown")} subtitle={t("completedSessionsByGame")}>
            <div className={styles.metricList}>
              {activityBreakdown.length ? activityBreakdown.map((activity) => (
                <div className={styles.metricRow} key={activity.activityType}>
                  <span>{t(`activityType.${activity.activityType}`)} · {formatDuration(activity.averageDurationSeconds, locale)}</span>
                  <strong>{number.format(activity.value)}</strong>
                </div>
              )) : <p className={styles.emptyState}>{t("noCompletedSessionsYet")}</p>}
            </div>
          </Panel>
          <Panel className={styles.sectionGap} title={t("accountDetails")} subtitle={t("editContact")}>
            <form action={updateManagedUserAction} className={styles.adminForm}>
              <input name="userid" type="hidden" value={user.userid} />
              <label>{t("name")}<input defaultValue={user.displayName} name="displayName" required /></label>
              <label>{t("email")}<input defaultValue={user.email} name="email" type="email" required /></label>
              <button className={styles.secondaryButton} type="submit">{t("saveDetails")}</button>
            </form>
          </Panel>
          <Panel className={styles.sectionGap} title={t("resetPassword")} subtitle={t("resetPasswordDescription")}>
            <form action={resetManagedPasswordAction} className={styles.adminForm}>
              <input name="userid" type="hidden" value={user.userid} />
              <div className={styles.adminFormField}>
                <label htmlFor="reset-managed-user-password">{t("temporaryPassword")}</label>
                <PasswordInput id="reset-managed-user-password" name="password" minLength={8} required />
              </div>
              <button className={styles.secondaryButton} type="submit">{t("resetPassword")}</button>
            </form>
          </Panel>
          <Panel className={styles.sectionGap} title={t("accountAccess")} subtitle={t("actionsScoped")}>
            <div className={styles.accountActions}>
              <form action={setManagedUserStatusAction}>
                <input name="userid" type="hidden" value={user.userid} />
                <input name="status" type="hidden" value={user.status === "active" ? "disabled" : "active"} />
                <button className={styles.secondaryButton} type="submit">{user.status === "active" ? t("disableSignOut") : t("enableUser")}</button>
              </form>
              <form action={releaseManagedUserAction}>
                <input name="userid" type="hidden" value={user.userid} />
                <button className={styles.dangerButton} type="submit">{t("releaseFromAdmin")}</button>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function sessionResult(
  metadata: Record<string, unknown>,
  completed: string,
  translateAsset: (key: AssetNameKey) => string,
) {
  const sources: Array<[AssetCategory, unknown]> = [
    ["flower", metadata.flowerAsset],
    ["bug", metadata.bugAsset],
    ["fish", metadata.fishKind],
    ["fruit", metadata.fruitKind],
  ];
  for (const [category, source] of sources) {
    if (typeof source !== "string") continue;
    const asset = getCatalogAssetBySource(category, source);
    return asset ? translateAsset(asset.nameKey) : source;
  }
  return completed;
}
function daysSince(date: string) { return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)); }
