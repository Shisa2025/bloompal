"use client";

import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteUserBug, deleteUserSnapshot, setActiveBug, setActiveSnapshot, setTableFlowerAsset, throwAwayUserFruit } from "../actions";
import DashboardHomeScene from "./DashboardHomeScene";
import { BasketArt, FruitArt, type FruitArtKind } from "@/app/components/FruitArt";
import DashboardMusicPlayer from "./DashboardMusicPlayer";

type DashboardGardenClientProps = {
  preferenceOwnerId: string;
  ownedFlowerAssets: string[];
  tableFlowerAsset: string | null;
  caughtBugs: { id: string; bugAsset: string; isActive: boolean }[];
  snapshots: { id: string; imageData: string; isActive: boolean; createdAt: string }[];
  fruits: { id: string; fruitKind: string; createdAt: string }[];
};

export default function DashboardGardenClient({
  preferenceOwnerId,
  ownedFlowerAssets,
  tableFlowerAsset,
  caughtBugs,
  snapshots,
  fruits,
}: DashboardGardenClientProps) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tErrors = useTranslations("Errors");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localSelection, setLocalSelection] = useState<{
    serverAsset: string | null;
    asset: string | null;
  }>({ serverAsset: tableFlowerAsset, asset: tableFlowerAsset });
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedBug, setSelectedBug] = useState<{ id: string; bugAsset: string } | null>(null);
  const [isBugSelectorOpen, setIsBugSelectorOpen] = useState(false);
  const [isSnapshotSelectorOpen, setIsSnapshotSelectorOpen] = useState(false);
  const [isFruitBasketOpen, setIsFruitBasketOpen] = useState(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedAsset =
    localSelection.serverAsset === tableFlowerAsset
      ? localSelection.asset
      : tableFlowerAsset;
  const uniqueFlowerAssets = useMemo(
    () => Array.from(new Set(ownedFlowerAssets)).sort(),
    [ownedFlowerAssets],
  );

  const openSelector = useCallback(() => {
    setActionError(null);
    setIsSelectorOpen(true);
  }, []);

  const openMusicPlayer = useCallback(() => {
    setIsMusicPlayerOpen(true);
  }, []);

  const closeMusicPlayer = useCallback(() => {
    setIsMusicPlayerOpen(false);
  }, []);

  const closeSelector = useCallback(() => {
    if (!isPending) {
      setIsSelectorOpen(false);
    }
  }, [isPending]);

  const chooseFlower = useCallback(
    (asset: string | null) => {
      setActionError(null);
      startTransition(async () => {
        const result = await setTableFlowerAsset(asset);

        if (!result.ok) {
          setActionError(tErrors(result.errorCode));
          return;
        }

        setLocalSelection({
          serverAsset: tableFlowerAsset,
          asset: result.tableFlowerAsset,
        });
        setIsSelectorOpen(false);
        router.refresh();
      });
    },
    [router, tableFlowerAsset, tErrors],
  );
  const activeBugs = useMemo(() => caughtBugs.filter((bug) => bug.isActive), [caughtBugs]);
  const activeSnapshot = useMemo(() => snapshots.find((snapshot) => snapshot.isActive) ?? null, [snapshots]);

  const removeBug = useCallback(() => {
    if (!selectedBug) return;

    setActionError(null);
    startTransition(async () => {
      const result = await deleteUserBug(selectedBug.id);
      if (!result.ok) {
        setActionError(tErrors(result.errorCode));
        return;
      }
      setSelectedBug(null);
      router.refresh();
    });
  }, [router, selectedBug, tErrors]);

  const chooseBug = useCallback(
    (bugId: string) => {
      setActionError(null);
      startTransition(async () => {
        const result = await setActiveBug(bugId);
        if (!result.ok) {
          setActionError(tErrors(result.errorCode));
          return;
        }
        setIsBugSelectorOpen(false);
        setSelectedBug(null);
        router.refresh();
      });
    },
    [router, tErrors],
  );

  const chooseSnapshot = useCallback((snapshotId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setActiveSnapshot(snapshotId);
      if (!result.ok) { setActionError(tErrors(result.errorCode)); return; }
      setIsSnapshotSelectorOpen(false);
      router.refresh();
    });
  }, [router, tErrors]);

  const removeSnapshot = useCallback((snapshotId: string) => {
    if (!window.confirm(t("confirmDeleteSnapshot"))) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteUserSnapshot(snapshotId);
      if (!result.ok) { setActionError(tErrors(result.errorCode)); return; }
      router.refresh();
    });
  }, [router, t, tErrors]);

  const removeFruit = useCallback((fruitId: string) => {
    if (!window.confirm(t("confirmThrowFruit"))) return;
    setActionError(null);
    startTransition(async () => {
      const result = await throwAwayUserFruit(fruitId);
      if (!result.ok) { setActionError(tErrors(result.errorCode)); return; }
      router.refresh();
    });
  }, [router, t, tErrors]);

  return (
    <>
      <DashboardHomeScene
        caughtBugs={activeBugs}
        wallSnapshot={activeSnapshot}
        tableFlowerAsset={selectedAsset}
        onBugClick={(bugId) => {
          setActionError(null);
          setSelectedBug(activeBugs.find((bug) => bug.id === bugId) ?? null);
        }}
        onTablePotClick={openSelector}
        onSnapshotClick={() => {
          if (activeSnapshot) {
            setActionError(null);
            setIsSnapshotSelectorOpen(true);
          }
        }}
        fruits={fruits}
        onFruitBasketClick={() => { setActionError(null); setIsFruitBasketOpen(true); }}
        isMusicPlaying={isMusicPlaying}
        onGramophoneClick={openMusicPlayer}
      />

      <DashboardMusicPlayer
        isOpen={isMusicPlayerOpen}
        onClose={closeMusicPlayer}
        onPlaybackChange={setIsMusicPlaying}
        preferenceOwnerId={preferenceOwnerId}
      />

      {isFruitBasketOpen ? <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setIsFruitBasketOpen(false); }}><section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-fruit-title"><div className="dashboard-table-flower-heading"><p>{t("fruitBasket")}</p><h2 id="dashboard-fruit-title">{t("yourHarvest")}</h2></div>{fruits.length ? <div className="dashboard-fruit-grid">{fruits.map((fruit) => { const fruitName = formatFruitName(fruit.fruitKind); return <div className="dashboard-fruit-item" key={fruit.id}><FruitArt kind={fruit.fruitKind as FruitArtKind} label={fruitName} /><strong>{fruitName}</strong><button disabled={isPending} onClick={() => removeFruit(fruit.id)} type="button">{t("throwAway")}</button></div>; })}</div> : <div className="dashboard-table-flower-empty"><BasketArt className="dashboard-empty-basket" label={t("emptyBasket")} /><strong>{t("basketEmpty")}</strong><p>{t("fillBasketHint")}</p><Link className="dashboard-game-button" href="/games/pluckfruit">{t("pluckFruit")}</Link></div>}{actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}<div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsFruitBasketOpen(false)}>{t("close")}</button></div></section></div> : null}

      {isSelectorOpen ? (
        <div
          className="dashboard-table-flower-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSelector();
            }
          }}
        >
          <section
            className="dashboard-table-flower-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-table-flower-title"
          >
            <div className="dashboard-table-flower-heading">
              <p>{t("tablePlanter")}</p>
              <h2 id="dashboard-table-flower-title">{t("chooseBloom")}</h2>
            </div>

            {uniqueFlowerAssets.length > 0 ? (
              <div className="dashboard-table-flower-grid">
                {uniqueFlowerAssets.map((asset) => (
                  <button
                    className={[
                      "dashboard-table-flower-option",
                      selectedAsset === asset ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isPending}
                    key={asset}
                    type="button"
                    onClick={() => chooseFlower(asset)}
                  >
                    <span
                      className="dashboard-table-flower-icon"
                      aria-hidden="true"
                    >
                      <span />
                    </span>
                    <strong>{formatFlowerName(asset, t("flower"))}</strong>
                    <span>
                      {selectedAsset === asset ? t("onTable") : t("ownedBloom")}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty">
                <span className="dashboard-table-flower-empty-icon" aria-hidden="true" />
                <strong>{t("noBlooms")}</strong>
                <p>{t("unlockFlowersHint")}</p>
                <Link className="dashboard-game-button" href="/games/watering">
                  {t("startWatering")}
                </Link>
              </div>
            )}

            {actionError ? (
              <p className="dashboard-table-flower-error">{actionError}</p>
            ) : null}

            <div className="dashboard-table-flower-actions">
              <button
                className="dashboard-table-flower-secondary"
                disabled={isPending || selectedAsset === null}
                type="button"
                onClick={() => chooseFlower(null)}
              >
                {t("emptyPot")}
              </button>
              <button
                className="dashboard-table-flower-secondary"
                disabled={isPending}
                type="button"
                onClick={closeSelector}
              >
                {t("close")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedBug ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setSelectedBug(null);
        }}>
          <section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-bug-title">
            <div className="dashboard-table-flower-heading">
              <p>{t("gardenVisitor")}</p>
              <h2 id="dashboard-bug-title">{formatBugName(selectedBug.bugAsset)}</h2>
            </div>
            <div className="dashboard-table-flower-empty">
              <span className="dashboard-bug-dialog-icon" aria-hidden="true">&#128030;</span>
              <strong>{t("bugFlying")}</strong>
              <p>{t("releaseBugHint")}</p>
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions">
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => {
                setActionError(null);
                setIsBugSelectorOpen(true);
                setSelectedBug(null);
              }}>{t("chooseCompanion")}</button>
              <button className="dashboard-table-flower-secondary dashboard-bug-delete" disabled={isPending} type="button" onClick={removeBug}>{t("releaseBug")}</button>
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setSelectedBug(null)}>{t("close")}</button>
            </div>
          </section>
        </div>
      ) : null}

      {isBugSelectorOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setIsBugSelectorOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-bug-selector-title">
            <div className="dashboard-table-flower-heading">
              <p>{t("gardenVisitors")}</p>
              <h2 id="dashboard-bug-selector-title">{t("chooseCompanion")}</h2>
            </div>
            <div className="dashboard-table-flower-grid">
              {caughtBugs.map((bug) => (
                <button
                  className={["dashboard-table-flower-option", bug.isActive ? "is-selected" : ""].filter(Boolean).join(" ")}
                  disabled={isPending}
                  key={bug.id}
                  type="button"
                  onClick={() => chooseBug(bug.id)}
                >
                  <span className="dashboard-bug-dialog-icon" aria-hidden="true">&#128030;</span>
                  <strong>{formatBugName(bug.bugAsset)}</strong>
                  <span>{bug.isActive ? t("flyingWithYou") : t("chooseCompanion")}</span>
                </button>
              ))}
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions">
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsBugSelectorOpen(false)}>{t("close")}</button>
            </div>
          </section>
        </div>
      ) : null}

      {isSnapshotSelectorOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setIsSnapshotSelectorOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-snapshot-selector-title">
            <div className="dashboard-table-flower-heading"><p>{t("gardenMemories")}</p><h2 id="dashboard-snapshot-selector-title">{t("chooseSnapshot")}</h2></div>
            <div className="dashboard-table-flower-grid">
              {snapshots.map((snapshot, index) => <div className={["dashboard-table-flower-option", "dashboard-snapshot-option", snapshot.isActive ? "is-selected" : ""].filter(Boolean).join(" ")} key={snapshot.id}>
                <button className="dashboard-snapshot-select" disabled={isPending} type="button" onClick={() => chooseSnapshot(snapshot.id)}>
                  <Image className="dashboard-snapshot-thumbnail" src={snapshot.imageData} alt={t("gardenSnapshot", { number: snapshots.length - index })} width={480} height={270} unoptimized />
                  <strong>{t("snapshotNumber", { number: snapshots.length - index })}</strong>
                  <span>{snapshot.isActive ? t("onWall") : t("chooseSnapshot")}</span>
                </button>
                <button className="dashboard-snapshot-delete" disabled={isPending} type="button" onClick={() => removeSnapshot(snapshot.id)} aria-label={t("deleteSnapshot", { number: snapshots.length - index })}>{t("delete")}</button>
              </div>)}
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsSnapshotSelectorOpen(false)}>{t("close")}</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function formatFlowerName(asset: string, flowerLabel: string) {
  return asset.replace(".glb", "").replace("flower", `${flowerLabel} `);
}

function formatBugName(asset: string) {
  return asset.replace(/\.glb$/i, "");
}

function formatFruitName(kind: string) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
