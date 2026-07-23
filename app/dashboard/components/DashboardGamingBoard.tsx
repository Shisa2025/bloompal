"use client";

import Link from "next/link";
import { useState } from "react";

type BoardState = {
  label: string;
  title: string;
  description: string;
};

type GameId = "watering" | "bugs" | "snapshot";

type DashboardGamingBoardProps = {
  boardState: BoardState;
  isSignedIn: boolean;
};

const gameOrder: GameId[] = ["watering", "bugs", "snapshot"];

export default function DashboardGamingBoard({
  boardState,
  isSignedIn,
}: DashboardGamingBoardProps) {
  const [game, setGame] = useState<GameId>("watering");
  const [direction, setDirection] = useState<1 | -1>(1);
  const currentIndex = gameOrder.indexOf(game);
  const isWatering = game === "watering";
  const gameState = isWatering
    ? boardState
    : game === "bugs"
      ? {
        label: "Ready",
        title: "Mystery bugs await",
        description: "Choose a mystery bug, then search your garden to add it to your collection.",
        }
      : {
          label: "Coming soon",
          title: "Capture a garden moment",
          description: "Take a snapshot of your garden and keep a memory of your blooms and bugs.",
        };

  function changeGame(direction: 1 | -1) {
    const nextIndex = (currentIndex + direction + gameOrder.length) % gameOrder.length;
    setDirection(direction);
    setGame(gameOrder[nextIndex]);
  }

  return (
    <aside className="dashboard-gaming-board" aria-label="Gaming board">
      <div className="dashboard-gaming-board-heading">
        <p>Gaming Board</p>
        <div className="dashboard-game-title-row">
          <h2>{isWatering ? "Watering" : game === "bugs" ? "Collecting bugs" : "Take a Snapshot"}</h2>
          <div className="dashboard-game-switcher" aria-label="Choose game">
            <button
              aria-label="Show previous game"
              className="dashboard-game-arrow dashboard-game-arrow-previous"
              onClick={() => changeGame(-1)}
              title="Previous game"
              type="button"
            >
              <span aria-hidden="true">&#8592;</span>
            </button>
            <button
              aria-label="Show next game"
              className="dashboard-game-arrow dashboard-game-arrow-next"
              onClick={() => changeGame(1)}
              title="Next game"
              type="button"
            >
              <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`dashboard-gaming-board-status dashboard-game-status-enter-${direction}`}
        aria-live="polite"
        key={game}
      >
        <span>{gameState.label}</span>
        <strong>{gameState.title}</strong>
        <p>{gameState.description}</p>
      </div>

      <Link
        className="dashboard-game-button"
        href={
          isSignedIn
            ? isWatering
              ? "/games/watering"
              : game === "bugs"
                ? "/games/collectbugs"
                : "/games/snapshot"
            : "/login"
        }
      >
        {isSignedIn
          ? isWatering
            ? "Start watering"
            : game === "bugs"
              ? "Collect bugs"
              : "Open snapshot"
          : "Log in to play"}
      </Link>
    </aside>
  );
}
