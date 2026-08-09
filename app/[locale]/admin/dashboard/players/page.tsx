import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { redirect } from "@/i18n/navigation";

export default async function LegacyPlayersPage() {
  const locale = await getLocale();
  redirect({ href: "/admin/dashboard/users", locale }, RedirectType.replace);
}
