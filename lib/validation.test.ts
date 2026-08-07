import { describe, expect, it } from "vitest";
import {
  accountInputSchema,
  normalizeDurationSeconds,
  organizationSchema,
  passwordSchema,
  useridSchema,
} from "./validation";

describe("account validation", () => {
  it("normalizes a valid account", () => {
    const result = accountInputSchema.parse({ userid: "  Bloom.User  ", displayName: "  Bloom User  ", email: "  USER@Example.com ", password: "garden123" });
    expect(result).toMatchObject({ userid: "bloom.user", displayName: "Bloom User", email: "user@example.com" });
  });
  it("rejects invalid IDs and weak passwords", () => {
    expect(useridSchema.safeParse("A").success).toBe(false);
    expect(passwordSchema.safeParse("password").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });

  it("accepts and trims Unicode organization names", () => {
    expect(organizationSchema.parse("  幸福养老中心  ")).toBe("幸福养老中心");
  });

  it("rejects organizations outside the 2-120 character range", () => {
    expect(organizationSchema.safeParse(" ").success).toBe(false);
    expect(organizationSchema.safeParse("A").success).toBe(false);
    expect(organizationSchema.safeParse("A".repeat(121)).success).toBe(false);
  });
});

describe("duration normalization", () => {
  it("rounds and clamps values to the database range", () => {
    expect(normalizeDurationSeconds(12.6)).toBe(13);
    expect(normalizeDurationSeconds(-4)).toBe(1);
    expect(normalizeDurationSeconds(99_999)).toBe(7200);
  });
});
