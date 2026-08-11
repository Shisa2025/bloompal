import DesktopOnly from "@/app/components/DesktopOnly";
import { getTableFlowerAsset } from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import { getUserFruits } from "@/database/fruits";
import {
  getEquippedDashboardOutfit,
  getShopState,
} from "@/database/shop";
import SnapshotGameClient from "@/app/games/snapshot/SnapshotGameClient";
import { requireUser } from "@/lib/auth";

export default async function SnapshotPage() {
  const { userid: userId } = await requireUser();

  const [tableFlowerAsset, caughtBugs, fruits, shopState, equippedOutfitId] = await Promise.all([
    getTableFlowerAsset(userId),
    getUserBugs(userId),
    getUserFruits(userId),
    getShopState(userId),
    getEquippedDashboardOutfit(userId),
  ]);

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <SnapshotGameClient
          caughtBugs={caughtBugs}
          equippedOutfitId={equippedOutfitId}
          fruits={fruits}
          ownedOutfitIds={shopState.ownedOutfitIds}
          preferenceOwnerId={userId}
          tableFlowerAsset={tableFlowerAsset}
        />
      </main>
    </DesktopOnly>
  );
}
