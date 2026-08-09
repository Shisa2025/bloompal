"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

type BoardState = {
  label: string;
  title: string;
  description: string;
};

type GameId = "watering" | "bugs" | "snapshot" | "fish" | "fruit";

type DashboardGamingBoardProps = {
  boardState: BoardState;
  isSignedIn: boolean;
};

const gameOrder: GameId[] = ["watering", "bugs", "snapshot", "fish", "fruit"];

export default function DashboardGamingBoard({
  boardState,
  isSignedIn,
}: DashboardGamingBoardProps) {
  const t = useTranslations("Dashboard");
  const [isExpanded, setIsExpanded] = useState(false);
  const [game, setGame] = useState<GameId>("watering");
  const [direction, setDirection] = useState<1 | -1>(1);
  const currentIndex = gameOrder.indexOf(game);
  const isWatering = game === "watering";
  const gameState = isWatering
    ? boardState
    : game === "bugs"
      ? {
          label: t("ready"),
          title: t("bugsAwait"),
          description: t("bugsDescription"),
        }
      : game === "snapshot"
        ? {
          label: t("ready"),
          title: t("snapshotAwait"),
          description: t("snapshotDescription"),
          }
        : game === "fish" ? {
            label: t("ready"),
            title: t("fishAwait"),
            description: t("fishDescription"),
          } : {
            label: t("ready"),
            title: t("fruitAwait"),
            description: t("fruitDescription"),
          };

  function changeGame(direction: 1 | -1) {
    const nextIndex = (currentIndex + direction + gameOrder.length) % gameOrder.length;
    setDirection(direction);
    setGame(gameOrder[nextIndex]);
  }

  return (
    <aside
      className={`dashboard-gaming-board ${isExpanded ? "is-expanded" : "is-collapsed"}`}
      aria-label={t("gamingBoard")}
    >
      <div className="dashboard-gaming-board-toggle-row">
        <p className="dashboard-gaming-board-label" aria-hidden={!isExpanded}>
          {t("gamingBoard")}
        </p>
        <button
          aria-controls="dashboard-game-menu"
          aria-expanded={isExpanded}
          className="dashboard-gaming-board-toggle"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          type="button"
        >
          <span>{isExpanded ? t("hideGames") : t("startGame")}</span>
          <span className="dashboard-gaming-board-toggle-icon" aria-hidden="true">
            {isExpanded ? "\u2212" : "+"}
          </span>
        </button>
      </div>

      <div
        className="dashboard-gaming-board-content"
        hidden={!isExpanded}
        id="dashboard-game-menu"
      >
        <div className="dashboard-gaming-board-heading">
          <div className="dashboard-game-title-row">
            <h2>{t(`game.${game}`)}</h2>
            <div
              className="dashboard-game-switcher"
              aria-label={t("chooseGame", { current: currentIndex + 1, total: gameOrder.length })}
              role="group"
            >
              <button
                aria-label={t("previousGame")}
                className="dashboard-game-arrow dashboard-game-arrow-previous"
                onClick={() => changeGame(-1)}
                title={t("previousGame")}
                type="button"
              >
                <span aria-hidden="true">&#8592;</span>
              </button>
              <span className="dashboard-game-position" aria-hidden="true">
                {currentIndex + 1} / {gameOrder.length}
              </span>
              <button
                aria-label={t("nextGame")}
                className="dashboard-game-arrow dashboard-game-arrow-next"
                onClick={() => changeGame(1)}
                title={t("nextGame")}
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
                : game === "snapshot"
                  ? "/games/snapshot"
                  : game === "fish"
                    ? "/games/catchfish"
                    : "/games/pluckfruit"
              : "/login"
          }
        >
          {isSignedIn
            ? isWatering
              ? t("startWatering")
              : game === "bugs"
                ? t("collectBugs")
                : game === "snapshot"
                  ? t("takeSnapshot")
                  : game === "fish"
                    ? t("catchFish")
                    : t("pluckFruit")
            : t("loginToPlay")}
        </Link>
      </div>
    </aside>
  );
}
