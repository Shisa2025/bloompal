"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import {
  getCatalogAsset,
  getShopThumbnailPath,
  musicCatalog,
  type MusicTrackId,
  type SellableAssetId,
  type ShopInventoryItem,
  type ShopState,
} from "../../../lib/asset-catalog";
import {
  purchasableDashboardOutfits,
  type DashboardOutfitId,
  type PurchasableDashboardOutfitId,
} from "../../../lib/dashboard-outfits";
import {
  buyDashboardOutfit,
  buyMusicTrack,
  sellShopResources,
} from "../actions";
import {
  buildShopSaleLines,
  mergeShopInventory,
  reconcileShopSaleSelection,
  setShopSaleQuantity,
  summarizeShopSale,
  toggleShopSaleItem,
  type ShopSaleSelection,
} from "./shopSaleSelection";
import styles from "./DashboardShopPreview.module.css";

type DashboardShopPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  onPreviewTrack: (trackId: MusicTrackId | null) => void;
  onOutfitPurchased: (outfitId: PurchasableDashboardOutfitId) => void;
  previewError: boolean;
  previewTrackId: MusicTrackId | null;
  selectedOutfitId: DashboardOutfitId;
  shopState: ShopState;
};

type ShopTab = "music" | "outfits" | "sell";
type SaleCategory = "all" | ShopInventoryItem["category"];
type SaleStep = "select" | "confirm";

const shopTabs = ["music", "outfits", "sell"] as const satisfies readonly ShopTab[];

const saleCategoryKeys = {
  all: "shopAllResources",
  flower: "shopFlowers",
  bug: "shopBugs",
  fish: "shopFish",
  fruit: "shopFruit",
} as const;

const rabbitThumbnailPath = getShopThumbnailPath(
  getCatalogAsset("character-mooncap-merchant")!,
)!;

function CoinPrice({ count }: { count: number }) {
  return (
    <span className={styles.price}>
      <span aria-hidden="true" className={styles.coinIcon} />
      {count}
    </span>
  );
}

