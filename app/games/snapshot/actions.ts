"use server";

import { revalidatePath } from "next/cache";
import { addUserSnapshotWithSession } from "@/database/snapshots";
import { requireUser } from "@/lib/auth";
import { validSnapshotMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";

export type SnapshotCompletionInput = GameCompletionMetrics;

export async function saveGardenSnapshot(imageData: string, metrics: SnapshotCompletionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!imageData.startsWith("data:image/")) return { ok: false, error: "The snapshot image is invalid." };
  if (imageData.length > 750_000) return { ok: false, error: "The snapshot image is too large." };
  if (!validSnapshotMetrics(metrics)) return { ok: false, error: "The completed motion result is invalid." };
  const saved = await addUserSnapshotWithSession({ userid, imageData, metrics: { ...metrics, successfulActions: 6, totalAttempts: null } });
  if (!saved) return { ok: false, error: "Could not save the snapshot." };
  revalidatePath("/dashboard"); revalidatePath("/admin/dashboard");
  return { ok: true };
}
