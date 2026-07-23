"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  isFlowerAsset,
  setTableFlowerAsset as saveTableFlowerAsset,
} from "@/database/plants";
import { deleteUserBug as removeUserBug, setActiveUserBug } from "@/database/bugs";
import { setActiveUserSnapshot } from "@/database/snapshots";

export type TableFlowerActionResult =
  | { ok: true; tableFlowerAsset: string | null }
  | { ok: false; error: string };

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete("bloompal_user_id");
  cookieStore.delete("bloompal_display_name");

  redirect("/login", RedirectType.replace);
}

export async function setTableFlowerAsset(
  asset: string | null,
): Promise<TableFlowerActionResult> {
  const cookieStore = await cookies();
  const userid = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userid) {
    return { ok: false, error: "Please log in before choosing a table flower." };
  }

  if (asset !== null && !isFlowerAsset(asset)) {
    return { ok: false, error: "That flower is not available." };
  }

  const tableFlowerAsset = await saveTableFlowerAsset({
    userid,
    flowerAsset: asset,
  });

  if (asset !== null && tableFlowerAsset !== asset) {
    return { ok: false, error: "You do not own that flower yet." };
  }

  revalidatePath("/dashboard");

  return { ok: true, tableFlowerAsset };
}

export async function deleteUserBug(bugId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const userid = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userid) return { ok: false, error: "Please log in before removing a bug." };
  if (!bugId) return { ok: false, error: "That bug could not be found." };

  const deleted = await removeUserBug({ userid, bugId });
  if (!deleted) return { ok: false, error: "That bug is no longer in your garden." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setActiveBug(bugId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const userid = cookieStore.get("bloompal_user_id")?.value.trim();

  if (!userid) return { ok: false, error: "Please log in before choosing a companion." };
  if (!bugId) return { ok: false, error: "That bug could not be found." };

  const activeBug = await setActiveUserBug({ userid, bugId });
  if (!activeBug) return { ok: false, error: "That bug is no longer in your garden." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setActiveSnapshot(snapshotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const userid = (await cookies()).get("bloompal_user_id")?.value.trim();
  if (!userid) return { ok: false, error: "Please log in before choosing a snapshot." };
  if (!(await setActiveUserSnapshot({ userid, snapshotId }))) return { ok: false, error: "That snapshot could not be found." };
  revalidatePath("/dashboard");
  return { ok: true };
}
