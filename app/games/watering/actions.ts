"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  completeUserPlant,
  isMysterySeedKey,
  selectUserSeed,
  type UserPlant,
} from "@/database/plants";

export type WateringPlantPayload = {
  id: string;
  seedKey: string;
  status: "selected" | "completed";
  flowerAsset: string | null;
};

export type WateringActionResult =
  | { ok: true; plant: WateringPlantPayload }
  | { ok: false; error: string };

export async function selectMysterySeed(
  seedKey: string,
): Promise<WateringActionResult> {
  const userid = await getSessionUserId();

  if (!userid) {
    return { ok: false, error: "Please log in before watering." };
  }

  if (!isMysterySeedKey(seedKey)) {
    return { ok: false, error: "That seed is not available." };
  }

  const plant = await selectUserSeed({ userid, seedKey });

  if (!plant) {
    return { ok: false, error: "Could not save your seed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/games/watering");

  return { ok: true, plant: toPayload(plant) };
}

export async function completeWateringRun(
  plantId: string,
): Promise<WateringActionResult> {
  const userid = await getSessionUserId();

  if (!userid) {
    return { ok: false, error: "Please log in before watering." };
  }

  const plant = await completeUserPlant({ userid, plantId });

  if (!plant || plant.status !== "completed" || !plant.flowerAsset) {
    return { ok: false, error: "Could not complete this watering run." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/games/watering");

  return { ok: true, plant: toPayload(plant) };
}

async function getSessionUserId() {
  const cookieStore = await cookies();

  return cookieStore.get("bloompal_user_id")?.value.trim() || null;
}

function toPayload(plant: UserPlant): WateringPlantPayload {
  return {
    id: plant.id,
    seedKey: plant.seedKey,
    status: plant.status,
    flowerAsset: plant.flowerAsset,
  };
}
