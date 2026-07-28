import { PageHeader, Panel, SecondaryButton, StatusBadge, TableShell } from "../_components/ui";
import { motionRecords } from "../_lib/mock-data";
import { formatDateTime, formatReactionTime } from "../_lib/format";
import styles from "../dashboard.module.css";

const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

export default function MotionPage() {
  const pinchAverage = average(motionRecords.map((record) => record.pinchCount));
  const openCloseAverage = average(motionRecords.map((record) => record.handOpenCloseCount));
  const reactionAverage = average(motionRecords.map((record) => record.averageReactionTimeMs));
  const accuracyAverage = average(motionRecords.map((record) => record.motionAccuracyPercentage));
  const leftAverage = average(motionRecords.map((record) => record.leftHandUsagePercentage));
  const rightAverage = average(motionRecords.map((record) => record.rightHandUsagePercentage));

  const summary = [
    { label: "Avg. pinch count", value: `${pinchAverage}`, detail: "Per session" },
    { label: "Avg. open / close", value: `${openCloseAverage}`, detail: "Per session" },
    { label: "Reaction time", value: formatReactionTime(reactionAverage), detail: "Prototype mean" },
    { label: "Motion accuracy", value: `${accuracyAverage}%`, detail: "Across records" },
    { label: "Left hand usage", value: `${leftAverage}%`, detail: "Average split" },
    { label: "Right hand usage", value: `${rightAverage}%`, detail: "Average split" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Hand tracking"
        title="Motion records"
        description="Prototype hand-tracking measurements structured for future MediaPipe and clinical metric integration."
        action={<SecondaryButton icon="download">Export motion data</SecondaryButton>}
      />
      <section className={styles.motionSummary} aria-label="Motion summary">
        {summary.map((item) => (
          <article className={styles.motionMetric} key={item.label}>
            <span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small>
          </article>
        ))}
      </section>
      <Panel title="Motion record log" subtitle="Mock records linked to individual sessions">
        <TableShell>
          <thead>
            <tr>
              <th>Record</th>
              <th>Player</th>
              <th>Activity</th>
              <th>Recorded</th>
              <th>Pinches</th>
              <th>Open / close</th>
              <th>Reaction</th>
              <th>Accuracy</th>
              <th>Hand usage (L / R)</th>
            </tr>
          </thead>
          <tbody>
            {motionRecords.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.id}</strong><br /><span>{record.sessionId}</span></td>
                <td>{record.playerName}</td>
                <td>{record.activityType}</td>
                <td>{formatDateTime(record.recordedAt)}</td>
                <td>{record.pinchCount}</td>
                <td>{record.handOpenCloseCount}</td>
                <td>{formatReactionTime(record.averageReactionTimeMs)}</td>
                <td><StatusBadge tone={record.motionAccuracyPercentage >= 80 ? "success" : record.motionAccuracyPercentage >= 60 ? "warning" : "danger"}>{record.motionAccuracyPercentage}%</StatusBadge></td>
                <td>
                  <div className={styles.handSplit} title={`${record.leftHandUsagePercentage}% left, ${record.rightHandUsagePercentage}% right`}>
                    <span style={{ width: `${record.leftHandUsagePercentage}%` }} />
                    <span style={{ width: `${record.rightHandUsagePercentage}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
