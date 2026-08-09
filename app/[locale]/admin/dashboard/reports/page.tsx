import { Link } from "@/i18n/navigation";
import { Icon } from "@/app/admin/dashboard/_components/icons";
import { PageHeader, StatusBadge } from "@/app/admin/dashboard/_components/ui";
import styles from "@/app/admin/dashboard/dashboard.module.css";

import { getTranslations } from "next-intl/server";

export default async function ReportsPage() {
  const t = await getTranslations("Admin");
  const exports = [
    { title: t("managedUsers"), description: t("managedUsersReportDescription"), href: "/admin/dashboard/reports/users.csv", icon: "players" as const },
    { title: t("sessionMotionActivity"), description: t("sessionReportDescription"), href: "/admin/dashboard/reports/sessions.csv", icon: "hand" as const },
  ];
  return <><PageHeader eyebrow={t("dataExport")} title={t("reportsExports")} description={t("reportsDescription")} /><section className={styles.reportGrid}>{exports.map((report) => <article className={styles.reportCard} key={report.title}><div className={styles.reportCardHeader}><span className={styles.reportIcon}><Icon name={report.icon} size={20} /></span><StatusBadge tone="success">{t("liveData")}</StatusBadge></div><h2>{report.title}</h2><p>{report.description}</p><div className={styles.reportMeta}><span>{t("generatedNow")}</span><strong>CSV</strong></div><Link className={styles.secondaryButton} href={report.href}><Icon name="download" size={17} />{t("downloadCsv")}</Link></article>)}</section><p className={styles.reportNote}>{t("reportLimitations")}</p></>;
}
