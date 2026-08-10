"use client";

import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultMusicPreferences,
  getMusicStorageKey,
  getMusicTrack,
  musicTracks,
  parseMusicPreferences,
  type MusicPreferences,
} from "../music";
import type { MusicTrackId } from "@/lib/asset-catalog";

type DashboardMusicPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlaybackChange: (isPlaying: boolean) => void;
  onPreviewEnd: () => void;
  onPreviewError: () => void;
  ownedTrackIds: MusicTrackId[];
  preferenceOwnerId: string;
  previewTrackId: MusicTrackId | null;
};

const gramophoneTriggerId = "dashboard-gramophone-trigger";

export default function DashboardMusicPlayer({
  isOpen,
  onClose,
  onPlaybackChange,
  onPreviewEnd,
  onPreviewError,
  ownedTrackIds,
  preferenceOwnerId,
  previewTrackId,
}: DashboardMusicPlayerProps) {
  const t = useTranslations("Dashboard");
  const tAssets = useTranslations("Assets");
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const wasPreviewingRef = useRef(false);
  const [selectedTrackId, setSelectedTrackId] = useState<MusicTrackId | null>(
    null,
  );
  const [volume, setVolume] = useState(defaultMusicPreferences.volume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const storageKey = getMusicStorageKey(preferenceOwnerId);
  const ownedTracks = useMemo(
    () => musicTracks.filter((track) => ownedTrackIds.includes(track.id)),
    [ownedTrackIds],
  );

  const updatePlaybackState = useCallback(
    (nextIsPlaying: boolean) => {
      setIsPlaying(nextIsPlaying);
      onPlaybackChange(nextIsPlaying);
    },
    [onPlaybackChange],
  );

  const closePlayer = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => {
      document.getElementById(gramophoneTriggerId)?.focus();
    });
  }, [onClose]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let preferences: MusicPreferences = {
      trackId: ownedTrackIds[0] ?? null,
      volume: defaultMusicPreferences.volume,
    };
    try {
      preferences = parseMusicPreferences(
        window.localStorage.getItem(storageKey),
        ownedTrackIds,
      );
    } catch {
      // Browser storage is optional; database ownership remains authoritative.
    }

    setSelectedTrackId(preferences.trackId);
    setVolume(preferences.volume);
    audio.volume = preferences.volume;
    if (!previewTrackId) restoreOwnedSource(audio, preferences.trackId);
  }, [ownedTrackIds, previewTrackId, storageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (previewTrackId) {
      const preview = getMusicTrack(previewTrackId);
      if (!preview) {
        onPreviewError();
        onPreviewEnd();
        return;
      }
      wasPreviewingRef.current = true;
      audio.pause();
      audio.loop = false;
      audio.src = preview.src;
      audio.currentTime = 0;
      audio.load();
      void audio.play().catch(() => {
        setIsLoading(false);
        onPreviewError();
        onPreviewEnd();
      });
      return;
    }

    if (wasPreviewingRef.current) {
      wasPreviewingRef.current = false;
      audio.pause();
      audio.loop = true;
      restoreOwnedSource(audio, selectedTrackId);
    }
  }, [onPreviewEnd, onPreviewError, previewTrackId, selectedTrackId]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      const selected = dialogRef.current?.querySelector<HTMLElement>(
        '[aria-pressed="true"]',
      );
      (selected ?? dialogRef.current?.querySelector<HTMLElement>("button"))?.focus();
    });
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePlayer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closePlayer, isOpen]);

  function savePreferences(trackId: MusicTrackId | null, nextVolume: number) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ trackId, volume: nextVolume }),
      );
    } catch {
      // Playback should keep working when browser storage is unavailable.
    }
  }

  async function playAudio() {
    const audio = audioRef.current;
    const track = getMusicTrack(selectedTrackId);
    if (!audio || !track || !ownedTrackIds.includes(track.id)) return;

    setHasError(false);
    setIsLoading(true);
    try {
      if (audio.getAttribute("src") !== track.src) {
        audio.src = track.src;
        audio.load();
      }
      await audio.play();
    } catch {
      setHasError(true);
      updatePlaybackState(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function selectTrack(trackId: MusicTrackId) {
    const audio = audioRef.current;
    if (!audio || !ownedTrackIds.includes(trackId)) return;

    setSelectedTrackId(trackId);
    savePreferences(trackId, volume);
    setHasError(false);
    audio.src = getMusicTrack(trackId)!.src;
    audio.load();
    await playAudioFromElement(audio, updatePlaybackState, setHasError, setIsLoading);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || isLoading || !selectedTrackId) return;
    if (audio.paused) void playAudio();
    else audio.pause();
  }

  function changeVolume(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.target.value) / 100;
    const audio = audioRef.current;
    setVolume(nextVolume);
    if (audio) audio.volume = nextVolume;
    savePreferences(selectedTrackId, nextVolume);
  }

  function dismissFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closePlayer();
  }

  return (
    <>
      <audio
        aria-hidden="true"
        loop={!previewTrackId}
        onError={() => {
          setIsLoading(false);
          if (previewTrackId) {
            onPreviewError();
            onPreviewEnd();
          } else {
            setHasError(true);
            updatePlaybackState(false);
          }
        }}
        onPause={() => {
          updatePlaybackState(false);
        }}
        onPlay={() => {
          if (!previewTrackId) updatePlaybackState(true);
        }}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={(event) => {
          const preview = getMusicTrack(previewTrackId);
          if (
            previewTrackId &&
            preview &&
            event.currentTarget.currentTime >= preview.previewSeconds
          ) {
            event.currentTarget.pause();
            onPreviewEnd();
          }
        }}
        onWaiting={() => setIsLoading(true)}
        preload="metadata"
        ref={audioRef}
      />

      {isOpen ? (
        <div
          className="dashboard-table-flower-overlay dashboard-music-overlay"
          onMouseDown={dismissFromBackdrop}
          role="presentation"
        >
          <section
            aria-busy={isLoading}
            aria-labelledby="dashboard-music-title"
            aria-modal="true"
            className="dashboard-table-flower-dialog dashboard-music-dialog"
            ref={dialogRef}
            role="dialog"
          >
            <div className="dashboard-table-flower-heading dashboard-music-heading">
              <p>{t("gramophone")}</p>
              <h2 id="dashboard-music-title">{t("chooseMusic")}</h2>
              <span>{t("musicKeepsPlaying")}</span>
            </div>

            {ownedTracks.length > 0 ? (
              <div className="dashboard-music-track-list" aria-label={t("musicTracks")}>
                {ownedTracks.map((track) => (
                  <button
                    aria-pressed={selectedTrackId === track.id}
                    className={selectedTrackId === track.id ? "is-selected" : ""}
                    key={track.id}
                    onClick={() => void selectTrack(track.id)}
                    type="button"
                  >
                    <span className="dashboard-music-record" aria-hidden="true" />
                    <span>
                      <strong>{tAssets(track.nameKey)}</strong>
                      <small>{track.artist}</small>
                    </span>
                    <span className="dashboard-music-track-state">
                      {selectedTrackId === track.id && isPlaying
                        ? t("playing")
                        : t("playTrack")}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty dashboard-music-empty">
                <span className="dashboard-music-record" aria-hidden="true" />
                <strong>{t("noMusicOwned")}</strong>
                <p>{t("buyMusicFromRabbit")}</p>
              </div>
            )}

            <div className="dashboard-music-controls">
              <button
                aria-label={isPlaying ? t("pauseMusic") : t("playMusic")}
                className="dashboard-music-play"
                disabled={isLoading || !selectedTrackId}
                onClick={togglePlayback}
                type="button"
              >
                <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
                {isLoading ? t("loadingMusic") : isPlaying ? t("pauseMusic") : t("playMusic")}
              </button>

              <label className="dashboard-music-volume">
                <span>{t("volume")}</span>
                <input
                  aria-valuetext={t("volumePercent", { volume: Math.round(volume * 100) })}
                  max="100"
                  min="0"
                  onChange={changeVolume}
                  type="range"
                  value={Math.round(volume * 100)}
                />
                <output>{Math.round(volume * 100)}%</output>
              </label>
            </div>

            {hasError ? (
              <p className="dashboard-table-flower-error" role="alert">
                {t("musicPlaybackFailed")}
              </p>
            ) : null}

            <div className="dashboard-table-flower-actions">
              <button className="dashboard-table-flower-secondary" onClick={closePlayer} type="button">
                {t("close")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function restoreOwnedSource(
  audio: HTMLAudioElement,
  trackId: MusicTrackId | null,
) {
  const track = getMusicTrack(trackId);
  audio.pause();
  audio.loop = true;
  if (!track) {
    audio.removeAttribute("src");
    audio.load();
    return;
  }
  audio.src = track.src;
  audio.load();
}

async function playAudioFromElement(
  audio: HTMLAudioElement,
  updatePlaybackState: (value: boolean) => void,
  setHasError: (value: boolean) => void,
  setIsLoading: (value: boolean) => void,
) {
  setIsLoading(true);
  try {
    await audio.play();
  } catch {
    setHasError(true);
    updatePlaybackState(false);
  } finally {
    setIsLoading(false);
  }
}
