"use client";

import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { logoutAction } from "../actions";
import { Icon, type IconName } from "./icons";
import styles from "../dashboard.module.css";
import LocaleSwitcher from "@/app/components/LocaleSwitcher";

const navigation: { href: string; label: "overview" | "users" | "sessions" | "motionRecords" | "analytics" | "reports"; icon: IconName }[] = [
  { href: "/admin/dashboard", label: "overview", icon: "overview" },
  { href: "/admin/dashboard/users", label: "users", icon: "players" },
  { href: "/admin/dashboard/sessions", label: "sessions", icon: "sessions" },
  { href: "/admin/dashboard/motion", label: "motionRecords", icon: "motion" },
  { href: "/admin/dashboard/analytics", label: "analytics", icon: "analytics" },
  { href: "/admin/dashboard/reports", label: "reports", icon: "reports" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const userInitials = getInitials(userName);

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div>
          <div className={styles.brandRow}>
            <Link className={styles.brand} href="/admin/dashboard" onClick={() => setMenuOpen(false)}>
              <span className={styles.brandMark} aria-hidden="true"><span /></span>
              <span>
                <strong>BloomPal</strong>
                <small>{t("careManagement")}</small>
              </span>
            </Link>
            <button
              aria-label={t("closeNavigation")}
              className={styles.mobileClose}
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>

          <nav className={styles.nav} aria-label={t("dashboardNavigation")}>
            <p className={styles.navLabel}>{t("workspace")}</p>
            {navigation.map((item) => (
              <Link
                className={`${styles.navItem} ${isActive(pathname, item.href) ? styles.navItemActive : ""}`}
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={19} />
                <span>{t(item.label)}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarHelp}>
            <span className={styles.helpIcon}><Icon name="activity" size={18} /></span>
            <div>
              <strong>{t("liveWorkspace")}</strong>
              <p>{t("metricsScope")}</p>
            </div>
          </div>
          <div className={styles.userCard}>
            <span className={styles.avatar}>{userInitials}</span>
            <div>
              <strong>{userName}</strong>
              <small>{t("administrator")}</small>
            </div>
            <span className={styles.onlineDot} title={t("online")} />
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button
          aria-label={t("closeNavigationOverlay")}
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            aria-label={t("openNavigation")}
            className={styles.mobileMenu}
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <form action={getPathname({ href: "/admin/dashboard/users", locale })} className={styles.search} method="get">
            <Icon name="search" size={18} />
            <input aria-label={t("searchUsers")} name="q" placeholder={t("searchUsers")} />
            <kbd>{t("enter")}</kbd>
          </form>
          <div className={styles.topbarActions}>
            <LocaleSwitcher compact />
            <Link className={styles.logoutButton} href="/change-password">
              {t("changePassword")}
            </Link>
            <span className={styles.topAvatar}>{userInitials}</span>
            <form action={logoutAction}>
              <button className={styles.logoutButton} type="submit">{t("logout")}</button>
            </form>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
