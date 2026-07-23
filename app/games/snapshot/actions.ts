"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { addUserSnapshot } from "@/database/snapshots";

export async function saveGardenSnapshot(imageData: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const userid = (await cookies()).get("bloompal_user_id")?.value.trim();
  if (!userid) return { ok: false, error: "Please log in before saving a snapshot." };
  if (!imageData.startsWith("data:image/")) return { ok: false, error: "The snapshot image is invalid." };
  if (imageData.length > 750_000) return { ok: false, error: "The snapshot image is too large." };
  const snapshot = await addUserSnapshot({ userid, imageData });
  if (!snapshot) return { ok: false, error: "Could not save the snapshot." };
  revalidatePath("/dashboard");
  return { ok: true };
}
