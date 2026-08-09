import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { redirect } from "@/i18n/navigation";

export default async function LegacyPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  redirect({ href: `/admin/dashboard/users/${encodeURIComponent(id)}`, locale }, RedirectType.replace);
}
