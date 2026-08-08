import Link from "next/link";
import { connection } from "next/server";
import { getAssignableAdmins, type AssignableAdmin } from "@/database/users";
import DesktopOnly from "../components/DesktopOnly";
import AdminCombobox from "./AdminCombobox";
import { signupAction } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedRole = Array.isArray(params?.role) ? params.role[0] : params?.role;
  const role = requestedRole === "admin" ? "admin" : "user";
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  let admins: AssignableAdmin[] = [];

  if (role === "user") {
    await connection();
    admins = await getAssignableAdmins();
  }

  return (
    <DesktopOnly>
      <section className="login-scene flex min-h-screen items-center justify-center bg-[#fbfaf4] px-10 py-12 font-sans text-[#1d2b22]">
        <main className="signup-card">
          <div className="login-heading">
            <p className="login-kicker">BloomPal</p>
            <h1>Create {role === "admin" ? "an Admin" : "a User"} account</h1>
            <p>{role === "admin" ? "Your organization and registration code are required." : "Choose an Admin now, or continue without one."}</p>
          </div>
          <div className="login-account-tabs" aria-label="Account type">
            <Link className={role === "user" ? "is-active" : ""} href="/signup?role=user">User</Link>
            <Link className={role === "admin" ? "is-active" : ""} href="/signup?role=admin">Admin</Link>
          </div>
          <form action={signupAction} className="login-panel flex flex-col gap-4">
            <input name="accountRole" type="hidden" value={role} />
            <label className="signup-field">User ID<input className="login-input" name="userid" pattern="[a-z0-9][a-z0-9._-]{2,29}" placeholder="e.g. bloom-user" required /></label>
            <label className="signup-field">Name<input className="login-input" name="displayName" required /></label>
            <label className="signup-field">Email<input className="login-input" name="email" type="email" autoComplete="email" required /></label>
            <label className="signup-field">Password<input className="login-input" name="password" type="password" autoComplete="new-password" minLength={8} required /><small>At least 8 characters with a letter and number.</small></label>
            {role === "admin" ? (
              <>
                <label className="signup-field">
                  Organization
                  <input className="login-input" name="organization" minLength={2} maxLength={120} autoComplete="organization" required />
                </label>
                <label className="signup-field">Admin registration code<input className="login-input" name="adminCode" type="password" required /></label>
              </>
            ) : (
              <AdminCombobox admins={admins} />
            )}
            {error ? <p className="login-error" role="alert">{error}</p> : null}
            <button className="login-button" type="submit">Create account</button>
            <p className="text-center text-sm text-[#5f6f63]">Already registered? <Link className="font-semibold text-[#52735a]" href={`/login?role=${role}`}>Sign in</Link></p>
          </form>
        </main>
      </section>
    </DesktopOnly>
  );
}
