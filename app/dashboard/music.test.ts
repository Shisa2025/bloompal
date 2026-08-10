import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultMusicPreferences,
  getMusicStorageKey,
  getMusicTrack,
  musicTracks,
  parseMusicPreferences,
} from "./music";

describe("dashboard music catalog", () => {
  it("uses unique IDs and bundled MP3 files for every track", () => {
    expect(new Set(musicTracks.map((track) => track.id)).size).toBe(musicTracks.length);
    expect(new Set(musicTracks.map((track) => track.src)).size).toBe(musicTracks.length);

    for (const track of musicTracks) {
      expect(track.src).toMatch(/^\/audio\/[a-z-]+\.mp3$/);
      const assetPath = join(process.cwd(), "public", track.src);
      expect(existsSync(assetPath)).toBe(true);
      expect(statSync(assetPath).size).toBeGreaterThan(100_000);
    }
  });

  it("starts without a track and uses an account-scoped storage key", () => {
    expect(defaultMusicPreferences.trackId).toBeNull();
    expect(getMusicTrack(defaultMusicPreferences.trackId)).toBeUndefined();
    expect(getMusicStorageKey("user.name")).toBe("bloompal:music:v1:user.name");
  });
});

describe("music preference parsing", () => {
  it("restores a valid track and volume", () => {
    expect(
      parseMusicPreferences(
        JSON.stringify({ trackId: "dream", volume: 0.72 }),
        ["dream"],
      ),
    ).toEqual({ trackId: "dream", volume: 0.72 });
  });

  it("clamps volume and falls back from unknown tracks", () => {
    expect(
      parseMusicPreferences(
        JSON.stringify({ trackId: "missing", volume: 4 }),
        ["calm-loop"],
      ),
    ).toEqual({ trackId: "calm-loop", volume: 1 });
    expect(
      parseMusicPreferences(
        JSON.stringify({ trackId: "chill-loopable", volume: -2 }),
        ["chill-loopable"],
      ),
    ).toEqual({ trackId: "chill-loopable", volume: 0 });
  });

  it("does not let unavailable or legacy preferences grant ownership", () => {
    expect(parseMusicPreferences(null, [])).toEqual(defaultMusicPreferences);
    expect(parseMusicPreferences("not-json", [])).toEqual(defaultMusicPreferences);
    expect(
      parseMusicPreferences(
        JSON.stringify({ trackId: "dream", volume: 0.6 }),
        [],
      ),
    ).toEqual({ trackId: null, volume: 0.6 });
    expect(parseMusicPreferences(JSON.stringify({ volume: "loud" }), [])).toEqual(
      defaultMusicPreferences,
    );
  });
});
