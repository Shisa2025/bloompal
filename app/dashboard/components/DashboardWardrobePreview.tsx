"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import {
  dashboardOutfits,
  type DashboardOutfitId,
  type PurchasableDashboardOutfitId,
} from "./dashboardOutfits";

type DashboardWardrobePreviewProps = {
  error?: string | null;
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelectOutfit: (outfitId: DashboardOutfitId) => void;
  ownedOutfitIds: readonly PurchasableDashboardOutfitId[];
  selectedOutfitId: DashboardOutfitId;
};

export default function DashboardWardrobePreview({
  error = null,
  isOpen,
  isPending = false,
  onClose,
  onSelectOutfit,
  ownedOutfitIds,
  selectedOutfitId,
}: DashboardWardrobePreviewProps) {
  const t = useTranslations("Dashboard");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isPending) onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isPending) onClose();
  };

  return (
    <div
      className="dashboard-table-flower-overlay dashboard-wardrobe-overlay"
      onMouseDown={closeFromBackdrop}
      role="presentation"
    >
      <section
        aria-labelledby="dashboard-wardrobe-title"
        aria-modal="true"
        className="dashboard-table-flower-dialog dashboard-wardrobe-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <div className="dashboard-wardrobe-header">
          <div className="dashboard-wardrobe-icon" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="dashboard-table-flower-heading dashboard-wardrobe-heading">
            <p>{t("bedroomWardrobe")}</p>
            <h2 id="dashboard-wardrobe-title">{t("wardrobeChooseOutfit")}</h2>
            <span>{t("wardrobeChooseOutfitHint")}</span>
          </div>
          <button
            aria-label={t("close")}
            className="dashboard-wardrobe-close"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="dashboard-wardrobe-grid">
          {dashboardOutfits
            .filter(
              (outfit) =>
                !outfit.ownable || ownedOutfitIds.includes(outfit.id),
            )
            .map((outfit) => {
            const isSelected = outfit.id === selectedOutfitId;
            return (
              <button
                aria-pressed={isSelected}
                className={[
                  "dashboard-wardrobe-option",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={outfit.id}
                disabled={isPending}
                onClick={() => onSelectOutfit(outfit.id)}
                type="button"
              >
                <span className="dashboard-wardrobe-swatch-frame">
                  <span
                    aria-hidden="true"
                    className={`dashboard-wardrobe-swatch is-${outfit.id}`}
                  >
                    <span className="dashboard-wardrobe-swatch-body" />
                    <span className="dashboard-wardrobe-swatch-sleeve is-left" />
                    <span className="dashboard-wardrobe-swatch-sleeve is-right" />
                  </span>
                </span>
                <span className="dashboard-wardrobe-option-copy">
                  <strong>{t(outfit.nameKey)}</strong>
                  <span>{t(outfit.descriptionKey)}</span>
                  <small>
                    {isSelected ? t("outfitEquipped") : t("equipOutfit")}
                  </small>
                </span>
              </button>
            );
            })}
        </div>
        {error ? (
          <p className="dashboard-table-flower-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
