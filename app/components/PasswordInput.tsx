"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { useTranslations } from "next-intl";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export default function PasswordInput({
  className,
  disabled,
  id,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations("Common");
  const actionLabel = isVisible ? t("hidePassword") : t("showPassword");

  return (
    <div className="password-input-wrapper">
      <input
        {...props}
        className={["password-input-control", className].filter(Boolean).join(" ")}
        disabled={disabled}
        id={id}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-controls={id}
        aria-label={actionLabel}
        aria-pressed={isVisible}
        className="password-visibility-button"
        disabled={disabled}
        onClick={() => setIsVisible((visible) => !visible)}
        title={actionLabel}
        type="button"
      >
        <svg aria-hidden="true" fill="none" focusable="false" viewBox="0 0 24 24">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.75" />
          {isVisible ? <path d="m4 4 16 16" /> : null}
        </svg>
      </button>
    </div>
  );
}
