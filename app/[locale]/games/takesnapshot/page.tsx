import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { redirect } from "@/i18n/navigation";

export default async function TakeSnapshotPage() {
  const locale = await getLocale();
  return redirect({ href: "/games/snapshot", locale }, RedirectType.replace);
}
