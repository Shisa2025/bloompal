"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleFish = fish.slice(-8);

  function releaseFish(fishId: string) {
    setError(null);
    startTransition(async () => {
      const result = await releaseUserFish(fishId);
      if (!result.ok) {
        setError(tErrors(result.errorCode));
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
        aria-label={t("managePond", { count: fish.length })}
      >
        <span className="dashboard-pond-label"><strong>{t("myPond")}</strong><small>{fish.length === 0 ? t("pondEmpty") : t("fishCaught", { count: fish.length })}</small></span>
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
            <div className="dashboard-table-flower-heading"><p>{t("myPond")}</p><h2 id="dashboard-fish-title">{t("caughtFish")}</h2></div>
            {fish.length > 0 ? (
              <div className="dashboard-table-flower-grid">
                {fish.map((entry) => (
                  <article className="dashboard-fish-option" key={entry.id}>
                    <span aria-hidden="true">{fishEmoji[entry.fishKind]}</span>
                    <strong>{t(`fish.${entry.fishKind}`)}</strong>
                    <button disabled={isPending} onClick={() => releaseFish(entry.id)} type="button">{t("releaseFish")}</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty">
                <span className="dashboard-fish-dialog-icon" aria-hidden="true">∿</span>
                <strong>{t("yourPondEmpty")}</strong>
                <p>{t("pondEmptyHint")}</p>
              </div>
            )}
            {error ? <p className="dashboard-table-flower-error">{error}</p> : null}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} onClick={() => setIsOpen(false)} type="button">{t("close")}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}
