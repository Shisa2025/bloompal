import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import styles from "../dashboard.module.css";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.pageActions}>{action}</div> : null}
    </header>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "green",
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tone?: "green" | "blue" | "purple" | "amber" | "rose";
}) {
  return (
    <article className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className={styles.statCopy}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "neutral" | "danger" | "info";
}) {
  return <span className={`${styles.badge} ${styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>{children}</span>;
}

export function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={`${styles.progressWrap} ${compact ? styles.progressCompact : ""}`}>
      <div className={styles.progressTrack}>
        <span style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

export function Avatar({ name, size = "medium" }: { name: string; size?: "small" | "medium" | "large" }) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <span className={`${styles.personAvatar} ${styles[`avatar${size[0].toUpperCase()}${size.slice(1)}`]}`}>{initials}</span>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return <div className={styles.tableScroll}><table className={styles.table}>{children}</table></div>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={styles.textLink} href={href}>{children}<Icon name="arrow" size={15} /></Link>;
}

export function PrimaryButton({ children, icon = "download" }: { children: ReactNode; icon?: IconName }) {
  return <button className={styles.primaryButton} type="button"><Icon name={icon} size={17} />{children}</button>;
}

export function SecondaryButton({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return <button className={styles.secondaryButton} type="button">{icon ? <Icon name={icon} size={17} /> : null}{children}</button>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>;
}
