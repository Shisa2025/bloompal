"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import {
  isFlowerAsset,
  setTableFlowerAsset as saveTableFlowerAsset,
} from "@/database/plants";
import { deleteUserBug as removeUserBug, setActiveUserBug } from "@/database/bugs";
import { deleteUserSnapshot as removeUserSnapshot, setActiveUserSnapshot } from "@/database/snapshots";
import { deleteUserFish as removeUserFish } from "@/database/fish";
import { deleteUserFruit as removeUserFruit } from "@/database/fruits";
import { destroyCurrentSession, requireUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocalizedPath } from "@/i18n/server";
import type { ErrorCode } from "@/lib/message-codes";

export type TableFlowerActionResult =
  | { ok: true; tableFlowerAsset: string | null }
  | { ok: false; errorCode: ErrorCode };

export async function logoutAction() {
  const locale = await getLocale();
  await destroyCurrentSession();
  redirect({ href: "/login", locale }, RedirectType.replace);
}

export async function setTableFlowerAsset(
  asset: string | null,
): Promise<TableFlowerActionResult> {
  const { userid } = await requireUser();

  if (asset !== null && !isFlowerAsset(asset)) {
    return { ok: false, errorCode: "flowerUnavailable" };
  }

  const tableFlowerAsset = await saveTableFlowerAsset({
    userid,
    flowerAsset: asset,
  });

  if (asset !== null && tableFlowerAsset !== asset) {
    return { ok: false, errorCode: "flowerNotOwned" };
  }

  revalidatePath(await getLocalizedPath("/dashboard"));

  return { ok: true, tableFlowerAsset };
}

export async function deleteUserBug(bugId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!bugId) return { ok: false, errorCode: "bugNotFound" };

  const deleted = await removeUserBug({ userid, bugId });
  if (!deleted) return { ok: false, errorCode: "bugGone" };

  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}

export async function setActiveBug(bugId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!bugId) return { ok: false, errorCode: "bugNotFound" };

  const activeBug = await setActiveUserBug({ userid, bugId });
  if (!activeBug) return { ok: false, errorCode: "bugGone" };

  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}

export async function setActiveSnapshot(snapshotId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!(await setActiveUserSnapshot({ userid, snapshotId }))) return { ok: false, errorCode: "snapshotNotFound" };
  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}

export async function deleteUserSnapshot(snapshotId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!snapshotId) return { ok: false, errorCode: "snapshotNotFound" };
  if (!(await removeUserSnapshot({ userid, snapshotId }))) {
    return { ok: false, errorCode: "snapshotGone" };
  }
  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}

export async function releaseUserFish(fishId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!fishId) return { ok: false, errorCode: "fishNotFound" };
  if (!(await removeUserFish({ userid, fishId }))) {
    return { ok: false, errorCode: "fishGone" };
  }
  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}

export async function throwAwayUserFruit(fruitId: string): Promise<{ ok: true } | { ok: false; errorCode: ErrorCode }> {
  const { userid } = await requireUser();
  if (!fruitId) return { ok: false, errorCode: "fruitNotFound" };
  if (!(await removeUserFruit({ userid, fruitId }))) return { ok: false, errorCode: "fruitGone" };
  revalidatePath(await getLocalizedPath("/dashboard"));
  return { ok: true };
}
