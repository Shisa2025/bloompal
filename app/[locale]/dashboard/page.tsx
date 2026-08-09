import DesktopOnly from "@/app/components/DesktopOnly";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/dashboard/actions";
import DashboardGardenClient from "@/app/dashboard/components/DashboardGardenClient";
import DashboardGamingBoard from "@/app/dashboard/components/DashboardGamingBoard";
import DashboardPond from "@/app/dashboard/components/DashboardPond";
import GameHistoryButton from "@/app/dashboard/components/GameHistoryButton";
import {
  getLatestUserPlant,
  getOwnedFlowerAssets,
  getTableFlowerAsset,
  type UserPlant,
} from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import { getUserSnapshots } from "@/database/snapshots";
import { getUserFish } from "@/database/fish";
import { getUserGameHistory } from "@/database/game-sessions";
import { getUserFruits } from "@/database/fruits";
import { requireUser } from "@/lib/auth";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const account = await requireUser();
  const [latestPlant, ownedFlowerAssets, tableFlowerAsset, caughtBugs, snapshots, caughtFish, gameHistory, fruits] =
    await Promise.all([
      getLatestUserPlant(account.userid),
      getOwnedFlowerAssets(account.userid),
      getTableFlowerAsset(account.userid),
      getUserBugs(account.userid),
      getUserSnapshots(account.userid),
      getUserFish(account.userid),
      getUserGameHistory(account.userid),
      getUserFruits(account.userid),
    ]);
  const boardState = getBoardState(latestPlant, t);

  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <DashboardGardenClient
          ownedFlowerAssets={ownedFlowerAssets}
          tableFlowerAsset={tableFlowerAsset}
          caughtBugs={caughtBugs}
          snapshots={snapshots}
          fruits={fruits}
        />

        <header className="dashboard-topbar" aria-label={t("accountBar")}>
          <div className="dashboard-brand">
            <span className="dashboard-brand-mark" aria-hidden="true" />
            <div>
              <p>BloomPal</p>
              <strong>{t("homeGarden")}</strong>
            </div>
          </div>

          <div className="dashboard-account">
            <LocaleSwitcher compact />
            <span className="dashboard-user-pill">{account.displayName}</span>
            <GameHistoryButton history={gameHistory} />
            <Link className="dashboard-logout-button" href="/change-password">
              {t("changePassword")}
            </Link>
            <form action={logoutAction}>
              <button className="dashboard-logout-button" type="submit">
                {t("logout")}
              </button>
            </form>
          </div>
        </header>

        <DashboardGamingBoard boardState={boardState} isSignedIn />
        <DashboardPond fish={caughtFish} />
      </main>
    </DesktopOnly>
  );
}

function getBoardState(plant: UserPlant | null, t: Awaited<ReturnType<typeof getTranslations<"Dashboard">>>) {
  if (!plant) {
    return {
      label: t("ready"),
      title: t("noSeedGrowing"),
      description: t("noSeedDescription"),
    };
  }

  if (plant.status === "selected") {
    return {
      label: t("inProgress"),
      title: t("mysterySeedSelected"),
      description: t("selectedSeedDescription"),
    };
  }

  return {
    label: t("latestBloom"),
    title: plant.flowerAsset ? plant.flowerAsset.replace(".glb", "") : t("flowerUnlocked"),
    description: t("latestBloomDescription"),
  };
}
