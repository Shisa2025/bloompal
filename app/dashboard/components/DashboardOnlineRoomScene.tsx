"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as THREE from "three";

import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
  type ThreeStageResize,
} from "@/app/components/threejs";
import {
  clampOnlineRoomPosition,
  getOnlineRoomInterpolationAlpha,
  onlineRoomContract,
  type OnlineRoomPlayer,
} from "@/lib/online-room-protocol";
import {
  leaveOnlineRoom,
  OnlineRoomRequestError,
  requestOnlineRoomTicket,
  syncOnlineRoom,
  type OnlineRoomConnection,
} from "../online-room-client";
import { loadDashboardCharacter } from "./dashboardCharacter";
import type { DashboardOutfitId } from "./dashboardOutfits";

type DashboardOnlineRoomSceneProps = {
  connection: OnlineRoomConnection;
  outfitId: DashboardOutfitId;
  onExit: () => void;
  onSceneReady?: () => void;
};

type ConnectionStatus =
  | "connected"
  | "connecting"
  | "error"
  | "full"
  | "reconnecting"
  | "replaced";

type LocalPose = {
  x: number;
  z: number;
  heading: number;
  moving: boolean;
};

type RemoteAvatar = {
  controller: ReturnType<typeof loadDashboardCharacter>;
  current: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  moving: boolean;
  outfitId: DashboardOutfitId;
  animation: "idle" | "walk";
};

type OnlineRoomEnvironment = {
  floor: THREE.Mesh;
  object: THREE.Group;
};

function createMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  options: {
    castShadow?: boolean;
    receiveShadow?: boolean;
    rotation?: [number, number, number];
  } = {},
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = Boolean(options.castShadow);
  mesh.receiveShadow = Boolean(options.receiveShadow);
  return mesh;
}

function box(
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
  options?: Parameters<typeof createMesh>[3],
) {
  return createMesh(new THREE.BoxGeometry(...size), material, position, options);
}

export function addOnlineRoomEnvironment(parent: THREE.Group): OnlineRoomEnvironment {
  const room = new THREE.Group();
  room.name = "dashboard-online-room-environment";
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#bfa47f",
    roughness: 0.9,
  });
  const wall = new THREE.MeshStandardMaterial({ color: "#dce4d7", roughness: 0.96 });
  const wood = new THREE.MeshStandardMaterial({ color: "#76543d", roughness: 0.82 });
  const sage = new THREE.MeshStandardMaterial({ color: "#718c76", roughness: 0.92 });
  const linen = new THREE.MeshStandardMaterial({ color: "#efe7d6", roughness: 1 });
  const glow = new THREE.MeshStandardMaterial({
    color: "#bce4d8",
    emissive: "#8ac8b7",
    emissiveIntensity: 0.45,
    roughness: 0.32,
  });

  const floor = createMesh(
    new THREE.PlaneGeometry(12, 9),
    floorMaterial,
    [0, 0, 0.25],
    { receiveShadow: true, rotation: [-Math.PI / 2, 0, 0] },
  );
  floor.name = "dashboard-online-room-floor";
  room.add(
    floor,
    box([12.2, 5.8, 0.14], wall, [0, 2.9, -4.15], { receiveShadow: true }),
    box([0.14, 5.8, 8.5], wall, [-6.05, 2.9, 0.05], { receiveShadow: true }),
    box([0.14, 5.8, 8.5], wall, [6.05, 2.9, 0.05], { receiveShadow: true }),
  );

  const rug = createMesh(
    new THREE.CylinderGeometry(1, 1, 0.035, 64),
    new THREE.MeshStandardMaterial({ color: "#d8c7a8", roughness: 1 }),
    [0, 0.035, 0.2],
    { receiveShadow: true },
  );
  rug.scale.set(3.5, 1, 2.35);
  rug.name = "dashboard-online-room-rug";
  room.add(rug);

  [-4.95, 4.95].forEach((x, index) => {
    const planter = new THREE.Group();
    planter.name = `dashboard-online-room-planter-${index + 1}`;
    planter.position.set(x, 0, -3.45);
    planter.add(
      createMesh(new THREE.CylinderGeometry(0.48, 0.38, 0.68, 24), linen, [0, 0.34, 0], {
        castShadow: true,
      }),
      createMesh(new THREE.SphereGeometry(0.54, 24, 18), sage, [0, 1.08, 0], {
        castShadow: true,
      }),
      createMesh(new THREE.SphereGeometry(0.4, 24, 18), sage, [0.34, 1.36, 0], {
        castShadow: true,
      }),
    );
    room.add(planter);
  });

  const backTable = new THREE.Group();
  backTable.name = "dashboard-online-room-back-table";
  backTable.position.set(0, 0, -3.62);
  backTable.add(
    box([3.1, 0.16, 0.62], wood, [0, 0.88, 0], { castShadow: true }),
    box([0.14, 0.82, 0.14], wood, [-1.25, 0.42, 0], { castShadow: true }),
    box([0.14, 0.82, 0.14], wood, [1.25, 0.42, 0], { castShadow: true }),
    box([1.15, 0.62, 0.08], wood, [0, 1.5, 0.05], { castShadow: true }),
    box([0.98, 0.45, 0.025], glow, [0, 1.5, 0.1]),
  );
  room.add(backTable);

  const ceilingLight = new THREE.PointLight("#fff0c9", 2.6, 14, 2);
  ceilingLight.position.set(0, 4.9, 0.4);
  room.add(ceilingLight);
  parent.add(room);
  return { floor, object: room };
}

