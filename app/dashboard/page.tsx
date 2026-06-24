import { cookies } from "next/headers";
import DesktopOnly from "../components/DesktopOnly";
import { logoutAction } from "./actions";
import DashboardHomeScene from "./components/DashboardHomeScene";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();
  const displayName = cookieStore.get("bloompal_display_name")?.value.trim();
  const userName = displayName || userId || "Guest";

  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <DashboardHomeScene />

        <header className="dashboard-topbar" aria-label="Dashboard account bar">
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark" aria-hidden="true" />
            <div>
              <p>BloomPal</p>
              <strong>Home garden</strong>
            </div>
          </div>

          <div className="dashboard-account">
            <span className="dashboard-user-pill">{userName}</span>
            <form action={logoutAction}>
              <button className="dashboard-logout-button" type="submit">
                Log out
              </button>
            </form>
          </div>
        </header>
      </main>
    </DesktopOnly>
  );
}
