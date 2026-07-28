import { BarChart, HorizontalBars, LineChart } from "../_components/charts";
import { PageHeader, Panel, SecondaryButton } from "../_components/ui";
import { activityPopularity, improvementTrend, sessionDurationTrend, weeklySessions } from "../_lib/mock-data";
import styles from "../dashboard.module.css";

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Progress insights"
        title="Analytics"
        description="Prototype views for engagement, session duration, improvement, and activity preferences."
        action={<SecondaryButton icon="calendar">Last 6 weeks</SecondaryButton>}
      />
      <section className={styles.insightStrip}>
        <article className={styles.insight}><span>Session consistency</span><strong>82%</strong><p>Most active players complete at least two sessions weekly.</p></article>
        <article className={styles.insight}><span>Best performing activity</span><strong>Picking Fruits</strong><p>Highest average completion score in the mock dataset.</p></article>
        <article className={styles.insight}><span>Average improvement</span><strong>+12.4%</strong><p>Prototype comparison against the previous six-week period.</p></article>
      </section>
      <div className={styles.analyticsGrid}>
        <Panel title="Weekly session count" subtitle="Completed sessions by day">
          <BarChart data={weeklySessions} />
        </Panel>
        <Panel title="Average session duration" subtitle="Minutes per session over six weeks">
          <LineChart data={sessionDurationTrend} suffix="m" />
        </Panel>
        <Panel title="Improvement trend" subtitle="Average progress score by month">
          <LineChart data={improvementTrend} suffix="%" />
        </Panel>
        <Panel title="Activity popularity" subtitle="Share of completed sessions">
          <HorizontalBars data={activityPopularity} />
        </Panel>
      </div>
    </>
  );
}
