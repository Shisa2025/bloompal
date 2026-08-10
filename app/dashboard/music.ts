export const musicTracks = [
  {
    id: "calm-loop",
    src: "/audio/calm-loop.mp3",
    titleKey: "musicTrackCalmLoop",
    artist: "wipics",
  },
  {
    id: "chill-loopable",
    src: "/audio/chill-loopable.mp3",
    titleKey: "musicTrackChill",
    artist: "Alex McCulloch",
  },
  {
    id: "dream",
    src: "/audio/dream.mp3",
    titleKey: "musicTrackDream",
    artist: "jkjkke",
  },
] as const;

export type MusicTrack = (typeof musicTracks)[number];
export type MusicTrackId = MusicTrack["id"];

export type MusicPreferences = {
  trackId: MusicTrackId;
  volume: number;
};

export const defaultMusicPreferences: MusicPreferences = {
  trackId: "calm-loop",
  volume: 0.45,
};

export function getMusicStorageKey(userid: string) {
  return `bloompal:music:v1:${userid}`;
}

export function getMusicTrack(trackId: MusicTrackId) {
  return musicTracks.find((track) => track.id === trackId) ?? musicTracks[0];
}

export function parseMusicPreferences(rawValue: string | null): MusicPreferences {
  if (!rawValue) return { ...defaultMusicPreferences };

  try {
    const value = JSON.parse(rawValue) as { trackId?: unknown; volume?: unknown };
    const trackId = isMusicTrackId(value.trackId)
      ? value.trackId
      : defaultMusicPreferences.trackId;
    const volume =
      typeof value.volume === "number" && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume))
        : defaultMusicPreferences.volume;

    return { trackId, volume };
  } catch {
    return { ...defaultMusicPreferences };
  }
}

function isMusicTrackId(value: unknown): value is MusicTrackId {
  return musicTracks.some((track) => track.id === value);
}
