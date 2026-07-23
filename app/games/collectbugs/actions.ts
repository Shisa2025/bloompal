"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { addUserBug, isBugAsset } from "@/database/bugs";

export type CompleteBugHuntResult =
  | { ok: true }
  | { ok: false; error: string };

export async function completeBugHunt(bugAsset: string): Promise<CompleteBugHuntResult> {
  const cookieStore = await cookies();
  const userid = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userid) return { ok: false, error: "Please log in before saving a bug." };
  if (!isBugAsset(bugAsset)) return { ok: false, error: "That bug is not available." };

  const bug = await addUserBug({ userid, bugAsset });
  if (!bug) return { ok: false, error: "Could not save your caught bug." };

  revalidatePath("/dashboard");
  revalidatePath("/games/collectbugs");

  return { ok: true };
}
