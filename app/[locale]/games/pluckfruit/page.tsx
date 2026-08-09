import DesktopOnly from "@/app/components/DesktopOnly";
import { randomInt } from "node:crypto";
import { requireUser } from "@/lib/auth";
import PluckFruitGameClient from "@/app/games/pluckfruit/PluckFruitGameClient";

export default async function PluckFruitPage() {
  await requireUser();
  const pool = ["apple", "pear", "orange", "plum", "peach"];
  const choices = Array.from({ length: 3 }, () => pool.splice(randomInt(pool.length), 1)[0]);
  return <DesktopOnly><main className="watering-shell fruit-game-shell font-sans text-[#1d2b22]"><PluckFruitGameClient initialChoices={choices} /></main></DesktopOnly>;
}
