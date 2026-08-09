import { Link } from "@/i18n/navigation";
import { listManagedUsers } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, EmptyState, PageHeader, Panel, StatusBadge, TableShell } from "@/app/admin/dashboard/_components/ui";
import { formatDate, formatDateTime } from "@/app/admin/dashboard/_lib/format";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupportedLocale } from "@/i18n/routing";
import { isNoticeCode } from "@/lib/message-codes";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const locale = (await getLocale()) as SupportedLocale;
  const t = await getTranslations("Admin");
  const tNotices = await getTranslations("Notices");
  const number = new Intl.NumberFormat(locale);
  const params = await searchParams;
  const query = value(params?.q);
  const requestedStatus = value(params?.status);
  const status = requestedStatus === "active" || requestedStatus === "disabled" ? requestedStatus : "all";
  const page = Math.max(1, Number(value(params?.page)) || 1);
  const noticeCode = value(params?.notice);
  const notice = isNoticeCode(noticeCode) ? tNotices(noticeCode) : undefined;
  const result = await listManagedUsers(admin.userid, { query, status, page });

  return (
    <>
      <PageHeader eyebrow={t("accountManagement")} title={t("users")} description={t("usersDescription")} action={<Link className={styles.secondaryButton} href="/admin/dashboard/users/new">{t("createUser")}</Link>} />
      {notice ? <p className={styles.noticeBanner}>{notice}</p> : null}
      <Panel title={t("managedUsers")} subtitle={t("assignedUserCount", { count: result.total })}>
        <form className={styles.filterBar} method="get">
          <input className={styles.filterInput} defaultValue={query} name="q" placeholder={t("searchNameIdEmail")} aria-label={t("searchUsers")} />
          <select className={styles.filterSelect} defaultValue={status} name="status" aria-label={t("filterStatus")}><option value="all">{t("allStatuses")}</option><option value="active">{t("status.active")}</option><option value="disabled">{t("status.disabled")}</option></select>
          <button className={styles.secondaryButton} type="submit">{t("applyFilters")}</button>
        </form>
        {result.items.length ? (
          <TableShell>
            <thead><tr><th>{t("user")}</th><th>{t("created")}</th><th>{t("lastActivityLabel")}</th><th>{t("sessions")}</th><th>{t("rewards")}</th><th>{t("statusLabel")}</th><th /></tr></thead>
            <tbody>{result.items.map((user) => (
              <tr key={user.userid}>
                <td><div className={styles.personCell}><Avatar name={user.displayName} /><div><strong>{user.displayName}</strong><span>{user.userid} · {user.email}</span></div></div></td>
                <td>{formatDate(user.createdAt, locale)}</td><td>{user.lastActivityAt ? formatDateTime(user.lastActivityAt, locale) : "—"}</td><td>{number.format(user.sessionCount)}</td><td>{number.format(user.flowerCount + user.bugCount + user.snapshotCount)}</td>
                <td><StatusBadge tone={user.status === "active" ? "success" : "neutral"}>{t(`status.${user.status}`)}</StatusBadge>{user.mustChangePassword ? <small className={styles.inlineHint}>{t("passwordChangeDue")}</small> : null}</td>
                <td><Link className={styles.tableAction} href={`/admin/dashboard/users/${encodeURIComponent(user.userid)}`}>{t("view")}</Link></td>
              </tr>
            ))}</tbody>
          </TableShell>
        ) : <EmptyState>{t("noMatchingUsers")}</EmptyState>}
        <nav className={styles.pagination} aria-label={t("usersPagination")}>
          {page > 1 ? <Link href={pageHref(query, status, page - 1)}>{t("previous")}</Link> : <span />}
          <span>{t("pageOf", { page, pages: result.pageCount })}</span>
          {page < result.pageCount ? <Link href={pageHref(query, status, page + 1)}>{t("next")}</Link> : <span />}
        </nav>
      </Panel>
    </>
  );
}

function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] ?? "" : input ?? ""; }
function pageHref(query: string, status: string, page: number) { const params = new URLSearchParams({ page: String(page) }); if (query) params.set("q", query); if (status !== "all") params.set("status", status); return `/admin/dashboard/users?${params}`; }
