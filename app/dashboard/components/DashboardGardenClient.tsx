"use client";

import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteUserBug, deleteUserSnapshot, setActiveBug, setActiveSnapshot, setTableFlowerAsset, throwAwayUserFruit } from "../actions";
import DashboardHomeScene from "./DashboardHomeScene";
import { BasketArt, FruitArt, type FruitArtKind } from "@/app/components/FruitArt";
import DashboardMusicPlayer from "./DashboardMusicPlayer";
import DashboardCourtyardScene from "./DashboardCourtyardScene";
import DashboardPond from "./DashboardPond";
import DashboardShopPreview from "./DashboardShopPreview";
import DashboardBedroomScene from "./DashboardBedroomScene";
import DashboardOnlineRoomScene from "./DashboardOnlineRoomScene";
import DashboardWardrobePreview from "./DashboardWardrobePreview";
import {
  defaultDashboardOutfitId,
  getDashboardOutfitStorageKey,
  isPurchasableDashboardOutfitId,
  parseDashboardOutfitPreferences,
  type DashboardOutfitId,
  type PurchasableDashboardOutfitId,
} from "./dashboardOutfits";
import type { FishKind } from "@/lib/fish-assets";
import {
  onlineRoomContract,
  type OnlineRoomErrorCode,
} from "@/lib/online-room-protocol";
import {
  OnlineRoomRequestError,
  requestOnlineRoomTicket,
  syncOnlineRoom,
  type OnlineRoomConnection,
} from "../online-room-client";
import {
  getCatalogAssetBySource,
  type AssetCategory,
  type MusicTrackId,
  type ShopState,
} from "@/lib/asset-catalog";

type DashboardGardenClientProps = {
  preferenceOwnerId: string;
  ownedFlowerAssets: string[];
  tableFlowerAsset: string | null;
  caughtBugs: { id: string; bugAsset: string; isActive: boolean }[];
  snapshots: { id: string; imageData: string; isActive: boolean; createdAt: string }[];
  fruits: { id: string; fruitKind: string; createdAt: string }[];
  caughtFish: { id: string; fishKind: FishKind }[];
  shopState: ShopState;
  onlineRoomEnabled?: boolean;
};

type SceneLocation = "room" | "courtyard" | "bedroom" | "online-room";
type JourneyTarget = "room" | "courtyard" | "bedroom" | "online-room";
type PendingDestination = { location: SceneLocation; focusId: string };

