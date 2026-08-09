"use server";

import { revalidatePath } from "next/cache";
import { addUserSnapshotWithSession } from "@/database/snapshots";
import { requireUser } from "@/lib/auth";
import { validSnapshotMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";
import { getLocalizedPath } from "@/i18n/server";
import type { ErrorCode } from "@/lib/message-codes";

export type SnapshotCompletionInput = GameCompletionMetrics;

export async function saveGardenSnapshot(imageData: string, metrics: SnapshotCompletionInput): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!imageData.startsWith("data:image/")) return { ok: false, errorCode: "snapshotInvalid" };
  if (imageData.length > 750_000) return { ok: false, errorCode: "snapshotTooLarge" };
  if (!validSnapshotMetrics(metrics)) return { ok: false, errorCode: "invalidMotionResult" };
  const saved = await addUserSnapshotWithSession({ userid, imageData, metrics: { ...metrics, successfulActions: 6, totalAttempts: null } });
  if (!saved) return { ok: false, errorCode: "saveSnapshotFailed" };
  revalidatePath(await getLocalizedPath("/dashboard")); revalidatePath(await getLocalizedPath("/admin/dashboard"));
  return { ok: true };
}
