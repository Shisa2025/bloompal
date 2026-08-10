"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { useTranslations } from "next-intl";

type DashboardWardrobePreviewProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DashboardWardrobePreview({
  isOpen,
  onClose,
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
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
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
        <div className="dashboard-wardrobe-icon" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="dashboard-table-flower-heading">
          <p>{t("bedroomWardrobe")}</p>
          <h2 id="dashboard-wardrobe-title">{t("wardrobeComingSoon")}</h2>
          <span>{t("wardrobeComingSoonHint")}</span>
        </div>
        <div className="dashboard-table-flower-actions">
          <button
            className="dashboard-table-flower-secondary"
            onClick={onClose}
            type="button"
          >
            {t("close")}
          </button>
        </div>
      </section>
    </div>
  );
}
