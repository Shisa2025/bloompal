import { z } from "zod";

export const useridSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,29}$/,
    "User ID must be 3-30 lowercase letters, numbers, dots, underscores, or hyphens.",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120, "Name must be 120 characters or fewer.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const accountInputSchema = z.object({
  userid: useridSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the information and try again.";
}

export function normalizeDurationSeconds(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(7200, Math.max(1, Math.round(value)));
}
