import { BarChart, LineChart } from "./_components/charts";
import {
  Avatar,
  PageHeader,
  Panel,
  ProgressBar,
  StatCard,
  StatusBadge,
  TableShell,
  TextLink,
} from "./_components/ui";
import {
  improvementTrend,
  players,
  recentActivity,
  sessions,
  weeklySessions,
} from "./_lib/mock-data";
import { formatDateTime } from "./_lib/format";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Wednesday, 24 June 2026"
        title="Admin dashboard overview"
        description="Today's rehabilitation activity and the players who may need attention."
      />

      <section className={styles.statsGrid} aria-label="Dashboard metrics">
        <StatCard label="Total Players" value="128" detail="+8 this month" icon="users" />
        <StatCard label="Active Players" value="94" detail="73% engagement" icon="activity" tone="blue" />
        <StatCard label="Sessions Today" value="24" detail="6 currently scheduled" icon="calendar" tone="purple" />
        <StatCard label="Avg. Duration" value="22m" detail="+2m from last week" icon="clock" tone="amber" />
        <StatCard label="Improvement Rate" value="12.4%" detail="Across active players" icon="trend" />
        <StatCard label="Need Attention" value="6" detail="2 newly flagged" icon="attention" tone="rose" />
      </section>

      <div className={styles.contentGrid}>
        <div>
          <Panel
            title="Recent sessions"
            subtitle="Latest rehabilitation activity across all players"
            action={<TextLink href="/admin/dashboard/sessions">View all</TextLink>}
          >
            <TableShell>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Activity</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className={styles.personCell}>
                        <Avatar name={session.playerName} size="small" />
                        <strong>{session.playerName}</strong>
                      </div>
                    </td>
                    <td>{session.activityType}</td>
                    <td>{formatDateTime(session.startedAt)}</td>
                    <td>{session.durationMinutes} min</td>
                    <td><ProgressBar compact value={session.accuracyPercentage} /></td>
                    <td>
                      <StatusBadge tone={session.completionStatus === "Completed" ? "success" : "danger"}>
                        {session.completionStatus}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </Panel>

          <div className={`${styles.twoColumn} ${styles.sectionGap}`}>
            <Panel title="Weekly sessions" subtitle="Sessions completed this week">
              <BarChart compact data={weeklySessions} />
            </Panel>
            <Panel title="Improvement trend" subtitle="Average player progress">
              <LineChart data={improvementTrend} suffix="%" />
            </Panel>
          </div>
        </div>

        <div>
          <Panel title="Recent activity" subtitle="Updates from your care team">
            <div className={styles.activityList}>
              {recentActivity.map((item) => (
                <article className={styles.activityItem} key={item.id}>
                  <span
                    className={`${styles.activityDot} ${
                      item.tone !== "green"
                        ? styles[`activityDot${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]
                        : ""
                    }`}
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <time>{item.time}</time>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            className={styles.sectionGap}
            title="Players requiring attention"
            subtitle="Based on prototype thresholds"
            action={<TextLink href="/admin/dashboard/players">Review all</TextLink>}
          >
            <div className={styles.activityList}>
              {players.filter((player) => player.status === "attention").map((player) => (
                <article className={styles.activityItem} key={player.id}>
                  <Avatar name={player.name} size="small" />
                  <div>
                    <strong>{player.name}</strong>
                    <p>{player.conditionType}</p>
                    <ProgressBar compact value={player.progressPercentage} />
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
