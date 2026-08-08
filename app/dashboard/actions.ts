"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import {
  isFlowerAsset,
  setTableFlowerAsset as saveTableFlowerAsset,
} from "@/database/plants";
import { deleteUserBug as removeUserBug, setActiveUserBug } from "@/database/bugs";
import { deleteUserSnapshot as removeUserSnapshot, setActiveUserSnapshot } from "@/database/snapshots";
import { deleteUserFish as removeUserFish } from "@/database/fish";
import { deleteUserFruit as removeUserFruit } from "@/database/fruits";
import { destroyCurrentSession, requireUser } from "@/lib/auth";

export type TableFlowerActionResult =
  | { ok: true; tableFlowerAsset: string | null }
  | { ok: false; error: string };

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login", RedirectType.replace);
}

export async function setTableFlowerAsset(
  asset: string | null,
): Promise<TableFlowerActionResult> {
  const { userid } = await requireUser();

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
  const { userid } = await requireUser();
  if (!bugId) return { ok: false, error: "That bug could not be found." };

  const deleted = await removeUserBug({ userid, bugId });
  if (!deleted) return { ok: false, error: "That bug is no longer in your garden." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setActiveBug(bugId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!bugId) return { ok: false, error: "That bug could not be found." };

  const activeBug = await setActiveUserBug({ userid, bugId });
  if (!activeBug) return { ok: false, error: "That bug is no longer in your garden." };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setActiveSnapshot(snapshotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!(await setActiveUserSnapshot({ userid, snapshotId }))) return { ok: false, error: "That snapshot could not be found." };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteUserSnapshot(snapshotId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!snapshotId) return { ok: false, error: "That snapshot could not be found." };
  if (!(await removeUserSnapshot({ userid, snapshotId }))) {
    return { ok: false, error: "That snapshot is no longer in your garden." };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function releaseUserFish(fishId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!fishId) return { ok: false, error: "That fish could not be found." };
  if (!(await removeUserFish({ userid, fishId }))) {
    return { ok: false, error: "That fish is no longer in your pond." };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function throwAwayUserFruit(fruitId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userid } = await requireUser();
  if (!fruitId) return { ok: false, error: "That fruit could not be found." };
  if (!(await removeUserFruit({ userid, fruitId }))) return { ok: false, error: "That fruit is no longer in your basket." };
  revalidatePath("/dashboard");
  return { ok: true };
}
