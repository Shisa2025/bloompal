import {
  isMusicTrackId,
  musicCatalog,
  type MusicTrackId,
} from "../../lib/asset-catalog";

export const musicTracks = musicCatalog.map((track) => ({
  id: track.id,
  src: track.assetPath,
  nameKey: track.nameKey,
  artist: track.artist,
  license: track.license,
  sourceUrl: track.sourceUrl,
  buyPrice: track.buyPrice,
  previewSeconds: track.previewSeconds,
}));

export type MusicTrack = (typeof musicTracks)[number];
export type { MusicTrackId };

export type MusicPreferences = {
  trackId: MusicTrackId | null;
  volume: number;
};

export const defaultMusicPreferences: MusicPreferences = {
  trackId: null,
  volume: 0.45,
};

export function getMusicStorageKey(userid: string) {
  return `bloompal:music:v1:${userid}`;
}

export function getMusicTrack(trackId: MusicTrackId | null) {
  if (!trackId) return undefined;
  return musicTracks.find((track) => track.id === trackId);
}

export function parseMusicPreferences(
  rawValue: string | null,
  ownedTrackIds: readonly MusicTrackId[],
): MusicPreferences {
  const fallbackTrackId = ownedTrackIds[0] ?? null;
  if (!rawValue) {
    return { trackId: fallbackTrackId, volume: defaultMusicPreferences.volume };
  }

  try {
    const value = JSON.parse(rawValue) as { trackId?: unknown; volume?: unknown };
    const trackId =
      isMusicTrackId(value.trackId) && ownedTrackIds.includes(value.trackId)
        ? value.trackId
        : fallbackTrackId;
    const volume =
      typeof value.volume === "number" && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume))
        : defaultMusicPreferences.volume;

    return { trackId, volume };
  } catch {
    return { trackId: fallbackTrackId, volume: defaultMusicPreferences.volume };
  }
}
