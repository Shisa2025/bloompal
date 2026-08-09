import { listAdminSessions } from "@/database/admin";
import { requireAdmin } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { isSupportedLocale } from "@/i18n/routing";
import { csvDownloadResponse } from "@/lib/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return new Response("Not found", { status: 404 });
  const t = await getTranslations({ locale, namespace: "Reports.csv" });
  const admin = await requireAdmin();
  const sessions = await listAdminSessions(admin.userid, { pageSize: 10_000 });
  const rows = [
    [t("sessionId"), t("userId"), t("userName"), t("activityHeader"), t("startedAt"), t("completedAt"), t("durationSeconds"), t("leftRepetitions"), t("rightRepetitions"), t("successfulActions"), t("totalAttempts"), t("resultMetadata")],
    ...sessions.items.map((session) => [session.id, session.userid, session.userName, t(`activity.${session.activityType}`), session.startedAt, session.completedAt, session.durationSeconds ?? "", session.leftRepetitions ?? "", session.rightRepetitions ?? "", session.successfulActions ?? "", session.totalAttempts ?? "", JSON.stringify(session.resultMetadata)]),
  ];
  return csvDownloadResponse(rows, `bloompal-sessions-${locale}.csv`);
}
