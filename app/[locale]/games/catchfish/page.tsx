import DesktopOnly from "@/app/components/DesktopOnly";
import { fishKinds } from "@/database/fish";
import { requireUser } from "@/lib/auth";
import CatchFishGameClient from "@/app/games/catchfish/CatchFishGameClient";

export default async function CatchFishPage() {
  await requireUser();
  return (
    <DesktopOnly>
      <main className="watering-shell font-sans text-[#1d2b22]">
        <CatchFishGameClient fishKinds={fishKinds} />
      </main>
    </DesktopOnly>
  );
}
