"use server";

import { revalidatePath } from "next/cache";
import { addUserBugWithSession, isBugAsset } from "@/database/bugs";
import { requireUser } from "@/lib/auth";
import { validBugMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";
import { getLocalizedPath } from "@/i18n/server";
import type { ErrorCode } from "@/lib/message-codes";

export type CompleteBugHuntResult = { ok: true } | { ok: false; errorCode: ErrorCode };
export type BugCompletionInput = GameCompletionMetrics;

export async function completeBugHunt(bugAsset: string, metrics: BugCompletionInput): Promise<CompleteBugHuntResult> {
  const { userid } = await requireUser();
  if (!isBugAsset(bugAsset)) return { ok: false, errorCode: "bugUnavailable" };
  if (!validBugMetrics(metrics)) return { ok: false, errorCode: "invalidMotionResult" };
  const saved = await addUserBugWithSession({ userid, bugAsset, metrics });
  if (!saved) return { ok: false, errorCode: "saveBugFailed" };
  revalidatePath(await getLocalizedPath("/dashboard")); revalidatePath(await getLocalizedPath("/games/collectbugs")); revalidatePath(await getLocalizedPath("/admin/dashboard"));
  return { ok: true };
}
