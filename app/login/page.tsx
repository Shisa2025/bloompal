import DesktopOnly from "../components/DesktopOnly";
import { loginAction } from "./actions";
import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

const loginErrorMessages: Record<string, string> = {
  invalid: "Invalid user ID, email, or password.",
  database: "Unable to connect to the database. Please try again later.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = Array.isArray(params?.error)
    ? params?.error[0]
    : params?.error;
  const errorMessage = errorCode ? loginErrorMessages[errorCode] : undefined;

  return (
    <DesktopOnly>
      <section className="login-scene flex min-h-screen flex-1 items-center justify-center bg-[#fbfaf4] px-10 py-12 font-sans text-[#1d2b22]">
        <main className="login-layout">
          <section className="login-brand-panel" aria-label="BloomPal preview">
            <div className="login-brand-copy">
              <p className="login-kicker">BloomPal</p>
              <h1>Grow happier plants with a softer routine.</h1>
              <p>
                Track watering, notice plant moods, and keep your green corner
                feeling cared for.
              </p>
            </div>

            <div className="cute-garden" aria-hidden="true">
              <div className="plant-pot">
                <span className="plant-stem" />
                <span className="plant-leaf plant-leaf-left" />
                <span className="plant-leaf plant-leaf-right" />
                <span className="plant-leaf plant-leaf-top" />
                <span className="plant-flower plant-flower-one" />
                <span className="plant-flower plant-flower-two" />
                <span className="pot-base" />
              </div>

              <div className="garden-pet">
                <span className="pet-ear pet-ear-left" />
                <span className="pet-ear pet-ear-right" />
                <span className="pet-head" />
                <span className="pet-eye pet-eye-left" />
                <span className="pet-eye pet-eye-right" />
                <span className="pet-nose" />
              </div>

              <div className="care-preview-card care-preview-water">
                <span className="care-icon care-icon-drop" />
                <div>
                  <strong>Water Sunny</strong>
                  <span>Due today</span>
                </div>
              </div>

              <div className="care-preview-card care-preview-light">
                <span className="care-icon care-icon-sun" />
                <div>
                  <strong>Morning light</strong>
                  <span>Bright indirect</span>
                </div>
              </div>
            </div>
          </section>

          <section className="login-form-panel" aria-label="Sign in">
            <div className="login-heading">
              <p className="login-kicker">Welcome back</p>
              <h2>Sign in to BloomPal</h2>
              <p>Care starts with a quick check-in.</p>
            </div>

            <form
              action={loginAction}
              className="login-panel flex flex-col gap-5"
              aria-label="Sign in"
            >
              <fieldset className="login-mode-fieldset">
                <legend>Sign in with</legend>
                <label>
                  <input
                    defaultChecked
                    name="loginMode"
                    type="radio"
                    value="userid"
                  />
                  User ID
                </label>
                <label>
                  <input name="loginMode" type="radio" value="useremail" />
                  Email
                </label>
              </fieldset>

              <div className="flex flex-col gap-2 text-left">
                <label
                  className="text-sm font-medium text-[#304536]"
                  htmlFor="identifier"
                >
                  User ID or email
                </label>
                <input
                  className="login-input"
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="shisa or shisa@a.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 text-left">
                <label
                  className="text-sm font-medium text-[#304536]"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  className="login-input"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-[#4c6253]">
                  <input
                    className="h-4 w-4 rounded border-[#b9c7b8] accent-[#52735a]"
                    name="remember"
                    type="checkbox"
                  />
                  Remember me
                </label>
                <a className="font-medium text-[#52735a]" href="#password">
                  Forgot password?
                </a>
              </div>

              {errorMessage ? (
                <p className="login-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button className="login-button" type="submit">
                Sign in
              </button>

              <p className="text-center text-sm text-[#5f6f63]">
                New to BloomPal?{" "}
                <Link
                  className="font-semibold text-[#52735a]"
                  href="/signup"
                >
                  Create an account
                </Link>
              </p>
            </form>
          </section>
        </main>
      </section>
    </DesktopOnly>
  );
}
