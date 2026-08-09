import styles from "../dashboard.module.css";
import { getFormatter, getTranslations } from "next-intl/server";

type DataPoint = { label: string; value: number };

export async function BarChart({
  data,
  suffix = "",
  compact = false,
}: {
  data: DataPoint[];
  suffix?: string;
  compact?: boolean;
}) {
  const t = await getTranslations("Admin");
  const format = await getFormatter();
  if (!data.length) return <p className={styles.emptyState}>{t("noActivityPeriod")}</p>;
  const max = Math.max(...data.map((point) => point.value));
  return (
    <div className={`${styles.barChart} ${compact ? styles.barChartCompact : ""}`}>
      {data.map((point) => (
        <div className={styles.barItem} key={point.label}>
          <span className={styles.barValue}>{format.number(point.value)}{suffix}</span>
          <div className={styles.barTrack}>
            <span style={{ height: `${Math.max((point.value / max) * 100, 8)}%` }} />
          </div>
          <span className={styles.barLabel}>{point.label}</span>
        </div>
      ))}
    </div>
  );
}
export async function LineChart({
  data,
  suffix = "",
}: {
  data: DataPoint[];
  suffix?: string;
}) {
  const t = await getTranslations("Admin");
  const format = await getFormatter();
  if (!data.length) return <p className={styles.emptyState}>{t("noActivityPeriod")}</p>;
  const min = Math.min(...data.map((point) => point.value));
  const max = Math.max(...data.map((point) => point.value));
  const range = max - min || 1;
  const points = data.map((point, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 82 - ((point.value - min) / range) * 58;
    return { ...point, x, y };
  });

  return (
    <div className={styles.lineChart}>
      <svg aria-label={t("trendChart")} preserveAspectRatio="none" role="img" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5f9f82" stopOpacity=".28" />
            <stop offset="100%" stopColor="#5f9f82" stopOpacity=".02" />
          </linearGradient>
        </defs>
        <path className={styles.gridLine} d="M0 24H100M0 53H100M0 82H100" />
        <polygon fill="url(#chartFill)" points={`0,88 ${points.map((point) => `${point.x},${point.y}`).join(" ")} 100,88`} />
        <polyline className={styles.trendLine} points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
        {points.map((point) => <circle className={styles.trendDot} cx={point.x} cy={point.y} key={point.label} r="2" />)}
      </svg>
      <div className={styles.lineLabels}>
        {points.map((point) => (
          <span key={point.label}><small>{format.number(point.value)}{suffix}</small>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export async function HorizontalBars({ data, suffix = "%" }: { data: DataPoint[]; suffix?: string }) {
  const t = await getTranslations("Admin");
  const format = await getFormatter();
  if (!data.length) return <p className={styles.emptyState}>{t("noActivityPeriod")}</p>;
  const max = Math.max(...data.map((point) => point.value));
  return (
    <div className={styles.horizontalBars}>
      {data.map((point, index) => (
        <div className={styles.horizontalBar} key={point.label}>
          <div><span>{point.label}</span><strong>{format.number(point.value)}{suffix}</strong></div>
          <div className={styles.horizontalTrack}>
            <span className={styles[`chartTone${(index % 5) + 1}`]} style={{ width: `${(point.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
