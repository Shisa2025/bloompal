import { describe, expect, it, vi } from "vitest";
import {
  drawSnapshotCanvas,
  snapshotFilterIds,
  snapshotFilterStyles,
} from "./snapshotFilters";

describe("snapshot filters", () => {
  it("registers the four selectable filters", () => {
    expect(snapshotFilterIds).toEqual([
      "natural",
      "warm",
      "cool",
      "vintage",
    ]);
    expect(snapshotFilterStyles.natural).toBe("none");
  });

  it("uses the selected filter while drawing the saved 16:9 image", () => {
    const calls: string[] = [];
    const context = {
      filter: "none",
      save: vi.fn(() => calls.push("save")),
      drawImage: vi.fn(() => calls.push("draw")),
      restore: vi.fn(() => calls.push("restore")),
    } as unknown as CanvasRenderingContext2D;
    const source = { width: 800, height: 400 } as HTMLCanvasElement;

    drawSnapshotCanvas(context, source, 480, 270, "warm");

    expect(context.filter).toBe(snapshotFilterStyles.warm);
    expect(calls).toEqual(["save", "draw", "restore"]);
    expect(context.drawImage).toHaveBeenCalledWith(
      source,
      44.44444444444446,
      0,
      711.1111111111111,
      400,
      0,
      0,
      480,
      270,
    );
  });
});
