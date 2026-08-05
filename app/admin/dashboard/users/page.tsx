import Link from "next/link";
import { listManagedUsers } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, EmptyState, PageHeader, Panel, StatusBadge, TableShell } from "../_components/ui";
import { formatDate, formatDateTime } from "../_lib/format";
import styles from "../dashboard.module.css";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const query = value(params?.q);
  const requestedStatus = value(params?.status);
  const status = requestedStatus === "active" || requestedStatus === "disabled" ? requestedStatus : "all";
  const page = Math.max(1, Number(value(params?.page)) || 1);
  const notice = value(params?.notice);
  const result = await listManagedUsers(admin.userid, { query, status, page });

  return (
    <>
      <PageHeader eyebrow="Account management" title="Users" description="Create and manage the users assigned to your Admin account." action={<Link className={styles.secondaryButton} href="/admin/dashboard/users/new">Create user</Link>} />
      {notice ? <p className={styles.noticeBanner}>{notice}</p> : null}
      <Panel title="Managed users" subtitle={`${result.total} assigned user${result.total === 1 ? "" : "s"}`}>
        <form className={styles.filterBar} method="get">
          <input className={styles.filterInput} defaultValue={query} name="q" placeholder="Search name, ID, or email" aria-label="Search users" />
          <select className={styles.filterSelect} defaultValue={status} name="status" aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
          <button className={styles.secondaryButton} type="submit">Apply filters</button>
        </form>
        {result.items.length ? (
          <TableShell>
            <thead><tr><th>User</th><th>Created</th><th>Last activity</th><th>Sessions</th><th>Rewards</th><th>Status</th><th /></tr></thead>
            <tbody>{result.items.map((user) => (
              <tr key={user.userid}>
                <td><div className={styles.personCell}><Avatar name={user.displayName} /><div><strong>{user.displayName}</strong><span>{user.userid} · {user.email}</span></div></div></td>
                <td>{formatDate(user.createdAt)}</td><td>{user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "—"}</td><td>{user.sessionCount}</td><td>{user.flowerCount + user.bugCount + user.snapshotCount}</td>
                <td><StatusBadge tone={user.status === "active" ? "success" : "neutral"}>{user.status}</StatusBadge>{user.mustChangePassword ? <small className={styles.inlineHint}>Password change due</small> : null}</td>
                <td><Link className={styles.tableAction} href={`/admin/dashboard/users/${encodeURIComponent(user.userid)}`}>View</Link></td>
              </tr>
            ))}</tbody>
          </TableShell>
        ) : <EmptyState>No users match the current filters.</EmptyState>}
        <nav className={styles.pagination} aria-label="Users pagination">
          {page > 1 ? <Link href={pageHref(query, status, page - 1)}>Previous</Link> : <span />}
          <span>Page {page} of {result.pageCount}</span>
          {page < result.pageCount ? <Link href={pageHref(query, status, page + 1)}>Next</Link> : <span />}
        </nav>
      </Panel>
    </>
  );
}

function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] ?? "" : input ?? ""; }
function pageHref(query: string, status: string, page: number) { const params = new URLSearchParams({ page: String(page) }); if (query) params.set("q", query); if (status !== "all") params.set("status", status); return `/admin/dashboard/users?${params}`; }
