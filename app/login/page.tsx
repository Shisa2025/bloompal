import DesktopOnly from "../components/DesktopOnly";

export default function LoginPage() {
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

            <form className="login-panel flex flex-col gap-5" aria-label="Sign in">
              <div className="flex flex-col gap-2 text-left">
                <label
                  className="text-sm font-medium text-[#304536]"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  className="login-input"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
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

              <button className="login-button" type="button">
                Sign in
              </button>

              <p className="text-center text-sm text-[#5f6f63]">
                New to BloomPal?{" "}
                <a
                  className="font-semibold text-[#52735a]"
                  href="#create-account"
                >
                  Create an account
                </a>
              </p>
            </form>
          </section>
        </main>
      </section>
    </DesktopOnly>
  );
}
