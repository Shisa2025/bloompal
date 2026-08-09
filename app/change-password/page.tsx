import { requireSignedInAccount } from "@/lib/auth";
import PasswordInput from "../components/PasswordInput";
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
            <div className="signup-field">
              <label htmlFor="current-password">Current password</label>
              <PasswordInput className="login-input" id="current-password" name="currentPassword" autoComplete="current-password" required />
            </div>
          ) : null}
          <div className="signup-field">
            <label htmlFor="new-password">New password</label>
            <PasswordInput className="login-input" id="new-password" name="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="signup-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <PasswordInput className="login-input" id="confirm-password" name="confirmation" autoComplete="new-password" minLength={8} required />
          </div>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button className="login-button" type="submit">Save password</button>
        </form>
      </section>
    </main>
  );
}
