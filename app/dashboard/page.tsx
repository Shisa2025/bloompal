import { cookies } from "next/headers";
import DesktopOnly from "../components/DesktopOnly";
import { logoutAction } from "./actions";
import DashboardGardenClient from "./components/DashboardGardenClient";
import DashboardGamingBoard from "./components/DashboardGamingBoard";
import {
  getLatestUserPlant,
  getOwnedFlowerAssets,
  getTableFlowerAsset,
  type UserPlant,
} from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import { getUserSnapshots } from "@/database/snapshots";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();
  const displayName = cookieStore.get("bloompal_display_name")?.value.trim();
  const userName = displayName || userId || "Guest";
  const dashboardData = userId
    ? await Promise.all([
        getLatestUserPlant(userId),
        getOwnedFlowerAssets(userId),
        getTableFlowerAsset(userId),
        getUserBugs(userId),
        getUserSnapshots(userId),
      ])
    : null;
  const latestPlant = dashboardData?.[0] ?? null;
  const ownedFlowerAssets = dashboardData?.[1] ?? [];
  const tableFlowerAsset = dashboardData?.[2] ?? null;
  const caughtBugs = dashboardData?.[3] ?? [];
  const snapshots = dashboardData?.[4] ?? [];
  const boardState = getBoardState(latestPlant, Boolean(userId));

  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <DashboardGardenClient
          ownedFlowerAssets={ownedFlowerAssets}
          tableFlowerAsset={tableFlowerAsset}
          caughtBugs={caughtBugs}
          snapshots={snapshots}
        />

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

        <DashboardGamingBoard boardState={boardState} isSignedIn={Boolean(userId)} />
      </main>
    </DesktopOnly>
  );
}

function getBoardState(plant: UserPlant | null, isSignedIn: boolean) {
  if (!isSignedIn) {
    return {
      label: "Account needed",
      title: "Sign in first",
      description: "Watering saves your seed and bloom rewards to your garden.",
    };
  }

  if (!plant) {
    return {
      label: "Ready",
      title: "No seed growing",
      description: "Pick one of three mystery seeds and grow it with wrist watering.",
    };
  }

  if (plant.status === "selected") {
    return {
      label: "In progress",
      title: "Mystery seed selected",
      description: "Finish left and right hand watering to reveal a random flower.",
    };
  }

  return {
    label: "Latest bloom",
    title: plant.flowerAsset ? plant.flowerAsset.replace(".glb", "") : "Flower unlocked",
    description: "Start another watering run to add another bloom to your history.",
  };
}
