"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  getCatalogAsset,
  musicCatalog,
  type MusicTrackId,
  type ShopState,
} from "../../../lib/asset-catalog";
import { buyMusicTrack, sellShopResource } from "../actions";

type DashboardShopPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  onPreviewTrack: (trackId: MusicTrackId | null) => void;
  previewError: boolean;
  previewTrackId: MusicTrackId | null;
  shopState: ShopState;
};

const sellCategoryKeys = {
  flower: "shopFlowers",
  bug: "shopBugs",
  fish: "shopFish",
  fruit: "shopFruit",
} as const;

export default function DashboardShopPreview({
  isOpen,
  onClose,
  onPreviewTrack,
  previewError,
  previewTrackId,
  shopState,
}: DashboardShopPreviewProps) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tAssets = useTranslations("Assets");
  const tErrors = useTranslations("Errors");
  const dialogRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [confirmAssetId, setConfirmAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const groupedInventory = useMemo(
    () =>
      Object.entries(sellCategoryKeys).map(([category, labelKey]) => ({
        category: category as keyof typeof sellCategoryKeys,
        labelKey,
        items: shopState.inventory.filter((item) => item.category === category),
      })),
    [shopState.inventory],
  );

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button:not([disabled])')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  function purchase(trackId: MusicTrackId) {
    setError(null);
    startTransition(async () => {
      const result = await buyMusicTrack(trackId);
      if (!result.ok) {
        setError(tErrors(result.errorCode));
        return;
      }
      router.refresh();
    });
  }

  function sell(assetId: string) {
    setError(null);
    startTransition(async () => {
      const result = await sellShopResource(assetId);
      if (!result.ok) {
        setError(tErrors(result.errorCode));
        return;
      }
      setConfirmAssetId(null);
      router.refresh();
    });
  }

  return (
    <div
      className="dashboard-table-flower-overlay dashboard-shop-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        aria-busy={isPending}
        aria-labelledby="dashboard-shop-title"
        aria-modal="true"
        className="dashboard-table-flower-dialog dashboard-shop-dialog"
        ref={dialogRef}
        role="dialog"
      >
        <button
          aria-label={t("closeShop")}
          className="dashboard-shop-close"
          disabled={isPending}
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <div className="dashboard-table-flower-heading dashboard-shop-heading">
          <p>{t("rabbitMerchant")}</p>
          <h2 id="dashboard-shop-title">{t("rabbitRecordShop")}</h2>
          <span className="dashboard-shop-balance">
            <span aria-hidden="true">●</span>
            {t("coinBalance", { count: shopState.coinBalance })}
          </span>
        </div>

        <div aria-label={t("shopTabs")} className="dashboard-shop-tabs" role="tablist">
          <button
            aria-controls="dashboard-shop-buy-panel"
            aria-selected={activeTab === "buy"}
            disabled={isPending}
            onClick={() => {
              setActiveTab("buy");
              setConfirmAssetId(null);
              setError(null);
            }}
            role="tab"
            id="dashboard-shop-buy-tab"
            tabIndex={activeTab === "buy" ? 0 : -1}
            type="button"
          >
            {t("buyMusic")}
          </button>
          <button
            aria-controls="dashboard-shop-sell-panel"
            aria-selected={activeTab === "sell"}
            disabled={isPending}
            onClick={() => {
              onPreviewTrack(null);
              setActiveTab("sell");
              setError(null);
            }}
            role="tab"
            id="dashboard-shop-sell-tab"
            tabIndex={activeTab === "sell" ? 0 : -1}
            type="button"
          >
            {t("sellResources")}
          </button>
        </div>

        {activeTab === "buy" ? (
          <div
            aria-labelledby="dashboard-shop-buy-tab"
            className="dashboard-shop-music-list"
            id="dashboard-shop-buy-panel"
            role="tabpanel"
          >
            {musicCatalog.map((track) => {
              const isOwned = shopState.ownedMusicIds.includes(track.id);
              const isPreviewing = previewTrackId === track.id;
              return (
                <article className="dashboard-shop-music-card" key={track.id}>
                  <span className="dashboard-music-record" aria-hidden="true" />
                  <div>
                    <strong>{tAssets(track.nameKey)}</strong>
                    <small>{track.artist}</small>
                  </div>
                  <span className="dashboard-shop-price">
                    <span aria-hidden="true">●</span> {track.buyPrice}
                  </span>
                  <button
                    className="dashboard-shop-preview-button"
                    disabled={isPending}
                    onClick={() => onPreviewTrack(isPreviewing ? null : track.id)}
                    type="button"
                  >
                    {isPreviewing ? t("stopPreview") : t("previewMusic")}
                  </button>
                  <button
                    className="dashboard-shop-buy-button"
                    disabled={isPending || isOwned || shopState.coinBalance < track.buyPrice}
                    onClick={() => purchase(track.id)}
                    type="button"
                  >
                    {isOwned
                      ? t("musicOwned")
                      : shopState.coinBalance < track.buyPrice
                        ? t("notEnoughCoins")
                        : t("buyForCoins", { count: track.buyPrice })}
                  </button>
                </article>
              );
            })}
            {previewError ? (
              <p className="dashboard-table-flower-error" role="alert">
                {t("musicPreviewFailed")}
              </p>
            ) : null}
          </div>
        ) : (
          <div
            aria-labelledby="dashboard-shop-sell-tab"
            className="dashboard-shop-inventory"
            id="dashboard-shop-sell-panel"
            role="tabpanel"
          >
            {shopState.inventory.length === 0 ? (
              <div className="dashboard-table-flower-empty">
                <span className="dashboard-shop-empty-icon" aria-hidden="true">◇</span>
                <strong>{t("nothingToSell")}</strong>
                <p>{t("earnResourcesHint")}</p>
              </div>
            ) : (
              groupedInventory.map((group) =>
                group.items.length > 0 ? (
                  <section className="dashboard-shop-inventory-group" key={group.category}>
                    <h3>{t(group.labelKey)}</h3>
                    {group.items.map((item) => {
                      const asset = getCatalogAsset(item.assetId)!;
                      const isConfirming = confirmAssetId === item.assetId;
                      return (
                        <div className="dashboard-shop-inventory-row" key={item.assetId}>
                          <span className={`dashboard-shop-category-icon is-${item.category}`} aria-hidden="true" />
                          <strong>{tAssets(asset.nameKey)}</strong>
                          <span>{t("ownedQuantity", { count: item.quantity })}</span>
                          {isConfirming ? (
                            <span className="dashboard-shop-confirm-sale">
                              <span className="dashboard-shop-confirm-copy">
                                {t("confirmSellOne")}
                              </span>
                              <button disabled={isPending} onClick={() => sell(item.assetId)} type="button">
                                {t("confirmSell")}
                              </button>
                              <button disabled={isPending} onClick={() => setConfirmAssetId(null)} type="button">
                                {t("cancel")}
                              </button>
                            </span>
                          ) : (
                            <button
                              className="dashboard-shop-sell-button"
                              disabled={isPending}
                              onClick={() => setConfirmAssetId(item.assetId)}
                              type="button"
                            >
                              {t("sellForOneCoin")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </section>
                ) : null,
              )
            )}
          </div>
        )}

        {error ? (
          <p className="dashboard-table-flower-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="dashboard-shop-coming-soon">{t("futureShopCategories")}</p>
      </section>
    </div>
  );
}
