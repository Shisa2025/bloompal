"use client";

import { useTranslations } from "next-intl";

type DesktopOnlyProps = {
  children: React.ReactNode;
};

export default function DesktopOnly({ children }: DesktopOnlyProps) {
  const t = useTranslations("Common");
  return (
    <div className="desktop-only-shell">
      <div className="desktop-only-content">{children}</div>
      <div className="desktop-only-message" role="status">
        <p>{t("desktopOnly")}</p>
      </div>
    </div>
  );
}
