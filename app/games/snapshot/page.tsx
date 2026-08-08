import DesktopOnly from "../../components/DesktopOnly";
import { getTableFlowerAsset } from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import { getUserFruits } from "@/database/fruits";
import SnapshotGameClient from "./SnapshotGameClient";
import { requireUser } from "@/lib/auth";

export default async function SnapshotPage() {
  const { userid: userId } = await requireUser();

  const [tableFlowerAsset, caughtBugs, fruits] = await Promise.all([
    getTableFlowerAsset(userId),
    getUserBugs(userId),
    getUserFruits(userId),
  ]);

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <SnapshotGameClient caughtBugs={caughtBugs} fruits={fruits} tableFlowerAsset={tableFlowerAsset} />
      </main>
    </DesktopOnly>
  );
}
