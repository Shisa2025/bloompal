import * as THREE from "three";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock("@/app/components/threejs", () => ({
  ThreeStage: () => null,
  disposeObject3D: vi.fn(),
}));

vi.mock("./dashboardCharacter", () => ({
  loadDashboardCharacter: vi.fn(),
}));

import DashboardOnlineRoomScene, {
  addOnlineRoomEnvironment,
} from "./DashboardOnlineRoomScene";

const connection = {
  endpoint: "/api/online-room",
  expiresAt: "2099-01-01T00:00:00.000Z",
  issuedAt: Date.now(),
  sessionId: "11111111-1111-4111-8111-111111111111",
  sequence: 0,
  initialSnapshot: {
    roomId: "public",
    serverTime: "2026-01-01T00:00:00.000Z",
    capacity: 8,
    self: {
      userId: "user-1",
      displayName: "Local Friend",
      outfitId: "base" as const,
      x: -3.6,
      z: 2.4,
      heading: 0,
      moving: false,
      lastSeenAt: "2026-01-01T00:00:00.000Z",
    },
    players: [
      {
        userId: "user-1",
        displayName: "Local Friend",
        outfitId: "base" as const,
        x: -3.6,
        z: 2.4,
        heading: 0,
        moving: false,
        lastSeenAt: "2026-01-01T00:00:00.000Z",
      },
      {
        userId: "user-2",
        displayName: "Remote Friend",
        outfitId: "moss-cardigan" as const,
        x: 1.2,
        z: 2.7,
        heading: 0,
        moving: true,
        lastSeenAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
};

describe("dashboard online room", () => {
  it("builds an open room with a raycastable floor and edge furniture", () => {
    const parent = new THREE.Group();
    const environment = addOnlineRoomEnvironment(parent);

    expect(parent.children).toContain(environment.object);
    expect(environment.floor.name).toBe("dashboard-online-room-floor");
    expect(environment.floor.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(
      environment.object.getObjectByName("dashboard-online-room-back-table"),
    ).toBeTruthy();
    expect(
      environment.object.getObjectByName("dashboard-online-room-planter-1"),
    ).toBeTruthy();
  });

  it("renders an exit control, player count, move hint, and remote name", () => {
    const markup = renderToStaticMarkup(
      <DashboardOnlineRoomScene
        connection={connection}
        outfitId="base"
        onExit={vi.fn()}
      />,
    );

    expect(markup).toContain('id="dashboard-online-room-exit-trigger"');
    expect(markup).toContain("onlineRoomPlayerCount");
    expect(markup).toContain("onlineRoomMoveHint");
    expect(markup).toContain("Remote Friend");
    expect(markup).not.toContain(">Local Friend</span>");
  });
});
