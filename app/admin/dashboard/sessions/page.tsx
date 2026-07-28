import Link from "next/link";
import { Avatar, PageHeader, Panel, ProgressBar, SecondaryButton, StatusBadge, TableShell } from "../_components/ui";
import { sessions } from "../_lib/mock-data";
import { formatDateTime } from "../_lib/format";
import styles from "../dashboard.module.css";

export default function SessionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Rehabilitation activity"
        title="Session history"
        description="A chronological record of game sessions, activity completion, and prototype performance scores."
        action={<SecondaryButton icon="download">Export sessions</SecondaryButton>}
      />
      <Panel title="All sessions" subtitle={`${sessions.length} recent mock sessions`}>
        <div className={styles.filterBar}>
          <input className={styles.filterInput} placeholder="Search session or player" aria-label="Search sessions" />
          <select className={styles.filterSelect} aria-label="Filter by activity" defaultValue="all">
            <option value="all">All activities</option>
            <option>Pinching Flowers</option>
            <option>Watering Plants</option>
            <option>Picking Fruits</option>
            <option>Catching Butterflies</option>
            <option>Arranging Bouquets</option>
          </select>
          <select className={styles.filterSelect} aria-label="Filter by completion" defaultValue="all">
            <option value="all">All results</option>
            <option>Completed</option>
            <option>Incomplete</option>
          </select>
        </div>
        <TableShell>
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Player</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Activity type</th>
              <th>Accuracy</th>
              <th>Completion</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td><strong>{session.id}</strong></td>
                <td>
                  <Link className={styles.personCell} href={`/admin/dashboard/players/${session.playerId}`} style={{ textDecoration: "none" }}>
                    <Avatar name={session.playerName} size="small" />
                    <strong>{session.playerName}</strong>
                  </Link>
                </td>
                <td>{formatDateTime(session.startedAt)}</td>
                <td>{session.durationMinutes} min</td>
                <td>{session.activityType}</td>
                <td><ProgressBar compact value={session.accuracyPercentage} /></td>
                <td><StatusBadge tone={session.completionStatus === "Completed" ? "success" : "danger"}>{session.completionStatus}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
