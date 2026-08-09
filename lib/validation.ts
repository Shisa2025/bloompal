import { z } from "zod";
import type { ErrorCode } from "@/lib/message-codes";

export const useridSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,29}$/,
    "validationUserid",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "validationNameMin")
  .max(120, "validationNameMax");

export const organizationSchema = z
  .string()
  .trim()
  .min(2, "validationOrganizationMin")
  .max(120, "validationOrganizationMax");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("validationEmail"));

export const passwordSchema = z
  .string()
  .min(8, "validationPasswordMin")
  .max(128, "validationPasswordMax")
  .regex(/[A-Za-z]/, "validationPasswordLetter")
  .regex(/[0-9]/, "validationPasswordNumber");

export const accountInputSchema = z.object({
  userid: useridSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export function firstValidationErrorCode(error: z.ZodError): ErrorCode {
  return (error.issues[0]?.message as ErrorCode | undefined) ?? "validationGeneric";
}

export function normalizeDurationSeconds(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(7200, Math.max(1, Math.round(value)));
}
