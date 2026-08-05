import Link from "next/link";
import { PageHeader, Panel } from "../../_components/ui";
import styles from "../../dashboard.module.css";
import { createManagedUserAction } from "../actions";

export default async function NewUserPage({ searchParams }: { searchParams?: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  return (
    <>
      <PageHeader eyebrow="Account management" title="Create user" description="The new user will be assigned to your Admin account and must replace the temporary password on first sign-in." action={<Link className={styles.secondaryButton} href="/admin/dashboard/users">Cancel</Link>} />
      <Panel title="User account" subtitle="User IDs cannot be changed later">
        <form action={createManagedUserAction} className={styles.adminForm}>
          <label>User ID<input name="userid" pattern="[a-z0-9][a-z0-9._-]{2,29}" required /><small>3–30 lowercase letters, numbers, dots, underscores, or hyphens.</small></label>
          <label>Name<input name="displayName" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Temporary password<input name="password" type="password" minLength={8} required /><small>At least 8 characters with a letter and number.</small></label>
          {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="submit">Create assigned user</button>
        </form>
      </Panel>
    </>
  );
}
