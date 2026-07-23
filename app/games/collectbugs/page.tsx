import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import DesktopOnly from "../../components/DesktopOnly";
import CollectBugsGameClient from "./CollectBugsGameClient";

const bugAssets = ["Bee.glb", "Beetle.glb", "Butterfly.glb", "Dragonfly.glb", "Ladybug.glb"] as const;

export default async function CollectBugsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userId) {
    redirect("/login", RedirectType.replace);
  }

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
