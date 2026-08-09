import Link from "next/link";
import DesktopOnly from "../components/DesktopOnly";
import PasswordInput from "../components/PasswordInput";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    role?: string | string[];
  }>;
};

const loginErrorMessages: Record<string, string> = {
  invalid: "The account type, ID/email, or password is incorrect.",
  database: "Unable to connect to the database. Please try again later.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const requestedRole = Array.isArray(params?.role) ? params.role[0] : params?.role;
  const role = requestedRole === "admin" ? "admin" : "user";
  const errorMessage = errorCode ? loginErrorMessages[errorCode] : undefined;

  return (
    <DesktopOnly>
      <section className="login-scene flex min-h-screen flex-1 items-center justify-center bg-[#fbfaf4] px-10 py-12 font-sans text-[#1d2b22]">
        <main className="login-layout">
          <section className="login-brand-panel" aria-label="BloomPal preview">
            <div className="login-brand-copy">
              <p className="login-kicker">BloomPal</p>
              <h1>Grow happier plants with a softer routine.</h1>
              <p>Play guided hand-motion activities and keep every achievement in your garden.</p>
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
              <div className="care-preview-card care-preview-water"><span className="care-icon care-icon-drop" /><div><strong>Motion games</strong><span>Grow with practice</span></div></div>
              <div className="care-preview-card care-preview-light"><span className="care-icon care-icon-sun" /><div><strong>Real progress</strong><span>Saved securely</span></div></div>
            </div>
          </section>

          <section className="login-form-panel" aria-label="Sign in">
            <div className="login-heading">
              <p className="login-kicker">Welcome back</p>
              <h2>{role === "admin" ? "Admin sign in" : "User sign in"}</h2>
              <p>{role === "admin" ? "Manage your users and activity." : "Return to your BloomPal garden."}</p>
            </div>

            <div className="login-account-tabs" aria-label="Account type">
              <Link className={role === "user" ? "is-active" : ""} href="/login?role=user">User</Link>
              <Link className={role === "admin" ? "is-active" : ""} href="/login?role=admin">Admin</Link>
            </div>

            <form action={loginAction} className="login-panel flex flex-col gap-5" aria-label={`${role} sign in`}>
              <input name="accountRole" type="hidden" value={role} />
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-[#304536]" htmlFor="identifier">User ID or email</label>
                <input className="login-input" id="identifier" name="identifier" type="text" autoComplete="username" required />
              </div>
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-[#304536]" htmlFor="password">Password</label>
                <PasswordInput className="login-input" id="password" name="password" autoComplete="current-password" required />
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-[#4c6253]"><input className="h-4 w-4 rounded border-[#b9c7b8] accent-[#52735a]" name="remember" type="checkbox" />Remember me</label>
                <span className="text-[#718078]">No email recovery yet</span>
              </div>
              {errorMessage ? <p className="login-error" role="alert">{errorMessage}</p> : null}
              <button className="login-button" type="submit">Sign in as {role === "admin" ? "Admin" : "User"}</button>
              <p className="text-center text-sm text-[#5f6f63]">
                Need an account?{" "}<Link className="font-semibold text-[#52735a]" href={`/signup?role=${role}`}>Create {role === "admin" ? "an Admin" : "a User"} account</Link>
              </p>
            </form>
          </section>
        </main>
      </section>
    </DesktopOnly>
  );
}
