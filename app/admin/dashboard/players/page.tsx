import Link from "next/link";
import { Avatar, PageHeader, Panel, ProgressBar, SecondaryButton, StatusBadge, TableShell } from "../_components/ui";
import { players } from "../_lib/mock-data";
import { formatDateTime } from "../_lib/format";
import styles from "../dashboard.module.css";

export default function PlayersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Player management"
        title="Players"
        description="Review player assignments, recent activity, and overall rehabilitation progress."
        action={<SecondaryButton icon="download">Export list</SecondaryButton>}
      />
      <Panel title="All players" subtitle={`${players.length} prototype player records`}>
        <div className={styles.filterBar}>
          <input className={styles.filterInput} placeholder="Search by player name" aria-label="Search players" />
          <select className={styles.filterSelect} aria-label="Filter by status" defaultValue="all">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="attention">Needs attention</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className={styles.filterSelect} aria-label="Filter by employee" defaultValue="all">
            <option value="all">All employees</option>
            <option>Dr. Sarah Ng</option>
            <option>Marcus Goh</option>
            <option>Aisha Rahman</option>
          </select>
        </div>
        <TableShell>
          <thead>
            <tr>
              <th>Player</th>
              <th>Age</th>
              <th>Condition</th>
              <th>Assigned employee</th>
              <th>Last session</th>
              <th>Progress</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>
                  <div className={styles.personCell}>
                    <Avatar name={player.name} />
                    <div><strong>{player.name}</strong><span>{player.email}</span></div>
                  </div>
                </td>
                <td>{player.age}</td>
                <td>{player.conditionType}</td>
                <td>{player.employeeName}</td>
                <td>{formatDateTime(player.lastSessionAt)}</td>
                <td><ProgressBar value={player.progressPercentage} /></td>
                <td>
                  <StatusBadge tone={player.status === "active" ? "success" : player.status === "attention" ? "warning" : "neutral"}>
                    {player.status === "attention" ? "Needs attention" : player.status}
                  </StatusBadge>
                </td>
                <td><Link className={styles.tableAction} href={`/admin/dashboard/players/${player.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
