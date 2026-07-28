import { Icon } from "../_components/icons";
import { PageHeader, Panel, SecondaryButton, StatusBadge, TableShell } from "../_components/ui";
import styles from "../dashboard.module.css";

const reportTemplates = [
  { title: "Player progress report", description: "Profile summary, session history, performance trends, and employee notes.", cadence: "Per player", format: "PDF / CSV", icon: "players" as const },
  { title: "Session activity report", description: "Session volume, completion status, accuracy, and duration by activity.", cadence: "Weekly or monthly", format: "CSV", icon: "sessions" as const },
  { title: "Motion metrics report", description: "Pinch counts, reaction time, motion accuracy, and hand usage distribution.", cadence: "Per period", format: "CSV / XLSX", icon: "hand" as const },
];

const generatedReports = [
  { name: "June 2026 progress summary", type: "Player progress", created: "24 Jun 2026, 9:30 AM", author: "Dr. Sarah Ng", status: "Ready" },
  { name: "Week 25 session activity", type: "Session activity", created: "22 Jun 2026, 5:10 PM", author: "Marcus Goh", status: "Ready" },
  { name: "May motion metrics", type: "Motion metrics", created: "1 Jun 2026, 8:45 AM", author: "Aisha Rahman", status: "Archived" },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Documentation"
        title="Reports & exports"
        description="Prepare common rehabilitation summaries. Export actions are prototype controls until backend requirements are finalized."
      />
      <section className={styles.reportGrid}>
        {reportTemplates.map((report) => (
          <article className={styles.reportCard} key={report.title}>
            <div className={styles.reportCardHeader}>
              <span className={styles.reportIcon}><Icon name={report.icon} size={20} /></span>
              <StatusBadge tone="info">Template</StatusBadge>
            </div>
            <h2>{report.title}</h2>
            <p>{report.description}</p>
            <div className={styles.reportMeta}><span>{report.cadence}</span><strong>{report.format}</strong></div>
            <SecondaryButton icon="download">Prepare export</SecondaryButton>
          </article>
        ))}
      </section>
      <Panel title="Generated reports" subtitle="Recent mock export history">
        <TableShell>
          <thead><tr><th>Report name</th><th>Type</th><th>Created</th><th>Created by</th><th>Status</th><th /></tr></thead>
          <tbody>
            {generatedReports.map((report) => (
              <tr key={report.name}>
                <td><strong>{report.name}</strong></td>
                <td>{report.type}</td>
                <td>{report.created}</td>
                <td>{report.author}</td>
                <td><StatusBadge tone={report.status === "Ready" ? "success" : "neutral"}>{report.status}</StatusBadge></td>
                <td><button className={styles.secondaryButton} type="button"><Icon name="download" size={15} />Download</button></td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
