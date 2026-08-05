import { redirect, RedirectType } from "next/navigation";

export default function LegacyPlayersPage() {
  redirect("/admin/dashboard/users", RedirectType.replace);
}
