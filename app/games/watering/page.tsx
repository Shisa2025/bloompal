import DesktopOnly from "../../components/DesktopOnly";
import { getActiveUserPlant } from "@/database/plants";
import WateringGameClient from "./WateringGameClient";
import { requireUser } from "@/lib/auth";

export default async function WateringPage() {
  const { userid: userId } = await requireUser();

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
