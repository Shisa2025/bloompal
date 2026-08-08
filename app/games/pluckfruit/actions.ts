"use server";

import { revalidatePath } from "next/cache";
import { addUserFruitWithSession, isFruitKind } from "@/database/fruits";
import { requireUser } from "@/lib/auth";
import { validFruitMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";

export async function completeFruitPlucking(fruitKind: string, metrics: GameCompletionMetrics) {
  const { userid } = await requireUser();
  if (!isFruitKind(fruitKind)) return { ok: false as const, error: "That fruit is not available." };
  if (!validFruitMetrics(metrics)) return { ok: false as const, error: "The completed motion result is invalid." };
  await addUserFruitWithSession({ userid, fruitKind, metrics });
  revalidatePath("/dashboard");
  revalidatePath("/games/pluckfruit");
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}