export default function DashboardOnlineRoomScene({
  connection,
  outfitId,
  onExit,
  onSceneReady,
}: DashboardOnlineRoomSceneProps) {
  const t = useTranslations("Dashboard");
  const initialSelf = connection.initialSnapshot.self;
  const localPoseRef = useRef<LocalPose>({
    x: initialSelf.x,
    z: initialSelf.z,
    heading: initialSelf.heading,
    moving: false,
  });
  const targetRef = useRef(new THREE.Vector3(initialSelf.x, 0, initialSelf.z));
  const playersRef = useRef(connection.initialSnapshot.players);
  const labelElementsRef = useRef(new Map<string, HTMLSpanElement>());
  const leaveRef = useRef<() => Promise<void>>(async () => undefined);
  const [players, setPlayers] = useState(connection.initialSnapshot.players);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let failureCount = 0;
    let credentials = {
      endpoint: connection.endpoint,
      expiresAt: connection.expiresAt,
      sessionId: connection.sessionId,
      ticket: connection.ticket,
    };
    let sequence = connection.sequence;

    const schedule = (delay: number) => {
      if (cancelled) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(runSync, delay);
    };

    const refreshTicket = async () => {
      const next = await requestOnlineRoomTicket(credentials.sessionId);
      credentials = next;
    };

    const runSync = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        schedule(1000);
        return;
      }
      const syncStartedAt = performance.now();
      try {
        if (new Date(credentials.expiresAt).getTime() - Date.now() <= 120_000) {
          await refreshTicket();
        }
        sequence += 1;
        const snapshot = await syncOnlineRoom(credentials, {
          sequence,
          ...localPoseRef.current,
          outfitId,
        });
        if (cancelled) return;
        failureCount = 0;
        setStatus("connected");
        setPlayers(snapshot.players);
        const interval = localPoseRef.current.moving
          ? onlineRoomContract.movingSyncMs
          : onlineRoomContract.idleSyncMs;
        schedule(Math.max(0, interval - (performance.now() - syncStartedAt)));
      } catch (error) {
        if (cancelled) return;
        if (error instanceof OnlineRoomRequestError) {
          if (error.status === 401) {
            try {
              await refreshTicket();
              schedule(0);
              return;
            } catch {
              setStatus("error");
              return;
            }
          }
          if (error.code === "stale_sequence") {
            schedule(0);
            return;
          }
          if (error.code === "session_replaced") {
            setStatus("replaced");
            return;
          }
          if (error.code === "room_full") {
            setStatus("full");
            return;
          }
        }
        failureCount += 1;
        setStatus(failureCount > 1 ? "reconnecting" : "connecting");
        const retryDelays = [500, 1000, 2000, 4000, 5000];
        schedule(retryDelays[Math.min(failureCount - 1, retryDelays.length - 1)]);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule(0);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    leaveRef.current = async () => leaveOnlineRoom(credentials);
    schedule(0);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void leaveOnlineRoom(credentials, true);
      leaveRef.current = async () => undefined;
    };
  }, [connection, outfitId]);

  const setup = useCallback(
    (context: ThreeStageContext) => {
      const { camera, reducedMotion, renderer, scene } = context;
      const root = new THREE.Group();
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const remoteAvatars = new Map<string, RemoteAvatar>();
      const initialPosition = new THREE.Vector3(initialSelf.x, 0, initialSelf.z);
      const cameraPosition = new THREE.Vector3(0, 5.65, 9.7);
      const cameraTarget = new THREE.Vector3(0, 1.05, 0.05);
      let localAnimation: "idle" | "walk" = "idle";
      let sceneReadyReported = false;

      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      scene.background = new THREE.Color("#e9e2d2");
      scene.fog = new THREE.Fog("#e9e2d2", 12, 22);
      camera.position.copy(cameraPosition);
      camera.lookAt(cameraTarget);
      scene.add(root);

      const ambient = new THREE.HemisphereLight("#fff8e8", "#726b5e", 1.45);
      const sunlight = new THREE.DirectionalLight("#ffe9c0", 2.65);
      sunlight.position.set(-4.5, 7.2, 4.8);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      sunlight.shadow.camera.left = -7;
      sunlight.shadow.camera.right = 7;
      sunlight.shadow.camera.top = 6;
      sunlight.shadow.camera.bottom = -6;
      scene.add(ambient, sunlight);

      const environment = addOnlineRoomEnvironment(root);
      const localCharacter = loadDashboardCharacter({
        initialAnimation: "idle",
        initialOutfitId: outfitId,
        name: "dashboard-online-room-local-character",
        onError: () => {
          if (!sceneReadyReported) onSceneReady?.();
          sceneReadyReported = true;
        },
        onReady: () => {
          localCharacter.faceCamera(camera);
          if (!sceneReadyReported) onSceneReady?.();
          sceneReadyReported = true;
        },
        parent: root,
        position: initialPosition,
      });

      const readPointer = (event: PointerEvent) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObject(environment.floor, false)[0]?.point;
      };
      const onPointerMove = (event: PointerEvent) => {
        renderer.domElement.style.cursor = readPointer(event) ? "pointer" : "";
      };
      const onPointerDown = (event: PointerEvent) => {
        const point = readPointer(event);
        if (!point) return;
        event.preventDefault();
        const target = clampOnlineRoomPosition({ x: point.x, z: point.z });
        targetRef.current.set(target.x, 0, target.z);
      };
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerdown", onPointerDown);

      const reconcileRemoteAvatars = () => {
        const remotePlayers = playersRef.current.filter(
          (player) => player.userId !== initialSelf.userId,
        );
        const activeIds = new Set(remotePlayers.map((player) => player.userId));
        remotePlayers.forEach((player) => {
          const target = new THREE.Vector3(player.x, 0, player.z);
          const existing = remoteAvatars.get(player.userId);
          if (existing) {
            existing.target.copy(target);
            existing.heading = player.heading;
            existing.moving = player.moving;
            if (existing.outfitId !== player.outfitId) {
              existing.outfitId = player.outfitId;
              existing.controller.setOutfit(player.outfitId);
            }
            return;
          }
          const current = target.clone();
          const controller = loadDashboardCharacter({
            initialAnimation: player.moving ? "walk" : "idle",
            initialOutfitId: player.outfitId,
            name: `dashboard-online-room-character-${player.userId}`,
            parent: root,
            position: current,
          });
          remoteAvatars.set(player.userId, {
            controller,
            current,
            target,
            heading: player.heading,
            moving: player.moving,
            outfitId: player.outfitId,
            animation: player.moving ? "walk" : "idle",
          });
        });
        remoteAvatars.forEach((avatar, userId) => {
          if (activeIds.has(userId)) return;
          avatar.controller.dispose();
          remoteAvatars.delete(userId);
        });
      };

      const updateLabels = () => {
        remoteAvatars.forEach((avatar, userId) => {
          const label = labelElementsRef.current.get(userId);
          const object = avatar.controller.getObject();
          if (!label || !object) return;
          const projected = object.position.clone().add(new THREE.Vector3(0, 2.25, 0));
          projected.project(camera);
          const visible = Math.abs(projected.x) <= 1.06 && Math.abs(projected.y) <= 1.06;
          label.hidden = !visible;
          if (!visible) return;
          label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
          label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
        });
      };

      const onResize = ({ height, width }: ThreeStageResize) => {
        const compact = width / height < 1.35;
        camera.fov = compact ? 48 : 40;
        camera.position.set(0, compact ? 6.3 : 5.65, compact ? 11.1 : 9.7);
        camera.lookAt(cameraTarget);
        camera.updateProjectionMatrix();
      };

      const onFrame = ({ delta }: ThreeStageFrame) => {
        localCharacter.update(delta);
        const localObject = localCharacter.getObject();
        if (localObject) {
          const remaining = targetRef.current.clone().sub(localObject.position);
          remaining.y = 0;
          const distance = remaining.length();
          if (distance > 0.035) {
            const direction = remaining.normalize();
            const step = reducedMotion
              ? distance
              : Math.min(distance, onlineRoomContract.movementSpeed * delta);
            localObject.position.addScaledVector(direction, step);
            localCharacter.facePoint(targetRef.current);
            if (localAnimation !== "walk" && !reducedMotion) {
              localAnimation = "walk";
              localCharacter.play("walk", { fadeDuration: 0.16 });
            }
            localPoseRef.current = {
              x: localObject.position.x,
              z: localObject.position.z,
              heading: Math.atan2(direction.x, direction.z),
              moving: !reducedMotion && distance - step > 0.035,
            };
          } else {
            localObject.position.copy(targetRef.current);
            if (localAnimation !== "idle") {
              localAnimation = "idle";
              localCharacter.play("idle", { fadeDuration: 0.18 });
            }
            localPoseRef.current = {
              ...localPoseRef.current,
              x: localObject.position.x,
              z: localObject.position.z,
              moving: false,
            };
          }
        }

        reconcileRemoteAvatars();
        remoteAvatars.forEach((avatar) => {
          avatar.controller.update(delta);
          const object = avatar.controller.getObject();
          if (!object) return;
          const smoothing = getOnlineRoomInterpolationAlpha(delta, reducedMotion);
          avatar.current.lerp(avatar.target, smoothing);
          object.position.copy(avatar.current);
          avatar.controller.facePoint(
            new THREE.Vector3(
              avatar.current.x + Math.sin(avatar.heading),
              0,
              avatar.current.z + Math.cos(avatar.heading),
            ),
          );
          const nextAnimation = reducedMotion
            ? "idle"
            : avatar.moving
              ? "walk"
              : "idle";
          if (avatar.animation !== nextAnimation) {
            avatar.animation = nextAnimation;
            avatar.controller.play(nextAnimation, { fadeDuration: 0.18 });
          }
        });
        updateLabels();
      };

      return {
        dispose: () => {
          localCharacter.dispose();
          remoteAvatars.forEach((avatar) => avatar.controller.dispose());
          remoteAvatars.clear();
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          scene.remove(root, ambient, sunlight);
          disposeObject3D(root);
        },
        onFrame,
        onResize,
      };
    },
    [initialSelf, onSceneReady, outfitId],
  );

  const exitRoom = async () => {
    if (isExiting) return;
    setIsExiting(true);
    await leaveRef.current();
    onExit();
  };

  const statusLabel =
    status === "connected"
      ? t("onlineRoomConnected")
      : status === "reconnecting"
        ? t("onlineRoomReconnecting")
        : status === "replaced"
          ? t("onlineRoomSessionReplaced")
          : status === "full"
            ? t("onlineRoomFull")
            : status === "error"
              ? t("onlineRoomConnectionFailed")
              : t("onlineRoomConnecting");

  return (
    <div className="dashboard-three-layer dashboard-three-layer-interactive dashboard-online-room-layer">
      <ThreeStage
        animateWhenReducedMotion
        ariaLabel={t("onlineRoom")}
        className="dashboard-three-stage"
        fallback={<div className="dashboard-online-room-fallback" />}
        setup={setup}
      />
      <div className="dashboard-online-room-toolbar">
        <div aria-live="polite" className={`dashboard-online-room-status is-${status}`}>
          <span aria-hidden="true" />
          <strong>{statusLabel}</strong>
          <small>{t("onlineRoomPlayerCount", { count: players.length, capacity: onlineRoomContract.maxPlayers })}</small>
        </div>
        <button
          disabled={isExiting}
          id="dashboard-online-room-exit-trigger"
          onClick={exitRoom}
          type="button"
        >
          {isExiting ? t("onlineRoomLeaving") : t("exitOnlineRoom")}
        </button>
      </div>
      <div aria-hidden="true" className="dashboard-online-room-labels">
        {players
          .filter((player) => player.userId !== initialSelf.userId)
          .map((player: OnlineRoomPlayer) => (
            <span
              className="dashboard-online-room-player-label"
              key={player.userId}
              ref={(element) => {
                if (element) labelElementsRef.current.set(player.userId, element);
                else labelElementsRef.current.delete(player.userId);
              }}
            >
              {player.displayName}
            </span>
          ))}
      </div>
      <p className="dashboard-online-room-hint">{t("onlineRoomMoveHint")}</p>
    </div>
  );
}
