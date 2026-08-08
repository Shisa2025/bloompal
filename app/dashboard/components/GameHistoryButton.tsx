"use client";

import { useState } from "react";
import type { UserGameHistoryEntry } from "@/database/game-sessions";

export default function GameHistoryButton({ history }: { history: UserGameHistoryEntry[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="dashboard-logout-button" onClick={() => setIsOpen(true)} type="button">Game history</button>
      {isOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog dashboard-history-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-history-title">
            <div className="dashboard-table-flower-heading"><p>Your activity</p><h2 id="dashboard-history-title">Game history</h2></div>
            {history.length > 0 ? (
              <div className="dashboard-history-list">
                {history.map((entry) => (
                  <article className="dashboard-history-entry" key={entry.id}>
                    <span className="dashboard-history-icon" aria-hidden="true">{gameIcon(entry.activityType)}</span>
                    <div><strong>{gameLabel(entry.activityType)}</strong><time dateTime={entry.completedAt}>{formatDateTime(entry.completedAt)}</time></div>
                    <span className="dashboard-history-duration">{formatDuration(entry.durationSeconds)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty"><span className="dashboard-history-empty-icon" aria-hidden="true">◎</span><strong>No completed games yet</strong><p>Your completed activities will appear here.</p></div>
            )}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" onClick={() => setIsOpen(false)} type="button">Close</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function gameLabel(activity: UserGameHistoryEntry["activityType"]) {
  if (activity === "watering") return "Watering";
  if (activity === "collect_bugs") return "Collecting bugs";
  if (activity === "catch_fish") return "Catching fishes";
  if (activity === "pluck_fruit") return "Fruit Plucking";
  return "Take a Snapshot";
}

function gameIcon(activity: UserGameHistoryEntry["activityType"]) {
  if (activity === "pluck_fruit") return "\uD83C\uDF4E";
  if (activity === "watering") return "💧";
  if (activity === "collect_bugs") return "🐞";
  if (activity === "catch_fish") return "🐟";
  return "📷";
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "Time unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
