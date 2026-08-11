export const snapshotFilterIds = [
  "natural",
  "warm",
  "cool",
  "vintage",
] as const;

export type SnapshotFilterId = (typeof snapshotFilterIds)[number];

export const snapshotFilterStyles: Record<SnapshotFilterId, string> = {
  natural: "none",
  warm: "brightness(1.04) saturate(1.08) sepia(0.12)",
  cool: "brightness(1.02) saturate(0.94) hue-rotate(350deg)",
  vintage: "sepia(0.28) saturate(0.82) contrast(0.96) brightness(1.02)",
};

export function drawSnapshotCanvas(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  filterId: SnapshotFilterId,
) {
  const sourceAspect = source.width / source.height;
  const targetAspect = targetWidth / targetHeight;
  let sourceWidth = source.width;
  let sourceHeight = source.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspect > targetAspect) {
    sourceWidth = source.height * targetAspect;
    sourceX = (source.width - sourceWidth) / 2;
  } else if (sourceAspect < targetAspect) {
    sourceHeight = source.width / targetAspect;
    sourceY = (source.height - sourceHeight) / 2;
  }

  context.save();
  context.filter = snapshotFilterStyles[filterId];
  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  context.restore();
}
