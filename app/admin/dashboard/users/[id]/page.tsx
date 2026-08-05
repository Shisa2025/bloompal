import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedUser } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { Avatar, Panel, StatusBadge, TableShell } from "../../_components/ui";
import { activityLabel, formatDate, formatDateTime, formatDuration } from "../../_lib/format";
import styles from "../../dashboard.module.css";
import { releaseManagedUserAction, resetManagedPasswordAction, setManagedUserStatusAction, updateManagedUserAction } from "../actions";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const result = await getManagedUser(admin.userid, id);
  if (!result) notFound();
  const query = await searchParams;
  const notice = one(query?.notice);
  const error = one(query?.error);
  const { user, sessions } = result;

  return (
    <>
      <section className={styles.profileHero}>
        <div className={styles.profileIdentity}><Avatar name={user.displayName} size="large" /><div><p className={styles.eyebrow}>Managed user</p><h1>{user.displayName}</h1><p>{user.userid} · {user.email}</p><div className={styles.profileBadges}><StatusBadge tone={user.status === "active" ? "success" : "neutral"}>{user.status}</StatusBadge>{user.mustChangePassword ? <StatusBadge tone="warning">Password change due</StatusBadge> : null}</div></div></div>
        <Link className={styles.secondaryButton} href="/admin/dashboard/users">Back to users</Link>
      </section>
      {notice ? <p className={styles.noticeBanner}>{notice}</p> : null}
      {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}
      <section className={styles.statsGrid} aria-label="User activity metrics">
        <article className={styles.motionMetric}><span>Sessions</span><strong>{user.sessionCount}</strong><small>Completed activities</small></article>
        <article className={styles.motionMetric}><span>Flowers</span><strong>{user.flowerCount}</strong><small>Watering rewards</small></article>
        <article className={styles.motionMetric}><span>Bugs</span><strong>{user.bugCount}</strong><small>Collected rewards</small></article>
        <article className={styles.motionMetric}><span>Snapshots</span><strong>{user.snapshotCount}</strong><small>Saved garden moments</small></article>
        <article className={styles.motionMetric}><span>Last activity</span><strong className={styles.compactMetric}>{user.lastActivityAt ? formatDate(user.lastActivityAt) : "—"}</strong><small>{user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "No activity yet"}</small></article>
        <article className={styles.motionMetric}><span>Created</span><strong className={styles.compactMetric}>{formatDate(user.createdAt)}</strong><small>{user.lastLoginAt ? `Last login ${formatDate(user.lastLoginAt)}` : "Never signed in"}</small></article>
      </section>
      <div className={styles.profileGrid}>
        <div><Panel title="Session history" subtitle="Real completed game activity">
          {sessions.length ? <TableShell><thead><tr><th>Completed</th><th>Activity</th><th>Duration</th><th>Left / right</th><th>Result</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td>{formatDateTime(session.completedAt)}</td><td>{activityLabel(session.activityType)}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.leftRepetitions ?? "—"} / {session.rightRepetitions ?? "—"}</td><td>{sessionResult(session.resultMetadata)}</td></tr>)}</tbody></TableShell> : <p className={styles.emptyState}>No completed sessions yet.</p>}
        </Panel></div>
        <div>
          <Panel title="Account details" subtitle="Edit contact information"><form action={updateManagedUserAction} className={styles.adminForm}><input name="userid" type="hidden" value={user.userid} /><label>Name<input defaultValue={user.displayName} name="displayName" required /></label><label>Email<input defaultValue={user.email} name="email" type="email" required /></label><button className={styles.secondaryButton} type="submit">Save details</button></form></Panel>
          <Panel className={styles.sectionGap} title="Reset password" subtitle="Signs out existing sessions and requires another change on login"><form action={resetManagedPasswordAction} className={styles.adminForm}><input name="userid" type="hidden" value={user.userid} /><label>Temporary password<input name="password" type="password" minLength={8} required /></label><button className={styles.secondaryButton} type="submit">Reset password</button></form></Panel>
          <Panel className={styles.sectionGap} title="Account access" subtitle="Actions are scoped to this Admin"><div className={styles.accountActions}><form action={setManagedUserStatusAction}><input name="userid" type="hidden" value={user.userid} /><input name="status" type="hidden" value={user.status === "active" ? "disabled" : "active"} /><button className={styles.secondaryButton} type="submit">{user.status === "active" ? "Disable and sign out" : "Enable user"}</button></form><form action={releaseManagedUserAction}><input name="userid" type="hidden" value={user.userid} /><button className={styles.dangerButton} type="submit">Release from this Admin</button></form></div></Panel>
        </div>
      </div>
    </>
  );
}

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function sessionResult(metadata: Record<string, unknown>) { const reward = metadata.flowerAsset ?? metadata.bugAsset; return typeof reward === "string" ? reward.replace(/\.glb$/i, "") : "Completed"; }
