import Link from "next/link";
import { Icon } from "../_components/icons";
import { PageHeader, StatusBadge } from "../_components/ui";
import styles from "../dashboard.module.css";

const exports = [
  { title: "Managed users", description: "Assigned-user account status, last activity, session totals, and reward counts.", href: "/admin/dashboard/reports/users.csv", icon: "players" as const },
  { title: "Session and motion activity", description: "Completed games, duration, left/right repetitions, attempts, success counts, and result metadata.", href: "/admin/dashboard/reports/sessions.csv", icon: "hand" as const },
];

export default function ReportsPage() {
  return <><PageHeader eyebrow="Data export" title="Reports & exports" description="Generate current CSV files on demand. Every export is restricted to users assigned to this Admin." /><section className={styles.reportGrid}>{exports.map((report) => <article className={styles.reportCard} key={report.title}><div className={styles.reportCardHeader}><span className={styles.reportIcon}><Icon name={report.icon} size={20} /></span><StatusBadge tone="success">Live data</StatusBadge></div><h2>{report.title}</h2><p>{report.description}</p><div className={styles.reportMeta}><span>Generated now</span><strong>CSV</strong></div><Link className={styles.secondaryButton} href={report.href}><Icon name="download" size={17} />Download CSV</Link></article>)}</section><p className={styles.reportNote}>PDF, XLSX, scheduled reports, and report history are not included in this release.</p></>;
}
