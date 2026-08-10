import DesktopOnly from "@/app/components/DesktopOnly";
import CollectBugsGameClient from "@/app/games/collectbugs/CollectBugsGameClient";
import { requireUser } from "@/lib/auth";

import { bugCatalog } from "@/lib/asset-catalog";

const bugAssets = bugCatalog.map((asset) => asset.sourceValue);

export default async function CollectBugsPage() {
  await requireUser();

  const mysteryBugs = getRandomMysteryBugs();

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <CollectBugsGameClient mysteryBugs={mysteryBugs} />
      </main>
    </DesktopOnly>
  );
}

function getRandomMysteryBugs() {
  const shuffledBugs = [...bugAssets];

  for (let index = shuffledBugs.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledBugs[index], shuffledBugs[swapIndex]] = [
      shuffledBugs[swapIndex],
      shuffledBugs[index],
    ];
  }

  return shuffledBugs.slice(0, 3);
}
