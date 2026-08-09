"use server";

import { revalidatePath } from "next/cache";
import { addUserFruitWithSession, isFruitKind } from "@/database/fruits";
import { requireUser } from "@/lib/auth";
import { validFruitMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";
import { getLocalizedPath } from "@/i18n/server";

export async function completeFruitPlucking(fruitKind: string, metrics: GameCompletionMetrics) {
  const { userid } = await requireUser();
  if (!isFruitKind(fruitKind)) return { ok: false, errorCode: "fruitUnavailable" } as const;
  if (!validFruitMetrics(metrics)) return { ok: false, errorCode: "invalidMotionResult" } as const;
  await addUserFruitWithSession({ userid, fruitKind, metrics });
  revalidatePath(await getLocalizedPath("/dashboard"));
  revalidatePath(await getLocalizedPath("/games/pluckfruit"));
  revalidatePath(await getLocalizedPath("/admin/dashboard"));
  return { ok: true } as const;
}
