"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteUserBug, deleteUserSnapshot, setActiveBug, setActiveSnapshot, setTableFlowerAsset } from "../actions";
import DashboardHomeScene from "./DashboardHomeScene";

type DashboardGardenClientProps = {
  ownedFlowerAssets: string[];
  tableFlowerAsset: string | null;
  caughtBugs: { id: string; bugAsset: string; isActive: boolean }[];
  snapshots: { id: string; imageData: string; isActive: boolean; createdAt: string }[];
};

export default function DashboardGardenClient({
  ownedFlowerAssets,
  tableFlowerAsset,
  caughtBugs,
  snapshots,
}: DashboardGardenClientProps) {
  const router = useRouter();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [localSelection, setLocalSelection] = useState<{
    serverAsset: string | null;
    asset: string | null;
  }>({ serverAsset: tableFlowerAsset, asset: tableFlowerAsset });
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedBug, setSelectedBug] = useState<{ id: string; bugAsset: string } | null>(null);
  const [isBugSelectorOpen, setIsBugSelectorOpen] = useState(false);
  const [isSnapshotSelectorOpen, setIsSnapshotSelectorOpen] = useState(false);
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
  const activeBugs = useMemo(() => caughtBugs.filter((bug) => bug.isActive), [caughtBugs]);
  const activeSnapshot = useMemo(() => snapshots.find((snapshot) => snapshot.isActive) ?? null, [snapshots]);

  const removeBug = useCallback(() => {
    if (!selectedBug) return;

    setActionError(null);
    startTransition(async () => {
      const result = await deleteUserBug(selectedBug.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSelectedBug(null);
      router.refresh();
    });
  }, [router, selectedBug]);

  const chooseBug = useCallback(
    (bugId: string) => {
      setActionError(null);
      startTransition(async () => {
        const result = await setActiveBug(bugId);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        setIsBugSelectorOpen(false);
        setSelectedBug(null);
        router.refresh();
      });
    },
    [router],
  );

  const chooseSnapshot = useCallback((snapshotId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await setActiveSnapshot(snapshotId);
      if (!result.ok) { setActionError(result.error); return; }
      setIsSnapshotSelectorOpen(false);
      router.refresh();
    });
  }, [router]);

  const removeSnapshot = useCallback((snapshotId: string) => {
    if (!window.confirm("Delete this snapshot permanently?")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteUserSnapshot(snapshotId);
      if (!result.ok) { setActionError(result.error); return; }
      router.refresh();
    });
  }, [router]);

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

      {selectedBug ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setSelectedBug(null);
        }}>
          <section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-bug-title">
            <div className="dashboard-table-flower-heading">
              <p>Garden visitor</p>
              <h2 id="dashboard-bug-title">{formatBugName(selectedBug.bugAsset)}</h2>
            </div>
            <div className="dashboard-table-flower-empty">
              <span className="dashboard-bug-dialog-icon" aria-hidden="true">&#128030;</span>
              <strong>This bug is flying around your avatar.</strong>
              <p>Release it to remove it from your garden.</p>
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions">
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => {
                setActionError(null);
                setIsBugSelectorOpen(true);
                setSelectedBug(null);
              }}>Choose companion</button>
              <button className="dashboard-table-flower-secondary dashboard-bug-delete" disabled={isPending} type="button" onClick={removeBug}>Release bug</button>
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setSelectedBug(null)}>Close</button>
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
              <p>Garden visitors</p>
              <h2 id="dashboard-bug-selector-title">Choose a companion</h2>
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
                  <span>{bug.isActive ? "Flying with you" : "Choose companion"}</span>
                </button>
              ))}
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions">
              <button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsBugSelectorOpen(false)}>Close</button>
            </div>
          </section>
        </div>
      ) : null}

      {isSnapshotSelectorOpen ? (
        <div className="dashboard-table-flower-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) setIsSnapshotSelectorOpen(false);
        }}>
          <section className="dashboard-table-flower-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-snapshot-selector-title">
            <div className="dashboard-table-flower-heading"><p>Garden memories</p><h2 id="dashboard-snapshot-selector-title">Choose a snapshot</h2></div>
            <div className="dashboard-table-flower-grid">
              {snapshots.map((snapshot, index) => <div className={["dashboard-table-flower-option", "dashboard-snapshot-option", snapshot.isActive ? "is-selected" : ""].filter(Boolean).join(" ")} key={snapshot.id}>
                <button className="dashboard-snapshot-select" disabled={isPending} type="button" onClick={() => chooseSnapshot(snapshot.id)}>
                  <Image className="dashboard-snapshot-thumbnail" src={snapshot.imageData} alt={`Garden snapshot ${snapshots.length - index}`} width={480} height={270} unoptimized />
                  <strong>Snapshot {snapshots.length - index}</strong>
                  <span>{snapshot.isActive ? "On the wall" : "Choose snapshot"}</span>
                </button>
                <button className="dashboard-snapshot-delete" disabled={isPending} type="button" onClick={() => removeSnapshot(snapshot.id)} aria-label={`Delete snapshot ${snapshots.length - index}`}>Delete</button>
              </div>)}
            </div>
            {actionError ? <p className="dashboard-table-flower-error">{actionError}</p> : null}
            <div className="dashboard-table-flower-actions"><button className="dashboard-table-flower-secondary" disabled={isPending} type="button" onClick={() => setIsSnapshotSelectorOpen(false)}>Close</button></div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function formatFlowerName(asset: string) {
  return asset.replace(".glb", "").replace("flower", "Flower ");
}

function formatBugName(asset: string) {
  return asset.replace(/\.glb$/i, "");
}
