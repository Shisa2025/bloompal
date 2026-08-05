import { requireSignedInAccount } from "@/lib/auth";
import { changePasswordAction } from "./actions";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  const account = await requireSignedInAccount();
  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  return (
    <main className="account-form-page">
      <section className="signup-card">
        <div className="login-heading">
          <p className="login-kicker">Account security</p>
          <h1>{account.mustChangePassword ? "Create your own password" : "Change password"}</h1>
          <p>Signed in as {account.displayName}.</p>
        </div>
        <form action={changePasswordAction} className="login-panel flex flex-col gap-4">
          {!account.mustChangePassword ? (
            <label className="signup-field">Current password<input className="login-input" name="currentPassword" type="password" autoComplete="current-password" required /></label>
          ) : null}
          <label className="signup-field">New password<input className="login-input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label className="signup-field">Confirm password<input className="login-input" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button className="login-button" type="submit">Save password</button>
        </form>
      </section>
    </main>
  );
}
