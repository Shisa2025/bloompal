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
    musicTrackCalmLoop: "Calm Loop",
    musicTrackChill: "Chill",
    musicTrackDream: "Dream",
    playTrack: "Play",
    playing: "Playing",
    playMusic: "Play music",
    pauseMusic: "Pause music",
    loadingMusic: "Loading music",
    volume: "Volume",
    volumePercent: "Volume {volume}%",
    musicPlaybackFailed: "Playback failed.",
  },
};

describe("DashboardMusicPlayer", () => {
  it("renders the three-track dialog with compact playback controls", () => {
    const markup = renderPlayer(true);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("Calm Loop");
    expect(markup).toContain("Chill");
    expect(markup).toContain("Dream");
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
});

function renderPlayer(isOpen: boolean) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en-SG" messages={messages}>
      <DashboardMusicPlayer
        isOpen={isOpen}
        onClose={vi.fn()}
        onPlaybackChange={vi.fn()}
        preferenceOwnerId="music-test-user"
      />
    </NextIntlClientProvider>,
  );
}
