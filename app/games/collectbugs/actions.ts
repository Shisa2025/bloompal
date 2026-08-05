"use server";

import { revalidatePath } from "next/cache";
import { addUserBugWithSession, isBugAsset } from "@/database/bugs";
import { requireUser } from "@/lib/auth";
import { validBugMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";

export type CompleteBugHuntResult = { ok: true } | { ok: false; error: string };
export type BugCompletionInput = GameCompletionMetrics;

export async function completeBugHunt(bugAsset: string, metrics: BugCompletionInput): Promise<CompleteBugHuntResult> {
  const { userid } = await requireUser();
  if (!isBugAsset(bugAsset)) return { ok: false, error: "That bug is not available." };
  if (!validBugMetrics(metrics)) return { ok: false, error: "The completed motion result is invalid." };
  const saved = await addUserBugWithSession({ userid, bugAsset, metrics });
  if (!saved) return { ok: false, error: "Could not save your caught bug." };
  revalidatePath("/dashboard"); revalidatePath("/games/collectbugs"); revalidatePath("/admin/dashboard");
  return { ok: true };
}
