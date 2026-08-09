import { Link } from "@/i18n/navigation";
import PasswordInput from "@/app/components/PasswordInput";
import { PageHeader, Panel } from "@/app/admin/dashboard/_components/ui";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { createManagedUserAction } from "@/app/admin/dashboard/users/actions";
import { getTranslations } from "next-intl/server";
import { isErrorCode } from "@/lib/message-codes";

export default async function NewUserPage({ searchParams }: { searchParams?: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  const t = await getTranslations("Admin"); const tErrors = await getTranslations("Errors");
  const errorCode = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const error = isErrorCode(errorCode) ? tErrors(errorCode) : undefined;
  return (
    <>
      <PageHeader eyebrow={t("accountManagement")} title={t("createUser")} description={t("createUserDescription")} action={<Link className={styles.secondaryButton} href="/admin/dashboard/users">{t("cancel")}</Link>} />
      <Panel title={t("userAccount")} subtitle={t("userIdImmutable")}>
        <form action={createManagedUserAction} className={styles.adminForm}>
          <label>{t("userId")}<input name="userid" pattern="[a-z0-9][a-z0-9._-]{2,29}" required /><small>{t("userIdRule")}</small></label>
          <label>{t("name")}<input name="displayName" required /></label>
          <label>{t("email")}<input name="email" type="email" required /></label>
          <div className={styles.adminFormField}>
            <label htmlFor="managed-user-password">{t("temporaryPassword")}</label>
            <PasswordInput id="managed-user-password" name="password" minLength={8} required />
            <small>{t("passwordRule")}</small>
          </div>
          {error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}
          <button className={styles.primaryButton} type="submit">{t("createAssignedUser")}</button>
        </form>
      </Panel>
    </>
  );
}
