import { describe, expect, it } from "vitest";
import enMessages from "../messages/en-SG.json";
import zhMessages from "../messages/zh-CN.json";
import { serializeCsv } from "./csv";

describe("localized CSV data", () => {
  it("provides translated headers and enum labels for both locales", () => {
    expect(enMessages.Reports.csv.userId).toBe("User ID");
    expect(zhMessages.Reports.csv.userId).toBe("用户 ID");
    expect(enMessages.Reports.csv.status.active).toBe("Active");
    expect(zhMessages.Reports.csv.status.active).toBe("启用");
    expect(enMessages.Reports.csv.activity.watering).toBe("Watering");
    expect(zhMessages.Reports.csv.activity.watering).toBe("浇水");
  });

  it("preserves IDs and JSON while escaping commas and quotes", () => {
    expect(serializeCsv([["user.id", "Name, One", '{"key":"value"}']])).toBe(
      'user.id,"Name, One","{""key"":""value""}"',
    );
  });
});
