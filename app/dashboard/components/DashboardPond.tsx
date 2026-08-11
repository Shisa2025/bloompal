"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import FishModel from "@/app/components/FishModel";
import type { FishKind } from "@/lib/fish-assets";
import { getCatalogAssetBySource } from "@/lib/asset-catalog";
import { releaseUserFish } from "../actions";

type DashboardPondProps = {
  fish: { id: string; fishKind: FishKind }[];
  isOpen: boolean;
  onClose: () => void;
};

export default function DashboardPond({
  fish,
  isOpen,
  onClose,
}: DashboardPondProps) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tAssets = useTranslations("Assets");
  const tErrors = useTranslations("Errors");
  const dialogRef = useRef<HTMLElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeDialog = useCallback(() => {
    if (isPending) return;
    setError(null);
    onClose();
  }, [isPending, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDialog, isOpen, isPending]);

  if (!isOpen) return null;

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
    <div
      className="dashboard-table-flower-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <section
        aria-labelledby="dashboard-fish-title"
        aria-modal="true"
        className="dashboard-table-flower-dialog dashboard-fish-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <div className="dashboard-table-flower-heading">
          <p>{t("myPond")}</p>
          <h2 id="dashboard-fish-title">{t("caughtFish")}</h2>
        </div>
        {fish.length > 0 ? (
          <div className="dashboard-table-flower-grid">
            {fish.map((entry) => (
              <article className="dashboard-fish-option" key={entry.id}>
                <span className="dashboard-fish-option-model" aria-hidden="true">
                  <FishModel fishKind={entry.fishKind} />
                </span>
                <strong>
                  {tAssets(
                    getCatalogAssetBySource("fish", entry.fishKind)!.nameKey,
                  )}
                </strong>
                <button
                  disabled={isPending}
                  onClick={() => releaseFish(entry.id)}
                  type="button"
                >
                  {t("releaseFish")}
                </button>
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
        <div className="dashboard-table-flower-actions">
          <button
            className="dashboard-table-flower-secondary"
            disabled={isPending}
            onClick={closeDialog}
            type="button"
          >
            {t("close")}
          </button>
        </div>
      </section>
    </div>
  );
}
