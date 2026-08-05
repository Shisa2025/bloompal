"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "../actions";
import { Icon, type IconName } from "./icons";
import styles from "../dashboard.module.css";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/dashboard", label: "Overview", icon: "overview" },
  { href: "/admin/dashboard/users", label: "Users", icon: "players" },
  { href: "/admin/dashboard/sessions", label: "Sessions", icon: "sessions" },
  { href: "/admin/dashboard/motion", label: "Motion records", icon: "motion" },
  { href: "/admin/dashboard/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/dashboard/reports", label: "Reports", icon: "reports" },
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
                <small>Care Management</small>
              </span>
            </Link>
            <button
              aria-label="Close navigation"
              className={styles.mobileClose}
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>

          <nav className={styles.nav} aria-label="Dashboard navigation">
            <p className={styles.navLabel}>Workspace</p>
            {navigation.map((item) => (
              <Link
                className={`${styles.navItem} ${isActive(pathname, item.href) ? styles.navItemActive : ""}`}
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarHelp}>
            <span className={styles.helpIcon}><Icon name="activity" size={18} /></span>
            <div>
              <strong>Live workspace</strong>
              <p>Metrics use assigned-user activity.</p>
            </div>
          </div>
          <div className={styles.userCard}>
            <span className={styles.avatar}>{userInitials}</span>
            <div>
              <strong>{userName}</strong>
              <small>Administrator</small>
            </div>
            <span className={styles.onlineDot} title="Online" />
          </div>
        </div>
      </aside>

      {menuOpen ? (
        <button
          aria-label="Close navigation overlay"
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            aria-label="Open navigation"
            className={styles.mobileMenu}
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <form action="/admin/dashboard/users" className={styles.search} method="get">
            <Icon name="search" size={18} />
            <input aria-label="Search users" name="q" placeholder="Search users" />
            <kbd>Enter</kbd>
          </form>
          <div className={styles.topbarActions}>
            <Link className={styles.logoutButton} href="/change-password">
              Change password
            </Link>
            <span className={styles.topAvatar}>{userInitials}</span>
            <form action={logoutAction}>
              <button className={styles.logoutButton} type="submit">Log out</button>
            </form>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
