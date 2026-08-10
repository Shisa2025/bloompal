import DesktopOnly from "@/app/components/DesktopOnly";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/dashboard/actions";
import DashboardGardenClient from "@/app/dashboard/components/DashboardGardenClient";
import DashboardGamingBoard from "@/app/dashboard/components/DashboardGamingBoard";
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
import { getShopState } from "@/database/shop";
import { requireUser } from "@/lib/auth";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";
import { getTranslations } from "next-intl/server";
import { getCatalogAssetBySource } from "@/lib/asset-catalog";

export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");
  const tAssets = await getTranslations("Assets");
  const account = await requireUser();
  const [latestPlant, ownedFlowerAssets, tableFlowerAsset, caughtBugs, snapshots, caughtFish, gameHistory, fruits, shopState] =
    await Promise.all([
      getLatestUserPlant(account.userid),
      getOwnedFlowerAssets(account.userid),
      getTableFlowerAsset(account.userid),
      getUserBugs(account.userid),
      getUserSnapshots(account.userid),
      getUserFish(account.userid),
      getUserGameHistory(account.userid),
      getUserFruits(account.userid),
      getShopState(account.userid),
    ]);
  const boardState = getBoardState(latestPlant, t, tAssets);

  return (
    <DesktopOnly>
      <main className="dashboard-shell font-sans text-[#1d2b22]">
        <DashboardGardenClient
          preferenceOwnerId={account.userid}
          ownedFlowerAssets={ownedFlowerAssets}
          tableFlowerAsset={tableFlowerAsset}
          caughtBugs={caughtBugs}
          snapshots={snapshots}
          fruits={fruits}
          caughtFish={caughtFish}
          shopState={shopState}
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
            <span
              aria-label={t("coinBalance", { count: shopState.coinBalance })}
              className="dashboard-coin-pill"
            >
              <span aria-hidden="true">●</span>
              {shopState.coinBalance}
            </span>
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
      </main>
    </DesktopOnly>
  );
}

function getBoardState(
  plant: UserPlant | null,
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard">>>,
  tAssets: Awaited<ReturnType<typeof getTranslations<"Assets">>>,
) {
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

  const flowerCatalogEntry = plant.flowerAsset
    ? getCatalogAssetBySource("flower", plant.flowerAsset)
    : null;
  return {
    label: t("latestBloom"),
    title: plant.flowerAsset
      ? flowerCatalogEntry
        ? tAssets(flowerCatalogEntry.nameKey)
        : plant.flowerAsset
      : t("flowerUnlocked"),
    description: t("latestBloomDescription"),
  };
}
