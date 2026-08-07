import { describe, expect, it } from "vitest";
import { filterAdminOptions, type AdminOption } from "./admin-options";

const admins: AdminOption[] = [
  {
    userid: "garden-admin",
    displayName: "Grace Tan",
    organization: "Sunrise Care",
  },
  {
    userid: "bloom-admin",
    displayName: "李阿姨",
    organization: "幸福养老中心",
  },
  {
    userid: "legacy-admin",
    displayName: "Morgan Lee",
    organization: null,
  },
];

describe("Admin option filtering", () => {
  it("searches case-insensitively by ID, name, and organization", () => {
    expect(filterAdminOptions(admins, "BLOOM")).toEqual([admins[1]]);
    expect(filterAdminOptions(admins, "grace")).toEqual([admins[0]]);
    expect(filterAdminOptions(admins, "养老")).toEqual([admins[1]]);
  });

  it("includes legacy Admins by the missing-organization label", () => {
    expect(filterAdminOptions(admins, "not PROVIDED")).toEqual([admins[2]]);
  });

  it("returns all Admins for blank input and none for no match", () => {
    expect(filterAdminOptions(admins, "  ")).toEqual(admins);
    expect(filterAdminOptions(admins, "does-not-exist")).toEqual([]);
  });
});
