import { Link } from "@/i18n/navigation";
import styles from "@/app/admin/dashboard/dashboard.module.css";
import { getTranslations } from "next-intl/server";

export default async function PlayerNotFound() {
  const t = await getTranslations("Admin");
  return (
    <section className={styles.panel}>
      <div className={styles.emptyState}>
        <div>
          <h1>{t("userNotFound")}</h1>
          <p>{t("userNotFoundDescription")}</p>
          <Link className={styles.textLink} href="/admin/dashboard/users">{t("backToUsers")}</Link>
        </div>
      </div>
    </section>
  );
}
