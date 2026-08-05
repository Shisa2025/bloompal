import DesktopOnly from "../components/DesktopOnly";
import Link from "next/link";
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
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const account = await requireUser();
  const [latestPlant, ownedFlowerAssets, tableFlowerAsset, caughtBugs, snapshots] =
    await Promise.all([
      getLatestUserPlant(account.userid),
      getOwnedFlowerAssets(account.userid),
      getTableFlowerAsset(account.userid),
      getUserBugs(account.userid),
      getUserSnapshots(account.userid),
    ]);
  const boardState = getBoardState(latestPlant);

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
            <span className="dashboard-user-pill">{account.displayName}</span>
            <Link className="dashboard-logout-button" href="/change-password">
              Change password
            </Link>
            <form action={logoutAction}>
              <button className="dashboard-logout-button" type="submit">
                Log out
              </button>
            </form>
          </div>
        </header>

        <DashboardGamingBoard boardState={boardState} isSignedIn />
      </main>
    </DesktopOnly>
  );
}

function getBoardState(plant: UserPlant | null) {
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
