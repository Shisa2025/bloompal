import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import DesktopOnly from "../../components/DesktopOnly";
import { getTableFlowerAsset } from "@/database/plants";
import { getUserBugs } from "@/database/bugs";
import SnapshotGameClient from "./SnapshotGameClient";

export default async function SnapshotPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();
  if (!userId) redirect("/login", RedirectType.replace);

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
