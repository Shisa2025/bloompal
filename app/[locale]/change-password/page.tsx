import { requireSignedInAccount } from "@/lib/auth";
import PasswordInput from "@/app/components/PasswordInput";
import { changePasswordAction } from "@/app/change-password/actions";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";
import { isErrorCode } from "@/lib/message-codes";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const t = await getTranslations("Auth");
  const tErrors = await getTranslations("Errors");
  const account = await requireSignedInAccount();
  const params = await searchParams;
  const errorCode = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const error = isErrorCode(errorCode) ? tErrors(errorCode) : undefined;

  return (
    <main className="account-form-page">
      <section className="signup-card">
        <LocaleSwitcher />
        <div className="login-heading">
          <p className="login-kicker">{t("accountSecurity")}</p>
          <h1>{account.mustChangePassword ? t("createOwnPassword") : t("changePassword")}</h1>
          <p>{t("signedInAs", { name: account.displayName })}</p>
        </div>
        <form action={changePasswordAction} className="login-panel flex flex-col gap-4">
          {!account.mustChangePassword ? (
            <div className="signup-field">
              <label htmlFor="current-password">{t("currentPassword")}</label>
              <PasswordInput className="login-input" id="current-password" name="currentPassword" autoComplete="current-password" required />
            </div>
          ) : null}
          <div className="signup-field">
            <label htmlFor="new-password">{t("newPassword")}</label>
            <PasswordInput className="login-input" id="new-password" name="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="signup-field">
            <label htmlFor="confirm-password">{t("confirmPassword")}</label>
            <PasswordInput className="login-input" id="confirm-password" name="confirmation" autoComplete="new-password" minLength={8} required />
          </div>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button className="login-button" type="submit">{t("savePassword")}</button>
        </form>
      </section>
    </main>
  );
}
