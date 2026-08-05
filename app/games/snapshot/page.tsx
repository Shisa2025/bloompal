import DesktopOnly from "../../components/DesktopOnly";
import { getTableFlowerAsset } from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import SnapshotGameClient from "./SnapshotGameClient";
import { requireUser } from "@/lib/auth";

export default async function SnapshotPage() {
  const { userid: userId } = await requireUser();

  const [tableFlowerAsset, caughtBugs] = await Promise.all([
    getTableFlowerAsset(userId),
    getUserBugs(userId),
  ]);

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <SnapshotGameClient caughtBugs={caughtBugs} tableFlowerAsset={tableFlowerAsset} />
      </main>
    </DesktopOnly>
  );
}
