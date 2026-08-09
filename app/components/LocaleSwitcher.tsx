"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { saveLocalePreference } from "@/app/locale-actions";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/i18n/routing";

export default function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale || isPending) return;
    const search = searchParams.toString();
    const href = search ? `${pathname}?${search}` : pathname;

    startTransition(async () => {
      try {
        await saveLocalePreference(nextLocale);
      } finally {
        router.replace(href, { locale: nextLocale });
      }
    });
  }

  return (
    <div
      aria-label={t("language")}
      className={`locale-switcher${compact ? " locale-switcher-compact" : ""}`}
      role="group"
    >
      <button
        aria-label={`${t("switchLanguage")}: ${t("english")}`}
        aria-pressed={locale === "en-SG"}
        disabled={isPending}
        onClick={() => switchLocale("en-SG")}
        type="button"
      >
        EN
      </button>
      <button
        aria-label={`${t("switchLanguage")}: ${t("chinese")}`}
        aria-pressed={locale === "zh-CN"}
        disabled={isPending}
        onClick={() => switchLocale("zh-CN")}
        type="button"
      >
        中文
      </button>
    </div>
  );
}
