import type { SupportedLocale } from "@/i18n/routing";

export function formatDateTime(value: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}
export function formatDate(value: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

export function formatReactionTime(milliseconds: number, locale: SupportedLocale) {
  const seconds = new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(milliseconds / 1000);
  return locale === "zh-CN" ? `${seconds} 秒` : `${seconds}s`;
}

export function formatDuration(seconds: number | null, locale: SupportedLocale) {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (locale === "zh-CN") return minutes ? `${minutes} 分 ${remainingSeconds} 秒` : `${remainingSeconds} 秒`;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}
