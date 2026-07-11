import { cookies } from "next/headers";
import Link from "next/link";
import DesktopOnly from "../components/DesktopOnly";
import { logoutAction } from "./actions";
import DashboardGardenClient from "./components/DashboardGardenClient";
import {
  getLatestUserPlant,
  getOwnedFlowerAssets,
  getTableFlowerAsset,
  type UserPlant,
} from "@/database/plants";

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
      ])
    : null;
  const latestPlant = dashboardData?.[0] ?? null;
  const ownedFlowerAssets = dashboardData?.[1] ?? [];
  const tableFlowerAsset = dashboardData?.[2] ?? null;
  const gameHref = userId ? "/games/watering" : "/login";
  const boardState = getBoardState(latestPlant, Boolean(userId));

  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <DashboardGardenClient
          ownedFlowerAssets={ownedFlowerAssets}
          tableFlowerAsset={tableFlowerAsset}
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

        <aside className="dashboard-gaming-board" aria-label="Gaming board">
          <div className="dashboard-gaming-board-heading">
            <p>Gaming Board</p>
            <h2>Watering</h2>
          </div>

          <div className="dashboard-gaming-board-status">
            <span>{boardState.label}</span>
            <strong>{boardState.title}</strong>
            <p>{boardState.description}</p>
          </div>

          <Link className="dashboard-game-button" href={gameHref}>
            {userId ? "Start watering" : "Log in to play"}
          </Link>
        </aside>
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
