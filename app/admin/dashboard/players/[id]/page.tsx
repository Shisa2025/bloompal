import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Panel, ProgressBar, StatusBadge, TableShell } from "../../_components/ui";
import { employeeNotes, getEmployeeName, getPlayer, getPlayerMotionRecords, getPlayerSessions, players } from "../../_lib/mock-data";
import { formatDate, formatDateTime, formatReactionTime } from "../../_lib/format";
import styles from "../../dashboard.module.css";

export function generateStaticParams() {
  return players.map((player) => ({ id: player.id }));
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = getPlayer(id);

  if (!player) {
    notFound();
  }

  const playerSessions = getPlayerSessions(player.id);
  const playerMotion = getPlayerMotionRecords(player.id);
  const notes = employeeNotes.filter((note) => note.playerId === player.id);
  const latestMotion = playerMotion[0];
  const averageAccuracy = playerSessions.length
    ? Math.round(playerSessions.reduce((sum, session) => sum + session.accuracyPercentage, 0) / playerSessions.length)
    : 0;
  const averageDuration = playerSessions.length
    ? Math.round(playerSessions.reduce((sum, session) => sum + session.durationMinutes, 0) / playerSessions.length)
    : 0;

  return (
    <>
      <section className={styles.profileHero}>
        <div className={styles.profileIdentity}>
          <Avatar name={player.name} size="large" />
          <div>
            <p className={styles.eyebrow}>Player profile</p>
            <h1>{player.name}</h1>
            <p>{player.age} years old - {player.conditionType}</p>
            <div className={styles.profileBadges}>
              <StatusBadge tone={player.status === "active" ? "success" : player.status === "attention" ? "warning" : "neutral"}>
                {player.status === "attention" ? "Needs attention" : player.status}
              </StatusBadge>
              <StatusBadge tone="info">{player.preferredHand}-hand preference</StatusBadge>
            </div>
          </div>
        </div>
        <Link className={styles.secondaryButton} href="/admin/dashboard/players">Back to players</Link>
      </section>

      <section className={styles.statsGrid} aria-label="Player metrics">
        <article className={styles.motionMetric}><span>Overall progress</span><strong>{player.progressPercentage}%</strong><ProgressBar value={player.progressPercentage} /></article>
        <article className={styles.motionMetric}><span>Total sessions</span><strong>{playerSessions.length}</strong><small>In current mock history</small></article>
        <article className={styles.motionMetric}><span>Average accuracy</span><strong>{averageAccuracy}%</strong><small>Across recorded sessions</small></article>
        <article className={styles.motionMetric}><span>Average duration</span><strong>{averageDuration}m</strong><small>Per session</small></article>
        <article className={styles.motionMetric}><span>Latest reaction time</span><strong>{latestMotion ? formatReactionTime(latestMotion.averageReactionTimeMs) : "-"}</strong><small>Prototype metric</small></article>
        <article className={styles.motionMetric}><span>Assigned employee</span><strong style={{ fontSize: 12 }}>{getEmployeeName(player.assignedEmployeeId)}</strong><small>Primary care owner</small></article>
      </section>

      <div className={styles.profileGrid}>
        <div>
          <Panel title="Profile information" subtitle="Administrative and care details">
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}><span>Email</span><strong>{player.email}</strong></div>
              <div className={styles.detailItem}><span>Player ID</span><strong>{player.id}</strong></div>
              <div className={styles.detailItem}><span>Joined programme</span><strong>{formatDate(player.joinedAt)}</strong></div>
              <div className={styles.detailItem}><span>Last session</span><strong>{formatDateTime(player.lastSessionAt)}</strong></div>
              <div className={styles.detailItem}><span>Condition type</span><strong>{player.conditionType}</strong></div>
              <div className={styles.detailItem}><span>Assigned employee</span><strong>{player.employeeName}</strong></div>
            </div>
          </Panel>

          <Panel className={styles.sectionGap} title="Session history" subtitle="Recent activities and outcomes">
            <TableShell>
              <thead><tr><th>Session</th><th>Date</th><th>Activity</th><th>Duration</th><th>Accuracy</th><th>Status</th></tr></thead>
              <tbody>
                {playerSessions.map((session) => (
                  <tr key={session.id}>
                    <td><strong>{session.id}</strong></td>
                    <td>{formatDateTime(session.startedAt)}</td>
                    <td>{session.activityType}</td>
                    <td>{session.durationMinutes} min</td>
                    <td>{session.accuracyPercentage}%</td>
                    <td><StatusBadge tone={session.completionStatus === "Completed" ? "success" : "danger"}>{session.completionStatus}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </Panel>
        </div>

        <div>
          <Panel title="Performance metrics" subtitle="Prototype clinical overview">
            <div className={styles.metricList}>
              <div className={styles.metricRow}><span>Progress score</span><strong>{player.progressPercentage}%</strong></div>
              <div className={styles.metricRow}><span>Session accuracy</span><strong>{averageAccuracy}%</strong></div>
              <div className={styles.metricRow}><span>Completion rate</span><strong>{playerSessions.length ? Math.round((playerSessions.filter((session) => session.completionStatus === "Completed").length / playerSessions.length) * 100) : 0}%</strong></div>
              <div className={styles.metricRow}><span>Engagement status</span><StatusBadge tone={player.status === "active" ? "success" : "warning"}>{player.status}</StatusBadge></div>
            </div>
          </Panel>

          <Panel className={styles.sectionGap} title="Motion metrics" subtitle="Latest hand-tracking record">
            <div className={styles.metricList}>
              <div className={styles.metricRow}><span>Pinch count</span><strong>{latestMotion?.pinchCount ?? "-"}</strong></div>
              <div className={styles.metricRow}><span>Hand open / close</span><strong>{latestMotion?.handOpenCloseCount ?? "-"}</strong></div>
              <div className={styles.metricRow}><span>Reaction time</span><strong>{latestMotion ? formatReactionTime(latestMotion.averageReactionTimeMs) : "-"}</strong></div>
              <div className={styles.metricRow}><span>Motion accuracy</span><strong>{latestMotion ? `${latestMotion.motionAccuracyPercentage}%` : "-"}</strong></div>
              <div className={styles.metricRow}><span>Left / right usage</span><strong>{latestMotion ? `${latestMotion.leftHandUsagePercentage}% / ${latestMotion.rightHandUsagePercentage}%` : "-"}</strong></div>
            </div>
          </Panel>

          <Panel className={styles.sectionGap} title="Employee notes" subtitle="Care team observations">
            <div className={styles.noteList}>
              {notes.length ? notes.map((note) => (
                <article className={styles.note} key={note.id}>
                  <div className={styles.noteMeta}>
                    <StatusBadge tone={note.category === "Progress" ? "success" : note.category === "Follow-up" ? "warning" : "info"}>{note.category}</StatusBadge>
                    <time>{formatDate(note.createdAt)}</time>
                  </div>
                  <p>{note.content}</p>
                </article>
              )) : <p style={{ color: "#6d7e76", fontSize: 10 }}>No notes have been added for this player.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
