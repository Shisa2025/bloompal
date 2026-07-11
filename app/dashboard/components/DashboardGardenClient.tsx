"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { setTableFlowerAsset } from "../actions";
import DashboardHomeScene from "./DashboardHomeScene";

type DashboardGardenClientProps = {
  ownedFlowerAssets: string[];
  tableFlowerAsset: string | null;
};

export default function DashboardGardenClient({
  ownedFlowerAssets,
  tableFlowerAsset,
}: DashboardGardenClientProps) {
  const router = useRouter();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localSelection, setLocalSelection] = useState<{
    serverAsset: string | null;
    asset: string | null;
  }>({ serverAsset: tableFlowerAsset, asset: tableFlowerAsset });
  const [actionError, setActionError] = useState<string | null>(null);
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
          setActionError(result.error);
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
    [router, tableFlowerAsset],
  );

  return (
    <>
      <DashboardHomeScene
        tableFlowerAsset={selectedAsset}
        onTablePotClick={openSelector}
      />

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
              <p>Table planter</p>
              <h2 id="dashboard-table-flower-title">Choose a bloom</h2>
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
                    <strong>{formatFlowerName(asset)}</strong>
                    <span>
                      {selectedAsset === asset ? "On the table" : "Owned bloom"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-table-flower-empty">
                <span className="dashboard-table-flower-empty-icon" aria-hidden="true" />
                <strong>No blooms yet</strong>
                <p>Finish a watering run to unlock flowers for the table pot.</p>
                <Link className="dashboard-game-button" href="/games/watering">
                  Start watering
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
                Empty pot
              </button>
              <button
                className="dashboard-table-flower-secondary"
                disabled={isPending}
                type="button"
                onClick={closeSelector}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function formatFlowerName(asset: string) {
  return asset.replace(".glb", "").replace("flower", "Flower ");
}
