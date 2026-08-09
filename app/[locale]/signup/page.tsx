import { connection } from "next/server";
import { getAssignableAdmins, type AssignableAdmin } from "@/database/users";
import { Link } from "@/i18n/navigation";
import DesktopOnly from "@/app/components/DesktopOnly";
import PasswordInput from "@/app/components/PasswordInput";
import AdminCombobox from "@/app/signup/AdminCombobox";
import { signupAction } from "@/app/signup/actions";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";
import { isErrorCode } from "@/lib/message-codes";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string | string[]; error?: string | string[] }>;
}) {
  const t = await getTranslations("Auth");
  const tErrors = await getTranslations("Errors");
  const params = await searchParams;
  const requestedRole = Array.isArray(params?.role) ? params.role[0] : params?.role;
  const role = requestedRole === "admin" ? "admin" : "user";
  const errorCode = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const error = isErrorCode(errorCode) ? tErrors(errorCode) : undefined;
  let admins: AssignableAdmin[] = [];

  if (role === "user") {
    await connection();
    admins = await getAssignableAdmins();
  }

  return (
    <DesktopOnly>
      <section className="login-scene flex min-h-screen items-center justify-center bg-[#fbfaf4] px-10 py-12 font-sans text-[#1d2b22]">
        <main className="signup-card">
          <LocaleSwitcher />
          <div className="login-heading">
            <p className="login-kicker">BloomPal</p>
            <h1>{role === "admin" ? t("createAdminAccount") : t("createUserAccount")}</h1>
            <p>{role === "admin" ? t("adminSignupDescription") : t("userSignupDescription")}</p>
          </div>
          <div className="login-account-tabs" aria-label={t("accountType")}>
            <Link className={role === "user" ? "is-active" : ""} href="/signup?role=user">{t("user")}</Link>
            <Link className={role === "admin" ? "is-active" : ""} href="/signup?role=admin">{t("admin")}</Link>
          </div>
          <form action={signupAction} className="login-panel flex flex-col gap-4">
            <input name="accountRole" type="hidden" value={role} />
            <label className="signup-field">{t("userId")}<input className="login-input" name="userid" pattern="[a-z0-9][a-z0-9._-]{2,29}" placeholder={t("userIdPlaceholder")} required /></label>
            <label className="signup-field">{t("name")}<input className="login-input" name="displayName" required /></label>
            <label className="signup-field">{t("email")}<input className="login-input" name="email" type="email" autoComplete="email" required /></label>
            <div className="signup-field">
              <label htmlFor="signup-password">{t("password")}</label>
              <PasswordInput className="login-input" id="signup-password" name="password" autoComplete="new-password" minLength={8} required />
              <small>{t("passwordHint")}</small>
            </div>
            {role === "admin" ? (
              <>
                <label className="signup-field">
                  {t("organization")}
                  <input className="login-input" name="organization" minLength={2} maxLength={120} autoComplete="organization" required />
                </label>
                <div className="signup-field">
                  <label htmlFor="admin-registration-code">{t("adminRegistrationCode")}</label>
                  <PasswordInput className="login-input" id="admin-registration-code" name="adminCode" required />
                </div>
              </>
            ) : (
              <AdminCombobox admins={admins} />
            )}
            {error ? <p className="login-error" role="alert">{error}</p> : null}
            <button className="login-button" type="submit">{t("createAccount")}</button>
            <p className="text-center text-sm text-[#5f6f63]">{t("alreadyRegistered")} <Link className="font-semibold text-[#52735a]" href={`/login?role=${role}`}>{t("signIn")}</Link></p>
          </form>
        </main>
      </section>
    </DesktopOnly>
  );
}
