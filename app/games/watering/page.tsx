import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import DesktopOnly from "../../components/DesktopOnly";
import { getActiveUserPlant } from "@/database/plants";
import WateringGameClient from "./WateringGameClient";

export default async function WateringPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userId) {
    redirect("/login", RedirectType.replace);
  }

  const activePlant = await getActiveUserPlant(userId);
  const initialPlant = activePlant
    ? {
        id: activePlant.id,
        seedKey: activePlant.seedKey,
        status: activePlant.status,
        flowerAsset: activePlant.flowerAsset,
      }
    : null;

  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <WateringGameClient initialPlant={initialPlant} />
      </main>
    </DesktopOnly>
  );
}
