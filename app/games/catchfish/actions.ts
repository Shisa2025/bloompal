"use server";

import { revalidatePath } from "next/cache";
import { addUserFishWithSession, isFishKind } from "@/database/fish";
import { requireUser } from "@/lib/auth";
import { validFishMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";

export async function saveCaughtFish(fishKind: string, metrics: GameCompletionMetrics) {
  const { userid } = await requireUser();
  if (!isFishKind(fishKind)) return { ok: false, error: "That fish is not available." } as const;
  if (!validFishMetrics(metrics)) return { ok: false, error: "The completed motion result is invalid." } as const;

  const saved = await addUserFishWithSession({ userid, fishKind, metrics });
  if (!saved) return { ok: false, error: "Could not save your fish." } as const;

  revalidatePath("/dashboard");
  revalidatePath("/games/catchfish");
  return { ok: true } as const;
}
