"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FishKind } from "@/database/fish";
import { releaseUserFish } from "../actions";

const fishEmoji: Record<FishKind, string> = {
  goldfish: "🐠",
  bluefish: "🐟",
  koi: "🐡",
  angelfish: "🐠",
};

export default function DashboardPond({ fish }: { fish: { id: string; fishKind: FishKind }[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleFish = fish.slice(-8);

  function releaseFish(fishId: string) {
    setError(null);
    startTransition(async () => {
      const result = await releaseUserFish(fishId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        className="dashboard-pond"
        onClick={() => { setError(null); setIsOpen(true); }}
        type="button"
        aria-label={`Manage pond. ${fish.length} fish caught.`}
      >
        <span className="dashboard-pond-label"><strong>My pond</strong><small>{fish.length === 0 ? "Pond is empty" : `${fish.length} fish caught`}</small></span>
        <span className="dashboard-pond-water" aria-hidden="true">
          {visibleFish.map((entry, index) => (
            <span className={`dashboard-pond-fish dashboard-pond-fish-${index % 4}`} key={entry.id}>{fishEmoji[entry.fishKind]}</span>
          ))}
          {visibleFish.length === 0 ? <span className="dashboard-pond-empty">∿</span> : null}
        </span>
        <span className="dashboard-pond-reeds" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setIsOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog dashboard-fish-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-fish-title">
            <div className="dashboard-table-flower-heading"><p>My pond</p><h2 id="dashboard-fish-title">Caught fishes</h2></div>
            {fish.length > 0 ? (
              <div className="dashboard-table-flower-grid">
                {fish.map((entry) => (
                  <article className="dashboard-fish-option" key={entry.id}>
                    <span aria-hidden="true">{fishEmoji[entry.fishKind]}</span>
                    <strong>{formatFishName(entry.fishKind)}</strong>
                    <button disabled={isPending} onClick={() => releaseFish(entry.id)} type="button">Release fish</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty">
                <span className="dashboard-fish-dialog-icon" aria-hidden="true">∿</span>
                <strong>Your pond is empty</strong>
                <p>Use the gaming board to play Catching fishes.</p>
              </div>
            )}
            {error ? <p className="dashboard-table-flower-error">{error}</p> : null}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} onClick={() => setIsOpen(false)} type="button">Close</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function formatFishName(kind: FishKind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
