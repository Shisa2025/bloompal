"use client";

import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  defaultMusicPreferences,
  getMusicStorageKey,
  getMusicTrack,
  musicTracks,
  parseMusicPreferences,
  type MusicTrackId,
} from "../music";

type DashboardMusicPlayerProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlaybackChange: (isPlaying: boolean) => void;
  preferenceOwnerId: string;
};

const gramophoneTriggerId = "dashboard-gramophone-trigger";

export default function DashboardMusicPlayer({
  isOpen,
  onClose,
  onPlaybackChange,
  preferenceOwnerId,
}: DashboardMusicPlayerProps) {
  const t = useTranslations("Dashboard");
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<MusicTrackId>(
    defaultMusicPreferences.trackId,
  );
  const [volume, setVolume] = useState(defaultMusicPreferences.volume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const storageKey = getMusicStorageKey(preferenceOwnerId);

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

    let preferences = defaultMusicPreferences;
    try {
      preferences = parseMusicPreferences(window.localStorage.getItem(storageKey));
    } catch {
      preferences = defaultMusicPreferences;
    }

    setSelectedTrackId(preferences.trackId);
    setVolume(preferences.volume);
    audio.volume = preferences.volume;
    audio.src = getMusicTrack(preferences.trackId).src;
    audio.load();
  }, [storageKey]);

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
      dialogRef.current
        ?.querySelector<HTMLElement>('[aria-pressed="true"]')
        ?.focus();
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

  function savePreferences(trackId: MusicTrackId, nextVolume: number) {
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
    if (!audio) return;

    setHasError(false);
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

  async function selectTrack(trackId: MusicTrackId) {
    const audio = audioRef.current;
    if (!audio) return;

    const isNewTrack = trackId !== selectedTrackId;
    setSelectedTrackId(trackId);
    savePreferences(trackId, volume);
    setHasError(false);

    if (isNewTrack || audio.getAttribute("src") !== getMusicTrack(trackId).src) {
      audio.src = getMusicTrack(trackId).src;
      audio.load();
    }
    await playAudio();
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    if (audio.paused) {
      void playAudio();
    } else {
      audio.pause();
    }
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
        loop
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          updatePlaybackState(false);
        }}
        onPause={() => updatePlaybackState(false)}
        onPlay={() => updatePlaybackState(true)}
        onPlaying={() => setIsLoading(false)}
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

            <div className="dashboard-music-track-list" aria-label={t("musicTracks")}>
              {musicTracks.map((track) => (
                <button
                  aria-pressed={selectedTrackId === track.id}
                  className={selectedTrackId === track.id ? "is-selected" : ""}
                  key={track.id}
                  onClick={() => void selectTrack(track.id)}
                  type="button"
                >
                  <span className="dashboard-music-record" aria-hidden="true" />
                  <span>
                    <strong>{t(track.titleKey)}</strong>
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

            <div className="dashboard-music-controls">
              <button
                aria-label={isPlaying ? t("pauseMusic") : t("playMusic")}
                className="dashboard-music-play"
                disabled={isLoading}
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
              <button
                className="dashboard-table-flower-secondary"
                onClick={closePlayer}
                type="button"
              >
                {t("close")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