export default function DashboardGardenClient({
  preferenceOwnerId,
  ownedFlowerAssets,
  tableFlowerAsset,
  caughtBugs,
  snapshots,
  fruits,
  caughtFish,
  shopState,
  onlineRoomEnabled = true,
}: DashboardGardenClientProps) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tAssets = useTranslations("Assets");
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
  const [sceneLocation, setSceneLocation] = useState<SceneLocation>("room");
  const [isSceneCurtainVisible, setIsSceneCurtainVisible] = useState(false);
  const [isJourneying, setIsJourneying] = useState(false);
  const [journeyTarget, setJourneyTarget] = useState<JourneyTarget | null>(null);
  const [isPondOpen, setIsPondOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [onlineRoomConnection, setOnlineRoomConnection] =
    useState<OnlineRoomConnection | null>(null);
  const [onlineRoomError, setOnlineRoomError] =
    useState<OnlineRoomErrorCode | null>(null);
  const [isOnlineRoomEntryPending, setIsOnlineRoomEntryPending] = useState(false);
  const [selectedOutfitId, setSelectedOutfitId] =
    useState<DashboardOutfitId>(defaultDashboardOutfitId);
  const [previewTrackId, setPreviewTrackId] = useState<MusicTrackId | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const pendingDestinationRef = useRef<PendingDestination | null>(null);
  const sceneSwitchTimerRef = useRef<number | null>(null);
  const sceneFallbackTimerRef = useRef<number | null>(null);
  const sceneRevealTimerRef = useRef<number | null>(null);
  const selectedOutfitIdRef = useRef<DashboardOutfitId>(
    defaultDashboardOutfitId,
  );
  const activeOutfitStorageKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const outfitStorageKey = useMemo(
    () => getDashboardOutfitStorageKey(preferenceOwnerId),
    [preferenceOwnerId],
  );
  const selectedAsset =
    localSelection.serverAsset === tableFlowerAsset
      ? localSelection.asset
      : tableFlowerAsset;
  const uniqueFlowerAssets = useMemo(
    () => Array.from(new Set(ownedFlowerAssets)).sort(),
    [ownedFlowerAssets],
  );
  const getAssetName = useCallback(
    (category: AssetCategory, sourceValue: string) => {
      const asset = getCatalogAssetBySource(category, sourceValue);
      return asset ? tAssets(asset.nameKey) : sourceValue;
    },
    [tAssets],
  );

  useEffect(() => {
    return () => {
      [sceneSwitchTimerRef, sceneFallbackTimerRef, sceneRevealTimerRef].forEach(
        (timerRef) => {
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        },
      );
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeOutfitStorageKeyRef.current !== outfitStorageKey) {
        activeOutfitStorageKeyRef.current = outfitStorageKey;
        selectedOutfitIdRef.current = defaultDashboardOutfitId;
      }
      const sessionOutfitId = selectedOutfitIdRef.current;
      const sessionOutfitIsAvailable =
        sessionOutfitId === defaultDashboardOutfitId ||
        (isPurchasableDashboardOutfitId(sessionOutfitId) &&
          shopState.ownedOutfitIds.includes(sessionOutfitId));
      try {
        const storedPreferences = window.localStorage.getItem(outfitStorageKey);
        const preferences = storedPreferences
          ? parseDashboardOutfitPreferences(
              storedPreferences,
              shopState.ownedOutfitIds,
            )
          : {
              outfitId: sessionOutfitIsAvailable
                ? sessionOutfitId
                : defaultDashboardOutfitId,
            };
        selectedOutfitIdRef.current = preferences.outfitId;
        setSelectedOutfitId(preferences.outfitId);
        window.localStorage.setItem(
          outfitStorageKey,
          JSON.stringify(preferences),
        );
      } catch {
        const outfitId = sessionOutfitIsAvailable
          ? sessionOutfitId
          : defaultDashboardOutfitId;
        selectedOutfitIdRef.current = outfitId;
        setSelectedOutfitId(outfitId);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [outfitStorageKey, shopState.ownedOutfitIds]);

  const revealDestination = useCallback(() => {
    const pending = pendingDestinationRef.current;
    if (!pending) return;
    pendingDestinationRef.current = null;
    if (sceneFallbackTimerRef.current !== null) {
      window.clearTimeout(sceneFallbackTimerRef.current);
      sceneFallbackTimerRef.current = null;
    }
    sceneRevealTimerRef.current = window.setTimeout(() => {
      setIsSceneCurtainVisible(false);
      setIsJourneying(false);
      setJourneyTarget(null);
      window.setTimeout(() => {
        document.getElementById(pending.focusId)?.focus();
      }, 180);
    }, 90);
  }, []);

  const switchScene = useCallback(
    (destination: SceneLocation, focusId: string) => {
      pendingDestinationRef.current = { location: destination, focusId };
      setIsSceneCurtainVisible(true);
      sceneSwitchTimerRef.current = window.setTimeout(() => {
        setSceneLocation(destination);
        sceneFallbackTimerRef.current = window.setTimeout(
          revealDestination,
          4500,
        );
      }, 320);
    },
    [revealDestination],
  );

  const beginSceneJourney = useCallback((target: JourneyTarget) => {
    setIsJourneying(true);
    setJourneyTarget(target);
    setIsPondOpen(false);
    setIsShopOpen(false);
    setIsWardrobeOpen(false);
    setPreviewTrackId(null);
  }, []);

  const closePond = useCallback(() => {
    setIsPondOpen(false);
    window.setTimeout(
      () => document.getElementById("dashboard-courtyard-pond-trigger")?.focus(),
      0,
    );
  }, []);

  const closeShop = useCallback(() => {
    setIsShopOpen(false);
    setPreviewTrackId(null);
    setPreviewError(false);
    window.setTimeout(
      () => document.getElementById("dashboard-courtyard-merchant-trigger")?.focus(),
      0,
    );
  }, []);

  const openPond = useCallback(() => setIsPondOpen(true), []);
  const openShop = useCallback(() => {
    setPreviewError(false);
    setIsShopOpen(true);
  }, []);
  const previewShopTrack = useCallback((trackId: MusicTrackId | null) => {
    setPreviewError(false);
    setPreviewTrackId(trackId);
  }, []);
  const endShopPreview = useCallback(() => setPreviewTrackId(null), []);
  const reportShopPreviewError = useCallback(() => setPreviewError(true), []);
  const openWardrobe = useCallback(() => setIsWardrobeOpen(true), []);
  const closeWardrobe = useCallback(() => {
    setIsWardrobeOpen(false);
    window.setTimeout(
      () => document.getElementById("dashboard-bedroom-wardrobe-trigger")?.focus(),
      0,
    );
  }, []);
  const equipOutfit = useCallback(
    (outfitId: DashboardOutfitId) => {
      selectedOutfitIdRef.current = outfitId;
      setSelectedOutfitId(outfitId);
      try {
        window.localStorage.setItem(
          outfitStorageKey,
          JSON.stringify({ outfitId }),
        );
      } catch {
        // The selection still applies for this session when storage is unavailable.
      }
    },
    [outfitStorageKey],
  );
  const chooseOutfit = useCallback(
    (outfitId: DashboardOutfitId) => {
      if (
        outfitId !== defaultDashboardOutfitId &&
        (!isPurchasableDashboardOutfitId(outfitId) ||
          !shopState.ownedOutfitIds.includes(outfitId))
      ) {
        return;
      }
      equipOutfit(outfitId);
      closeWardrobe();
    },
    [closeWardrobe, equipOutfit, shopState.ownedOutfitIds],
  );
  const equipPurchasedOutfit = useCallback(
    (outfitId: PurchasableDashboardOutfitId) => equipOutfit(outfitId),
    [equipOutfit],
  );
  const beginRoomJourney = useCallback(
    (destination: "courtyard" | "bedroom") => beginSceneJourney(destination),
    [beginSceneJourney],
  );
  const beginReturnJourney = useCallback(
    () => beginSceneJourney("room"),
    [beginSceneJourney],
  );
  const enterCourtyard = useCallback(
    () => switchScene("courtyard", "dashboard-courtyard-door-trigger"),
    [switchScene],
  );
  const enterBedroom = useCallback(
    () => switchScene("bedroom", "dashboard-bedroom-door-trigger"),
    [switchScene],
  );
  const returnFromCourtyard = useCallback(
    () => switchScene("room", "dashboard-room-courtyard-door-trigger"),
    [switchScene],
  );
  const returnFromBedroom = useCallback(
    () => switchScene("room", "dashboard-room-bedroom-door-trigger"),
    [switchScene],
  );
  const enterOnlineRoom = useCallback(async () => {
    if (!onlineRoomEnabled) return false;
    setOnlineRoomError(null);
    setIsOnlineRoomEntryPending(true);
    try {
      const credentials = await requestOnlineRoomTicket();
      const spawn = onlineRoomContract.spawnPositions[0];
      const initialSnapshot = await syncOnlineRoom(credentials, {
        sequence: 0,
        x: spawn.x,
        z: spawn.z,
        heading: 0,
        moving: false,
        outfitId: selectedOutfitIdRef.current,
      });
      setOnlineRoomConnection({
        ...credentials,
        initialSnapshot,
        sequence: 0,
      });
      beginSceneJourney("online-room");
      switchScene("online-room", "dashboard-online-room-exit-trigger");
      return true;
    } catch (error) {
      const code =
        error instanceof OnlineRoomRequestError ? error.code : "database_unavailable";
      setOnlineRoomError(code);
      return false;
    } finally {
      setIsOnlineRoomEntryPending(false);
    }
  }, [beginSceneJourney, onlineRoomEnabled, switchScene]);
  const exitOnlineRoom = useCallback(() => {
    beginSceneJourney("bedroom");
    switchScene("bedroom", "dashboard-bedroom-computer-trigger");
  }, [beginSceneJourney, switchScene]);

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
  const onlineRoomErrorMessage = onlineRoomError
    ? {
        already_left: t("onlineRoomError.already_left"),
        database_unavailable: t("onlineRoomError.database_unavailable"),
        feature_disabled: t("onlineRoomError.feature_disabled"),
        invalid_origin: t("onlineRoomError.invalid_origin"),
        invalid_request: t("onlineRoomError.invalid_request"),
        invalid_ticket: t("onlineRoomError.invalid_ticket"),
        missing_configuration: t("onlineRoomError.missing_configuration"),
        room_full: t("onlineRoomError.room_full"),
        session_replaced: t("onlineRoomError.session_replaced"),
        stale_sequence: t("onlineRoomError.stale_sequence"),
        unauthorized: t("onlineRoomError.unauthorized"),
      }[onlineRoomError]
    : null;
  const openFruitBasket = useCallback(() => {
    setActionError(null);
    setIsFruitBasketOpen(true);
  }, []);
  const openSnapshotSelector = useCallback(() => {
    if (!activeSnapshot) return;
    setActionError(null);
    setIsSnapshotSelectorOpen(true);
  }, [activeSnapshot]);
  const selectBugFromScene = useCallback(
    (bugId: string) => {
      setActionError(null);
      setSelectedBug(activeBugs.find((bug) => bug.id === bugId) ?? null);
    },
    [activeBugs],
  );

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
      {sceneLocation === "room" ? (
        <DashboardHomeScene
          outfitId={selectedOutfitId}
          caughtBugs={activeBugs}
          wallSnapshot={activeSnapshot}
          tableFlowerAsset={selectedAsset}
          onBugClick={selectBugFromScene}
          onTablePotClick={openSelector}
          onSnapshotClick={openSnapshotSelector}
          fruits={fruits}
          onFruitBasketClick={openFruitBasket}
          isMusicPlaying={isMusicPlaying}
          onGramophoneClick={openMusicPlayer}
          onDoorTransitionStart={beginRoomJourney}
          onEnterBedroom={enterBedroom}
          onEnterCourtyard={enterCourtyard}
          onSceneReady={revealDestination}
        />
      ) : sceneLocation === "courtyard" ? (
        <DashboardCourtyardScene
          fish={caughtFish}
          outfitId={selectedOutfitId}
          onMerchantClick={openShop}
          onPondClick={openPond}
          onReturnComplete={returnFromCourtyard}
          onReturnTransitionStart={beginReturnJourney}
          onSceneReady={revealDestination}
        />
      ) : sceneLocation === "bedroom" ? (
        <DashboardBedroomScene
          outfitId={selectedOutfitId}
          onComputerClick={onlineRoomEnabled ? enterOnlineRoom : undefined}
          onReturnComplete={returnFromBedroom}
          onReturnTransitionStart={beginReturnJourney}
          onSceneReady={revealDestination}
          onWardrobeClick={openWardrobe}
        />
      ) : onlineRoomConnection ? (
        <DashboardOnlineRoomScene
          connection={onlineRoomConnection}
          key={onlineRoomConnection.sessionId}
          outfitId={selectedOutfitId}
          onExit={exitOnlineRoom}
          onSceneReady={revealDestination}
        />
      ) : null}

      <div
        aria-hidden="true"
        className={[
          "dashboard-scene-curtain",
          isSceneCurtainVisible ? "is-visible" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {isJourneying && journeyTarget
          ? journeyTarget === "courtyard"
            ? t("goingToCourtyard")
            : journeyTarget === "bedroom"
              ? t("goingToBedroom")
              : journeyTarget === "online-room"
                ? t("goingToOnlineRoom")
              : t("returningToRoom")
          : ""}
      </p>

      {onlineRoomErrorMessage ? (
        <div className="dashboard-online-room-entry-error" role="alert">
          <span>{onlineRoomErrorMessage}</span>
          <button onClick={() => setOnlineRoomError(null)} type="button">
            {t("dismiss")}
          </button>
        </div>
      ) : null}
      {isOnlineRoomEntryPending ? (
        <div className="dashboard-online-room-entry-status" role="status">
          <span aria-hidden="true" />
          {t("onlineRoomConnecting")}
        </div>
      ) : null}

      <DashboardMusicPlayer
        isOpen={isMusicPlayerOpen}
        onClose={closeMusicPlayer}
        onPlaybackChange={setIsMusicPlaying}
        onPreviewEnd={endShopPreview}
        onPreviewError={reportShopPreviewError}
        ownedTrackIds={shopState.ownedMusicIds}
        preferenceOwnerId={preferenceOwnerId}
        previewTrackId={previewTrackId}
      />

      <DashboardPond fish={caughtFish} isOpen={isPondOpen} onClose={closePond} />
      <DashboardShopPreview
        isOpen={isShopOpen}
        onClose={closeShop}
        onOutfitPurchased={equipPurchasedOutfit}
        onPreviewTrack={previewShopTrack}
        previewError={previewError}
        previewTrackId={previewTrackId}
        selectedOutfitId={selectedOutfitId}
        shopState={shopState}
      />
      <DashboardWardrobePreview
        isOpen={isWardrobeOpen}
        onClose={closeWardrobe}
        onSelectOutfit={chooseOutfit}
        ownedOutfitIds={shopState.ownedOutfitIds}
        selectedOutfitId={selectedOutfitId}
      />

      {isFruitBasketOpen ? <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isPending) setIsFruitBasketOpen(false); }}><section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-fruit-title"><div className="dashboard-table-flower-heading"><p>{t("fruitBasket")}</p><h2 id="dashboard-fruit-title">{t("yourHarvest")}</h2></div>{fruits.length ? <div className="dashboard-fruit-grid">{fruits.map((fruit) => { const fruitName = getAssetName("fruit", fruit.fruitKind); return <div className="dashboard-fruit-item" key={fruit.id}><FruitArt kind={fruit.fruitKind as FruitArtKind} label={fruitName} /><strong>{fruitName}</strong><button disabled={isPending} onClick={() => removeFruit(fruit.id)} type="button">{t("throwAway")}</button></div>; })}</div> : <div className="dashboard-table-flower-empty"><BasketArt className="dashboard-empty-basket" label={t("emptyBasket")} /><strong>{t("basketEmpty")}</strong><p>{t("fillBasketHint")}</p><Link className="dashboard-game-button" href="/games/pluckfruit">{t("pluckFruit")}</Link></div>}{actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}<div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsFruitBasketOpen(false)}>{t("close")}</button></div></section></div> : null}

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
                    <strong>{getAssetName("flower", asset)}</strong>
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
              <h2 id="dashboard-bug-title">{getAssetName("bug", selectedBug.bugAsset)}</h2>
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
                  <strong>{getAssetName("bug", bug.bugAsset)}</strong>
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
