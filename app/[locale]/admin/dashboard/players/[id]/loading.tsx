import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getTranslations } from "next-intl/server";

export default async function LoadingPlayerProfile() {
  const t = await getTranslations("Admin");
  return (
    <div className={styles.panel} aria-label={t("loadingUserProfile")}>
      <div className="loading-skeleton" style={{ height: 180 }} />
    </div>
  );
}
