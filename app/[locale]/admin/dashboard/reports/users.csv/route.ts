import { listManagedUsers } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { isSupportedLocale } from "@/i18n/routing";
import { csvDownloadResponse } from "@/lib/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return new Response("Not found", { status: 404 });
  const t = await getTranslations({ locale, namespace: "Reports.csv" });
  const admin = await requireAdmin();
  const users = await listManagedUsers(admin.userid, { pageSize: 10_000 });
  const rows = [
    [t("userId"), t("name"), t("email"), t("statusHeader"), t("createdAt"), t("lastLoginAt"), t("lastActivityAt"), t("sessions"), t("flowers"), t("bugs"), t("snapshots")],
    ...users.items.map((user) => [user.userid, user.displayName, user.email, t(`status.${user.status}`), user.createdAt, user.lastLoginAt ?? "", user.lastActivityAt ?? "", user.sessionCount, user.flowerCount, user.bugCount, user.snapshotCount]),
  ];
  return csvDownloadResponse(rows, `bloompal-users-${locale}.csv`);
}
