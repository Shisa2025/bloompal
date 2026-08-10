import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DashboardMusicPlayer from "./DashboardMusicPlayer";

const messages = {
  Dashboard: {
    close: "Close",
    gramophone: "Gramophone",
    chooseMusic: "Choose music",
    musicKeepsPlaying: "Music keeps playing.",
    musicTracks: "Music tracks",
    playTrack: "Play",
    playing: "Playing",
    playMusic: "Play music",
    pauseMusic: "Pause music",
    loadingMusic: "Loading music",
    volume: "Volume",
    volumePercent: "Volume {volume}%",
    musicPlaybackFailed: "Playback failed.",
    noMusicOwned: "No records yet",
    buyMusicFromRabbit: "Buy one from the rabbit shop.",
  },
  Assets: {
    names: {
      musicCalmLoop: "Quiet Garden",
      musicChill: "Leisurely Time",
      musicDream: "Gentle Dream",
    },
  },
};

describe("DashboardMusicPlayer", () => {
  it("renders the three-track dialog with compact playback controls", () => {
    const markup = renderPlayer(true);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Quiet Garden");
    expect(markup).toContain("Leisurely Time");
    expect(markup).toContain("Gentle Dream");
    expect(markup.match(/aria-pressed=/g)).toHaveLength(3);
    expect(markup).toContain('type="range"');
    expect(markup).toContain('value="45"');
    expect(markup).not.toContain("Previous");
    expect(markup).not.toContain("Next");
  });

  it("keeps the audio element mounted while the dialog is closed", () => {
    const markup = renderPlayer(false);

    expect(markup).toContain("<audio");
    expect(markup).toContain('preload="metadata"');
    expect(markup).not.toContain('role="dialog"');
  });

  it("renders an empty state and no selectable tracks without ownership", () => {
    const markup = renderPlayer(true, []);

    expect(markup).toContain("No records yet");
    expect(markup).not.toContain('aria-pressed=');
  });
});

function renderPlayer(
  isOpen: boolean,
  ownedTrackIds: Array<"calm-loop" | "chill-loopable" | "dream"> = [
    "calm-loop",
    "chill-loopable",
    "dream",
  ],
) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en-SG" messages={messages}>
      <DashboardMusicPlayer
        isOpen={isOpen}
        onClose={vi.fn()}
        onPlaybackChange={vi.fn()}
        onPreviewEnd={vi.fn()}
        onPreviewError={vi.fn()}
        ownedTrackIds={ownedTrackIds}
        preferenceOwnerId="music-test-user"
        previewTrackId={null}
      />
    </NextIntlClientProvider>,
  );
}