export function DashboardShopOutfitList({
  coinBalance,
  isPending,
  onPurchase,
  ownedOutfitIds,
  selectedOutfitId,
}: {
  coinBalance: number;
  isPending: boolean;
  onPurchase: (outfitId: PurchasableDashboardOutfitId) => void;
  ownedOutfitIds: readonly PurchasableDashboardOutfitId[];
  selectedOutfitId: DashboardOutfitId;
}) {
  const t = useTranslations("Dashboard");

  return (
    <div
      aria-labelledby="dashboard-shop-outfits-tab"
      className={styles.productGrid}
      id="dashboard-shop-outfits-panel"
      role="tabpanel"
    >
      {purchasableDashboardOutfits.map((outfit) => {
        const isOwned = ownedOutfitIds.includes(outfit.id);
        const isEquipped = selectedOutfitId === outfit.id;
        const stateLabel = isEquipped
          ? t("outfitEquipped")
          : isOwned
            ? t("outfitOwned")
            : null;

        return (
          <article className={styles.productCard} key={outfit.id}>
            <div className={styles.productArtwork}>
              <span
                aria-hidden="true"
                className={`dashboard-wardrobe-swatch is-${outfit.id} ${styles.outfitSwatch}`}
              >
                <span className="dashboard-wardrobe-swatch-body" />
                <span className="dashboard-wardrobe-swatch-sleeve is-left" />
                <span className="dashboard-wardrobe-swatch-sleeve is-right" />
              </span>
            </div>
            <div className={styles.productCopy}>
              <div className={styles.productTitleRow}>
                <strong>{t(outfit.nameKey)}</strong>
                {stateLabel ? (
                  <span className={styles.stateBadge}>{stateLabel}</span>
                ) : null}
              </div>
              <p>{t(outfit.descriptionKey)}</p>
            </div>
            <div className={styles.productFooter}>
              <CoinPrice count={outfit.buyPrice} />
              <button
                className={styles.primaryButton}
                disabled={
                  isPending ||
                  isEquipped ||
                  isOwned ||
                  coinBalance < outfit.buyPrice
                }
                onClick={() => onPurchase(outfit.id)}
                type="button"
              >
                {isEquipped
                  ? t("outfitEquipped")
                  : isOwned
                    ? t("outfitOwned")
                    : coinBalance < outfit.buyPrice
                      ? t("notEnoughCoins")
                      : t("buyForCoins", { count: outfit.buyPrice })}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function DashboardShopPreview({
  isOpen,
  onClose,
  onOutfitPurchased,
  onPreviewTrack,
  previewError,
  previewTrackId,
  selectedOutfitId,
  shopState,
}: DashboardShopPreviewProps) {
  const t = useTranslations("Dashboard");
  const tAssets = useTranslations("Assets");
  const tErrors = useTranslations("Errors");
  const dialogRef = useRef<HTMLElement>(null);
  const confirmationTitleRef = useRef<HTMLHeadingElement>(null);
  const tabButtonRefs = useRef<Partial<Record<ShopTab, HTMLButtonElement | null>>>({});
  const [activeTab, setActiveTab] = useState<ShopTab>("music");
  const [saleCategory, setSaleCategory] = useState<SaleCategory>("all");
  const [saleStep, setSaleStep] = useState<SaleStep>("select");
  const [saleSelection, setSaleSelection] = useState<ShopSaleSelection>({});
  const [selectedSaleAssetId, setSelectedSaleAssetId] =
    useState<SellableAssetId | null>(null);
  const [optimisticBalance, setOptimisticBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saleSuccess, setSaleSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inventory = useMemo(
    () => mergeShopInventory(shopState.inventory),
    [shopState.inventory],
  );
  const filteredInventory = useMemo(
    () =>
      saleCategory === "all"
        ? inventory
        : inventory.filter((item) => item.category === saleCategory),
    [inventory, saleCategory],
  );
  const selectedInventoryItem =
    inventory.find((item) => item.assetId === selectedSaleAssetId) ??
    inventory[0] ??
    null;
  const selectedSaleAsset = selectedInventoryItem
    ? getCatalogAsset(selectedInventoryItem.assetId)
    : null;
  const effectiveSaleSelection = useMemo(
    () => reconcileShopSaleSelection(saleSelection, inventory),
    [inventory, saleSelection],
  );
  const saleLines = useMemo(
    () => buildShopSaleLines(effectiveSaleSelection, inventory),
    [effectiveSaleSelection, inventory],
  );
  const saleSummary = useMemo(() => summarizeShopSale(saleLines), [saleLines]);
  const visibleBalance = optimisticBalance ?? shopState.coinBalance;

  const handleClose = useCallback(() => {
    setActiveTab("music");
    setSaleCategory("all");
    setSaleStep("select");
    setSaleSelection({});
    setSelectedSaleAssetId(null);
    setOptimisticBalance(null);
    setError(null);
    setSaleSuccess(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      dialog
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [handleClose, isOpen, isPending]);

  useEffect(() => {
    if (saleStep === "confirm") confirmationTitleRef.current?.focus();
  }, [saleStep]);

  const selectTab = useCallback(
    (tab: ShopTab) => {
      if (tab !== "music") onPreviewTrack(null);
      setActiveTab(tab);
      setSaleStep("select");
      setError(null);
      setSaleSuccess(null);
    },
    [onPreviewTrack],
  );

  if (!isOpen) return null;

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentTab: ShopTab,
  ) {
    const currentIndex = shopTabs.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % shopTabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + shopTabs.length) % shopTabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = shopTabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = shopTabs[nextIndex];
    selectTab(nextTab);
    tabButtonRefs.current[nextTab]?.focus();
  }

  function purchase(trackId: MusicTrackId) {
    setError(null);
    setSaleSuccess(null);
    startTransition(async () => {
      const result = await buyMusicTrack(trackId);
      if (!result.ok) {
        setError(tErrors(result.errorCode));
        return;
      }
      setOptimisticBalance(result.coinBalance);
    });
  }

  function purchaseOutfit(outfitId: PurchasableDashboardOutfitId) {
    setError(null);
    setSaleSuccess(null);
    startTransition(async () => {
      const result = await buyDashboardOutfit(outfitId);
      if (!result.ok) {
        setError(tErrors(result.errorCode));
        return;
      }
      setOptimisticBalance(result.coinBalance);
      onOutfitPurchased(result.outfitId);
    });
  }

  function updateSaleQuantity(item: ShopInventoryItem, quantity: number) {
    setSaleSuccess(null);
    setSaleSelection((current) =>
      setShopSaleQuantity(current, item.assetId, quantity, item.quantity),
    );
  }

  function selectSaleCategory(category: SaleCategory) {
    setSaleCategory(category);
    const currentItem = inventory.find(
      (item) => item.assetId === selectedSaleAssetId,
    );
    if (category === "all" && currentItem) return;
    if (category !== "all" && currentItem?.category === category) return;

    setSelectedSaleAssetId(
      inventory.find(
        (item) => category === "all" || item.category === category,
      )?.assetId ?? null,
    );
  }

  function submitSale() {
    setError(null);
    startTransition(async () => {
      const result = await sellShopResources(saleLines);
      if (!result.ok) {
        setSaleStep("select");
        if (result.errorCode === "shopInventoryChanged") setSaleSelection({});
        setError(tErrors(result.errorCode));
        return;
      }

      setOptimisticBalance(result.coinBalance);
      setSaleSelection({});
      setSaleStep("select");
      setSaleSuccess(
        t("shopSaleSuccess", {
          count: result.soldQuantity,
          coins: result.earnedCoins,
        }),
      );
    });
  }

  const tabLabels = {
    music: t("buyMusic"),
    outfits: t("buyOutfits"),
    sell: t("sellResources"),
  } as const;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) handleClose();
      }}
      role="presentation"
    >
      <section
        aria-busy={isPending}
        aria-labelledby="dashboard-shop-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.merchantPortrait}>
            <Image
              alt=""
              height={512}
              src={rabbitThumbnailPath}
              unoptimized
              width={512}
            />
          </div>
          <div className={styles.heading}>
            <p>{t("rabbitMerchant")}</p>
            <h2 id="dashboard-shop-title">{t("rabbitShop")}</h2>
            <span>{t("shopGreeting")}</span>
          </div>
          <span
            aria-label={t("coinBalance", { count: visibleBalance })}
            className={styles.balance}
          >
            <span aria-hidden="true" className={styles.coinIcon} />
            {t("coinBalance", { count: visibleBalance })}
          </span>
          <button
            aria-label={t("closeShop")}
            className={styles.closeButton}
            disabled={isPending}
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div aria-label={t("shopTabs")} className={styles.tabs} role="tablist">
          {shopTabs.map((tab) => (
            <button
              aria-controls={`dashboard-shop-${tab}-panel`}
              aria-selected={activeTab === tab}
              disabled={isPending}
              id={`dashboard-shop-${tab}-tab`}
              key={tab}
              onClick={() => selectTab(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, tab)}
              ref={(button) => {
                tabButtonRefs.current[tab] = button;
              }}
              role="tab"
              tabIndex={activeTab === tab ? 0 : -1}
              type="button"
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <main className={styles.body}>
          {activeTab === "music" ? (
            <div
              aria-labelledby="dashboard-shop-music-tab"
              className={styles.productGrid}
              id="dashboard-shop-music-panel"
              role="tabpanel"
            >
              {musicCatalog.map((track) => {
                const isOwned = shopState.ownedMusicIds.includes(track.id);
                const isPreviewing = previewTrackId === track.id;
                return (
                  <article className={styles.productCard} key={track.id}>
                    <div className={styles.productArtwork}>
                      <span aria-hidden="true" className={styles.recordArtwork} />
                    </div>
                    <div className={styles.productCopy}>
                      <div className={styles.productTitleRow}>
                        <strong>{tAssets(track.nameKey)}</strong>
                        {isOwned ? (
                          <span className={styles.stateBadge}>{t("musicOwned")}</span>
                        ) : null}
                      </div>
                      <p>{track.artist}</p>
                    </div>
                    <div className={styles.productFooter}>
                      <CoinPrice count={track.buyPrice} />
                      <div className={styles.cardActions}>
                        <button
                          className={styles.secondaryButton}
                          disabled={isPending}
                          onClick={() =>
                            onPreviewTrack(isPreviewing ? null : track.id)
                          }
                          type="button"
                        >
                          {isPreviewing ? t("stopPreview") : t("previewMusic")}
                        </button>
                        <button
                          className={styles.primaryButton}
                          disabled={
                            isPending || isOwned || visibleBalance < track.buyPrice
                          }
                          onClick={() => purchase(track.id)}
                          type="button"
                        >
                          {isOwned
                            ? t("musicOwned")
                            : visibleBalance < track.buyPrice
                              ? t("notEnoughCoins")
                              : t("buyForCoins", { count: track.buyPrice })}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {previewError ? (
                <p className={styles.errorMessage} role="alert">
                  {t("musicPreviewFailed")}
                </p>
              ) : null}
            </div>
          ) : activeTab === "outfits" ? (
            <DashboardShopOutfitList
              coinBalance={visibleBalance}
              isPending={isPending}
              onPurchase={purchaseOutfit}
              ownedOutfitIds={shopState.ownedOutfitIds}
              selectedOutfitId={selectedOutfitId}
            />
          ) : saleStep === "confirm" ? (
            <div
              aria-labelledby="dashboard-shop-sell-tab"
              className={styles.confirmation}
              id="dashboard-shop-sell-panel"
              role="tabpanel"
            >
              <div className={styles.confirmationHeading}>
                <span aria-hidden="true" className={styles.confirmationIcon}>✓</span>
                <div>
                  <h3 ref={confirmationTitleRef} tabIndex={-1}>
                    {t("shopSaleReviewTitle")}
                  </h3>
                  <p>{t("shopSaleReviewHint")}</p>
                </div>
              </div>
              <div className={styles.confirmationList}>
                {saleLines.map((line) => {
                  const asset = getCatalogAsset(line.assetId)!;
                  const thumbnailPath = getShopThumbnailPath(asset)!;
                  return (
                    <div className={styles.confirmationRow} key={line.assetId}>
                      <Image alt="" height={512} src={thumbnailPath} unoptimized width={512} />
                      <strong>{tAssets(asset.nameKey)}</strong>
                      <span>×{line.quantity}</span>
                      <CoinPrice count={line.quantity * (asset.sellPrice ?? 0)} />
                    </div>
                  );
                })}
              </div>
              <div className={styles.confirmationTotal}>
                <span>{t("shopSelectionSummary", { count: saleSummary.selectedQuantity })}</span>
                <strong>{t("shopExpectedCoins", { count: saleSummary.earnedCoins })}</strong>
              </div>
              <div className={styles.confirmationActions}>
                <button
                  className={styles.secondaryButton}
                  disabled={isPending}
                  onClick={() => setSaleStep("select")}
                  type="button"
                >
                  {t("shopBackToSelection")}
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isPending || saleLines.length === 0}
                  onClick={submitSale}
                  type="button"
                >
                  {isPending ? t("shopSelling") : t("shopConfirmSale")}
                </button>
              </div>
            </div>
          ) : (
            <div
              aria-labelledby="dashboard-shop-sell-tab"
              className={styles.sellPanel}
              id="dashboard-shop-sell-panel"
              role="tabpanel"
            >
              {inventory.length === 0 ? (
                <div className={styles.emptyState}>
                  <span aria-hidden="true" className={styles.emptyIcon}>◇</span>
                  <strong>{t("nothingToSell")}</strong>
                  <p>{t("earnResourcesHint")}</p>
                </div>
              ) : (
                <>
                  <div
                    aria-label={t("shopCategoryFilter")}
                    className={styles.categoryFilters}
                    role="group"
                  >
                    {(Object.keys(saleCategoryKeys) as SaleCategory[]).map(
                      (category) => {
                        const count =
                          category === "all"
                            ? inventory.length
                            : inventory.filter((item) => item.category === category)
                                .length;
                        return (
                          <button
                            aria-pressed={saleCategory === category}
                            key={category}
                            onClick={() => selectSaleCategory(category)}
                            type="button"
                          >
                            {t(saleCategoryKeys[category])}
                            <span>{count}</span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  <div className={styles.inventoryLayout}>
                    <div className={styles.inventoryGrid}>
                      {filteredInventory.length === 0 ? (
                        <p className={styles.filteredEmpty}>
                          {t("shopNoResourcesInCategory")}
                        </p>
                      ) : (
                        filteredInventory.map((item) => {
                          const asset = getCatalogAsset(item.assetId)!;
                          const itemName = tAssets(asset.nameKey);
                          const selectedQuantity =
                            effectiveSaleSelection[item.assetId] ?? 0;
                          const isCurrent = selectedInventoryItem?.assetId === item.assetId;
                          return (
                            <article
                              className={`${styles.inventoryCard} ${
                                isCurrent ? styles.inventoryCardCurrent : ""
                              } ${selectedQuantity > 0 ? styles.inventoryCardSelected : ""}`}
                              key={item.assetId}
                            >
                              <button
                                aria-label={t("shopViewItem", { name: itemName })}
                                className={styles.inventoryPreviewButton}
                                onClick={() => setSelectedSaleAssetId(item.assetId)}
                                type="button"
                              >
                                <span className={`${styles.inventoryImage} ${styles[item.category]}`}>
                                  <Image
                                    alt=""
                                    height={512}
                                    src={getShopThumbnailPath(asset)!}
                                    unoptimized
                                    width={512}
                                  />
                                </span>
                                <span className={styles.inventoryCopy}>
                                  <strong>{itemName}</strong>
                                  <small>{t("shopStockCount", { count: item.quantity })}</small>
                                </span>
                              </button>
                              <label className={styles.inventoryCheckbox}>
                                <input
                                  aria-label={
                                    selectedQuantity > 0
                                      ? t("shopRemoveItem", { name: itemName })
                                      : t("shopAddItem", { name: itemName })
                                  }
                                  checked={selectedQuantity > 0}
                                  onChange={() => {
                                    setSelectedSaleAssetId(item.assetId);
                                    setSaleSelection((current) =>
                                      toggleShopSaleItem(current, item),
                                    );
                                    setSaleSuccess(null);
                                  }}
                                  type="checkbox"
                                />
                                <span>
                                  {selectedQuantity > 0
                                    ? t("shopSelectedBadge", {
                                        count: selectedQuantity,
                                      })
                                    : t("shopAddItem", { name: itemName })}
                                </span>
                              </label>
                            </article>
                          );
                        })
                      )}
                    </div>

                    {selectedInventoryItem && selectedSaleAsset ? (
                      <aside className={styles.itemDetail}>
                        <span className={styles.detailEyebrow}>{t("shopCurrentItem")}</span>
                        <div
                          className={`${styles.detailImage} ${
                            styles[selectedInventoryItem.category]
                          }`}
                        >
                          <Image
                            alt=""
                            height={512}
                            src={getShopThumbnailPath(selectedSaleAsset)!}
                            unoptimized
                            width={512}
                          />
                        </div>
                        <div className={styles.detailCopy}>
                          <h3>{tAssets(selectedSaleAsset.nameKey)}</h3>
                          <p>
                            {t("shopStockCount", {
                              count: selectedInventoryItem.quantity,
                            })}
                            <span aria-hidden="true"> · </span>
                            {t("shopCoinEach")}
                          </p>
                        </div>
                        <div className={styles.quantityBlock}>
                          <strong>{t("shopSaleQuantity")}</strong>
                          <div className={styles.quantityControls}>
                            <button
                              aria-label={t("shopDecreaseQuantity", {
                                name: tAssets(selectedSaleAsset.nameKey),
                              })}
                              disabled={
                                isPending ||
                                (effectiveSaleSelection[
                                  selectedInventoryItem.assetId
                                ] ?? 0) === 0
                              }
                              onClick={() =>
                                updateSaleQuantity(
                                  selectedInventoryItem,
                                  (effectiveSaleSelection[
                                    selectedInventoryItem.assetId
                                  ] ?? 0) - 1,
                                )
                              }
                              type="button"
                            >
                              −
                            </button>
                            <output aria-live="polite">
                              {effectiveSaleSelection[
                                selectedInventoryItem.assetId
                              ] ?? 0}
                            </output>
                            <button
                              aria-label={t("shopIncreaseQuantity", {
                                name: tAssets(selectedSaleAsset.nameKey),
                              })}
                              disabled={
                                isPending ||
                                (effectiveSaleSelection[
                                  selectedInventoryItem.assetId
                                ] ?? 0) >=
                                  selectedInventoryItem.quantity
                              }
                              onClick={() =>
                                updateSaleQuantity(
                                  selectedInventoryItem,
                                  (effectiveSaleSelection[
                                    selectedInventoryItem.assetId
                                  ] ?? 0) + 1,
                                )
                              }
                              type="button"
                            >
                              +
                            </button>
                            <button
                              className={styles.allQuantityButton}
                              disabled={
                                isPending ||
                                effectiveSaleSelection[
                                  selectedInventoryItem.assetId
                                ] ===
                                  selectedInventoryItem.quantity
                              }
                              onClick={() =>
                                updateSaleQuantity(
                                  selectedInventoryItem,
                                  selectedInventoryItem.quantity,
                                )
                              }
                              type="button"
                            >
                              {t("shopSelectAllQuantity")}
                            </button>
                          </div>
                        </div>
                      </aside>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        <footer className={styles.footer}>
          <div aria-live="polite" className={styles.feedback}>
            {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
            {saleSuccess ? <p className={styles.successMessage}>{saleSuccess}</p> : null}
            {!error && !saleSuccess && activeTab !== "sell" ? (
              <p className={styles.futureNote}>{t("futureShopCategories")}</p>
            ) : null}
          </div>
          {activeTab === "sell" && saleStep === "select" && inventory.length > 0 ? (
            <div className={styles.saleBar}>
              <div aria-live="polite" className={styles.saleTotals}>
                <strong>
                  {t("shopSelectionSummary", {
                    count: saleSummary.selectedQuantity,
                  })}
                </strong>
                <span>{t("shopExpectedCoins", { count: saleSummary.earnedCoins })}</span>
              </div>
              <button
                className={styles.secondaryButton}
                disabled={isPending || saleLines.length === 0}
                onClick={() => setSaleSelection({})}
                type="button"
              >
                {t("shopClearSelection")}
              </button>
              <button
                className={styles.primaryButton}
                disabled={isPending || saleLines.length === 0}
                onClick={() => {
                  setError(null);
                  setSaleSuccess(null);
                  setSaleStep("confirm");
                }}
                type="button"
              >
                {t("shopReviewSale")}
              </button>
            </div>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
