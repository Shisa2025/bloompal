import { Link } from "@/i18n/navigation";
import DesktopOnly from "@/app/components/DesktopOnly";
import PasswordInput from "@/app/components/PasswordInput";
import { loginAction } from "@/app/login/actions";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";
import { isErrorCode } from "@/lib/message-codes";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    role?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations("Auth");
  const tErrors = await getTranslations("Errors");
  const params = await searchParams;
  const errorCode = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const requestedRole = Array.isArray(params?.role) ? params.role[0] : params?.role;
  const role = requestedRole === "admin" ? "admin" : "user";
  const errorMessage = isErrorCode(errorCode) ? tErrors(errorCode) : undefined;
  const roleLabel = role === "admin" ? t("admin") : t("user");

  return (
    <DesktopOnly>
      <section className="login-scene flex min-h-screen flex-1 items-center justify-center bg-[#fbfaf4] px-10 py-12 font-sans text-[#1d2b22]">
        <main className="login-layout">
          <section className="login-brand-panel" aria-label={t("brandPreview")}>
            <div className="login-brand-copy">
              <p className="login-kicker">BloomPal</p>
              <h1>{t("brandHeadline")}</h1>
              <p>{t("brandDescription")}</p>
            </div>
            <div className="cute-garden" aria-hidden="true">
              <div className="plant-pot">
                <span className="plant-stem" /><span className="plant-leaf plant-leaf-left" />
                <span className="plant-leaf plant-leaf-right" /><span className="plant-leaf plant-leaf-top" />
                <span className="plant-flower plant-flower-one" /><span className="plant-flower plant-flower-two" />
                <span className="pot-base" />
              </div>
              <div className="garden-pet">
                <span className="pet-ear pet-ear-left" /><span className="pet-ear pet-ear-right" />
                <span className="pet-head" /><span className="pet-eye pet-eye-left" />
                <span className="pet-eye pet-eye-right" /><span className="pet-nose" />
              </div>
              <div className="care-preview-card care-preview-water"><span className="care-icon care-icon-drop" /><div><strong>{t("motionGames")}</strong><span>{t("growWithPractice")}</span></div></div>
              <div className="care-preview-card care-preview-light"><span className="care-icon care-icon-sun" /><div><strong>{t("realProgress")}</strong><span>{t("savedSecurely")}</span></div></div>
            </div>
          </section>

          <section className="login-form-panel" aria-label={t("signIn")}>
            <LocaleSwitcher />
            <div className="login-heading">
              <p className="login-kicker">{t("welcomeBack")}</p>
              <h2>{role === "admin" ? t("adminSignIn") : t("userSignIn")}</h2>
              <p>{role === "admin" ? t("adminSignInDescription") : t("userSignInDescription")}</p>
            </div>

            <div className="login-account-tabs" aria-label={t("accountType")}>
              <Link className={role === "user" ? "is-active" : ""} href="/login?role=user">{t("user")}</Link>
              <Link className={role === "admin" ? "is-active" : ""} href="/login?role=admin">{t("admin")}</Link>
            </div>

            <form action={loginAction} className="login-panel flex flex-col gap-5" aria-label={t("roleSignIn", { role: roleLabel })}>
              <input name="accountRole" type="hidden" value={role} />
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-[#304536]" htmlFor="identifier">{t("identifier")}</label>
                <input className="login-input" id="identifier" name="identifier" type="text" autoComplete="username" required />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-[#304536]" htmlFor="password">{t("password")}</label>
                <PasswordInput className="login-input" id="password" name="password" autoComplete="current-password" required />
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-[#4c6253]"><input className="h-4 w-4 rounded border-[#b9c7b8] accent-[#52735a]" name="remember" type="checkbox" />{t("rememberMe")}</label>
                <span className="text-[#718078]">{t("noEmailRecovery")}</span>
              </div>
              {errorMessage ? <p className="login-error" role="alert">{errorMessage}</p> : null}
              <button className="login-button" type="submit">{t("signInAs", { role: roleLabel })}</button>
              <p className="text-center text-sm text-[#5f6f63]">
                {t("needAccount")} {" "}<Link className="font-semibold text-[#52735a]" href={`/signup?role=${role}`}>{role === "admin" ? t("createAdminAccount") : t("createUserAccount")}</Link>
              </p>
            </form>
          </section>
        </main>
      </section>
    </DesktopOnly>
  );
}
