"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveLoginLanguageChoice } from "@/app/locale-actions";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/i18n/routing";

type LoginLanguagePromptProps = {
  children: ReactNode;
  initiallyOpen: boolean;
};

export default function LoginLanguagePrompt({
  children,
  initiallyOpen,
}: LoginLanguagePromptProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth");
  const dialogRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      const currentLocaleButton = dialogRef.current?.querySelector<HTMLElement>(
        `[data-locale="${locale}"]`,
      );
      currentLocaleButton?.focus();
    });

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused !== document.body) {
        previouslyFocused.focus();
      } else {
        document.getElementById("identifier")?.focus();
      }
    };
  }, [isOpen, locale]);

  useEffect(() => {
    if (!isOpen || isPending) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isPending]);

  function dismiss() {
    if (!isPending) setIsOpen(false);
  }

  function dismissFromBackdrop(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) dismiss();
  }

  function chooseLanguage(nextLocale: SupportedLocale) {
    if (isPending) return;
    setHasError(false);

    startTransition(async () => {
      try {
        const result = await saveLoginLanguageChoice(nextLocale);
        if (!result.ok) {
          setHasError(true);
          return;
        }

        setIsOpen(false);
        if (nextLocale !== locale) {
          const search = searchParams.toString();
          const href = search ? `${pathname}?${search}` : pathname;
          router.replace(href, { locale: nextLocale });
        }
      } catch {
        setHasError(true);
      }
    });
  }

  return (
    <>
      <div aria-hidden={isOpen || undefined} inert={isOpen}>
        {children}
      </div>

      {isOpen ? (
        <div
          className="login-language-overlay"
          onMouseDown={dismissFromBackdrop}
          role="presentation"
        >
          <section
            aria-busy={isPending}
            aria-describedby="login-language-description"
            aria-labelledby="login-language-title"
            aria-modal="true"
            className="login-language-dialog"
            ref={dialogRef}
            role="dialog"
          >
            <button
              aria-label={t("closeLanguagePrompt")}
              className="login-language-close"
              disabled={isPending}
              onClick={dismiss}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="login-language-mark" aria-hidden="true">
              文 · A
            </div>
            <p className="login-kicker">BloomPal</p>
            <h2 id="login-language-title">{t("languagePromptTitle")}</h2>
            <p id="login-language-description">{t("languagePromptDescription")}</p>

            <div className="login-language-options">
              <button
                data-locale="zh-CN"
                disabled={isPending}
                onClick={() => chooseLanguage("zh-CN")}
                type="button"
              >
                <span className="login-language-option-code" aria-hidden="true">中</span>
                <span><strong>中文</strong><small>Chinese</small></span>
              </button>
              <button
                data-locale="en-SG"
                disabled={isPending}
                onClick={() => chooseLanguage("en-SG")}
                type="button"
              >
                <span className="login-language-option-code" aria-hidden="true">EN</span>
                <span><strong>English</strong><small>英文</small></span>
              </button>
            </div>

            {isPending ? <p className="login-language-status" role="status">{t("savingLanguage")}</p> : null}
            {hasError ? <p className="login-language-error" role="alert">{t("languageSelectionFailed")}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
