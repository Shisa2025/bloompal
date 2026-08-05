import { redirect, RedirectType } from "next/navigation";

export default async function LegacyPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/dashboard/users/${encodeURIComponent(id)}`, RedirectType.replace);
}
