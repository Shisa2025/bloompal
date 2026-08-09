"use client";

import { useState } from "react";
import type { UserGameHistoryEntry } from "@/database/game-sessions";
import { useFormatter, useTranslations } from "next-intl";

export default function GameHistoryButton({ history }: { history: UserGameHistoryEntry[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Dashboard");
  const format = useFormatter();

  return (
    <>
      <button className="dashboard-logout-button" onClick={() => setIsOpen(true)} type="button">{t("gameHistory")}</button>
      {isOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog dashboard-history-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-history-title">
            <div className="dashboard-table-flower-heading"><p>{t("yourActivity")}</p><h2 id="dashboard-history-title">{t("gameHistory")}</h2></div>
            {history.length > 0 ? (
              <div className="dashboard-history-list">
                {history.map((entry) => (
                  <article className="dashboard-history-entry" key={entry.id}>
                    <span className="dashboard-history-icon" aria-hidden="true">{gameIcon(entry.activityType)}</span>
                    <div><strong>{t(`activity.${entry.activityType}`)}</strong><time dateTime={entry.completedAt}>{format.dateTime(new Date(entry.completedAt), { dateStyle: "medium", timeStyle: "short" })}</time></div>
                    <span className="dashboard-history-duration">{formatDuration(entry.durationSeconds, t)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty"><span className="dashboard-history-empty-icon" aria-hidden="true">◎</span><strong>{t("noCompletedGames")}</strong><p>{t("historyEmptyHint")}</p></div>
            )}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" onClick={() => setIsOpen(false)} type="button">{t("close")}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function gameIcon(activity: UserGameHistoryEntry["activityType"]) {
  if (activity === "pluck_fruit") return "\uD83C\uDF4E";
  if (activity === "watering") return "💧";
  if (activity === "collect_bugs") return "🐞";
  if (activity === "catch_fish") return "🐟";
  return "📷";
}

function formatDuration(seconds: number | null, t: ReturnType<typeof useTranslations<"Dashboard">>) {
  if (seconds === null) return t("timeUnavailable");
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? t("minutesSeconds", { minutes, seconds: remainder }) : t("seconds", { seconds: remainder });
}
