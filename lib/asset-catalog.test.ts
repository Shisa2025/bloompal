import { existsSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import enMessages from "../messages/en-SG.json";
import zhMessages from "../messages/zh-CN.json";
import {
  assetCatalog,
  getCatalogAsset,
  getShopThumbnailPath,
  musicCatalog,
  sellableAssetCatalog,
  type CatalogAsset,
} from "./asset-catalog";

describe("asset catalog", () => {
  it("registers every bundled GLB and MP3 exactly once", () => {
    const registeredPaths = assetCatalog.map((asset) => asset.assetPath);
    const diskPaths = [
      ...listFiles(join(process.cwd(), "public", "meshes"), ".glb"),
      ...listFiles(join(process.cwd(), "public", "audio"), ".mp3"),
    ];

    expect(new Set(registeredPaths).size).toBe(registeredPaths.length);
    expect([...registeredPaths].sort()).toEqual(diskPaths.sort());
    registeredPaths.forEach((assetPath) => {
      expect(existsSync(join(process.cwd(), "public", assetPath))).toBe(true);
    });
  });

  it("uses unique IDs and complete bilingual names", () => {
    expect(new Set(assetCatalog.map((asset) => asset.id)).size).toBe(
      assetCatalog.length,
    );

    assetCatalog.forEach((asset) => {
      expect(readName(enMessages.Assets.names, asset)).toBeTruthy();
      expect(readName(zhMessages.Assets.names, asset)).toBeTruthy();
    });
    const sourceMappings = assetCatalog.flatMap((asset) => {
      const sourceValue = (asset as CatalogAsset).sourceValue;
      return sourceValue ? [`${asset.category}:${sourceValue}`] : [];
    });
    expect(new Set(sourceMappings).size).toBe(sourceMappings.length);
  });

  it("sets the first shop economy prices", () => {
    musicCatalog.forEach((track) => {
      expect(track.buyPrice).toBe(10);
      expect(track.previewSeconds).toBe(15);
      expect("sellPrice" in track).toBe(false);
      expect(track.artist).toBeTruthy();
      expect(track.license).toBe("CC0 1.0");
      expect(track.sourceUrl).toMatch(/^https:\/\/opengameart\.org\//);
    });
    assetCatalog
      .filter((asset) => ["flower", "bug", "fish", "fruit"].includes(asset.category))
      .forEach((asset) =>
        expect((asset as CatalogAsset).sellPrice).toBe(1),
      );
    expect(assetCatalog).toHaveLength(27);
    expect(assetCatalog.filter((asset) => asset.assetPath.endsWith(".glb"))).toHaveLength(24);
  });

  it("provides a unique 512px WebP thumbnail for every shop resource and merchant", async () => {
    const merchant = getCatalogAsset("character-mooncap-merchant");
    if (!merchant) throw new Error("Rabbit merchant is missing from the catalog.");
    const thumbnailPaths = [...sellableAssetCatalog, merchant].map((asset) =>
      getShopThumbnailPath(asset),
    );

    expect(thumbnailPaths).toHaveLength(23);
    expect(new Set(thumbnailPaths).size).toBe(thumbnailPaths.length);

    await Promise.all(
      thumbnailPaths.map(async (thumbnailPath) => {
        expect(thumbnailPath).toMatch(/^\/assets\/shop-thumbnails\/.+\.webp$/);
        const diskPath = join(process.cwd(), "public", thumbnailPath!);
        expect(existsSync(diskPath)).toBe(true);
        const metadata = await sharp(diskPath).metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.width).toBe(512);
        expect(metadata.height).toBe(512);
        expect(metadata.hasAlpha).toBe(true);
      }),
    );
  });
});

function listFiles(root: string, extension: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(path, extension);
    if (!entry.name.endsWith(extension)) return [];
    return [
      `/${relative(join(process.cwd(), "public"), path).split(sep).join("/")}`,
    ];
  });
}

function readName(names: Record<string, string>, asset: CatalogAsset) {
  return names[asset.nameKey.replace(/^names\./, "")];
}
