import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import DesktopOnly from "../../components/DesktopOnly";

export default async function TakeSnapshotPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userId) {
    redirect("/login", RedirectType.replace);
  }

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <div className="watering-game">
          <header className="watering-header">
            <div>
              <p>BloomPal Game</p>
              <h1>Take a Snapshot</h1>
            </div>
            <Link className="watering-secondary-link" href="/dashboard">Dashboard</Link>
          </header>
          <section className="watering-layout watering-layout-single">
            <div className="watering-main-panel">
              <div className="watering-seed-stage">
                <div className="watering-stage-copy">
                  <p>Coming soon</p>
                  <h2>Snapshot game</h2>
                  <span>We&apos;re getting this garden camera ready for you.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </DesktopOnly>
  );
}
