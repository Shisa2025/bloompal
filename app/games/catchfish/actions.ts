"use server";

import { revalidatePath } from "next/cache";
import { addUserFishWithSession, isFishKind } from "@/database/fish";
import { requireUser } from "@/lib/auth";
import { validFishMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";
import { getLocalizedPath } from "@/i18n/server";

export async function saveCaughtFish(fishKind: string, metrics: GameCompletionMetrics) {
  const { userid } = await requireUser();
  if (!isFishKind(fishKind)) return { ok: false, errorCode: "fishUnavailable" } as const;
  if (!validFishMetrics(metrics)) return { ok: false, errorCode: "invalidMotionResult" } as const;

  const saved = await addUserFishWithSession({ userid, fishKind, metrics });
  if (!saved) return { ok: false, errorCode: "saveFishFailed" } as const;

  revalidatePath(await getLocalizedPath("/dashboard"));
  revalidatePath(await getLocalizedPath("/games/catchfish"));
  return { ok: true } as const;
}
