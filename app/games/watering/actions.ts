"use server";

import { revalidatePath } from "next/cache";
import {
  completeUserPlantWithSession,
  isMysterySeedKey,
  selectUserSeed,
  type UserPlant,
} from "@/database/plants";
import { requireUser } from "@/lib/auth";
import { validWateringMetrics, type GameCompletionMetrics } from "@/lib/game-metrics";

export type WateringPlantPayload = { id: string; seedKey: string; status: "selected" | "completed"; flowerAsset: string | null };
export type WateringActionResult = { ok: true; plant: WateringPlantPayload } | { ok: false; error: string };
export type WateringCompletionInput = GameCompletionMetrics;

export async function selectMysterySeed(seedKey: string): Promise<WateringActionResult> {
  const { userid } = await requireUser();
  if (!isMysterySeedKey(seedKey)) return { ok: false, error: "That seed is not available." };
  const plant = await selectUserSeed({ userid, seedKey });
  if (!plant) return { ok: false, error: "Could not save your seed." };
  revalidatePath("/dashboard"); revalidatePath("/games/watering");
  return { ok: true, plant: toPayload(plant) };
}

export async function completeWateringRun(plantId: string, metrics: WateringCompletionInput): Promise<WateringActionResult> {
  const { userid } = await requireUser();
  if (!validWateringMetrics(metrics)) return { ok: false, error: "The completed motion result is invalid." };
  const plant = await completeUserPlantWithSession({ userid, plantId, metrics: { ...metrics, successfulActions: 10, totalAttempts: null } });
  if (!plant || plant.status !== "completed" || !plant.flowerAsset) return { ok: false, error: "Could not complete this watering run." };
  revalidatePath("/dashboard"); revalidatePath("/games/watering"); revalidatePath("/admin/dashboard");
  return { ok: true, plant: toPayload(plant) };
}

function toPayload(plant: UserPlant): WateringPlantPayload { return { id: plant.id, seedKey: plant.seedKey, status: plant.status, flowerAsset: plant.flowerAsset }; }
