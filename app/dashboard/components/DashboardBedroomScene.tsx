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
  dashboardBedroomDoorOpenAngle,
  dashboardBedroomDoorStyle,
} from "./dashboardBedroomDoor";
import { loadDashboardCharacter } from "./dashboardCharacter";
import {
  defaultDashboardOutfitId,
  type DashboardOutfitId,
} from "./dashboardOutfits";

export const bedroomPositions = {
  door: [6.02, 0, -2.85],
  bed: [-4.05, 0, -2.75],
  window: [-6.03, 3.45, -2.75],
  nightstand: [-5.25, 0, -4.42],
  plant: [0.55, 0, -4.45],
  wardrobe: [3.25, 0, -4.48],
  computer: [-1.15, 0, -4.48],
  characterEntry: [5.68, 0, -2.85],
  characterRest: [0.35, 0, 0.3],
} as const;

export const bedroomComputerInteraction = {
  approach: [-1.15, 0, -3.05],
} as const;

export const bedroomBedInteraction = {
  approach: [-3.65, 0, -1.25],
  seated: [-3.65, 0.9, -2.6],
  sitHipsOffset: [0, 0.271, 0.237],
} as const;

type DashboardBedroomSceneProps = {
  outfitId?: DashboardOutfitId;
  onReturnComplete?: () => void;
  onReturnTransitionStart?: () => void;
  onSceneReady?: () => void;
  onWardrobeClick?: () => void;
  onComputerClick?: () => Promise<boolean>;
};

type BedroomDoor = {
  object: THREE.Group;
  update: (openAmount: number) => void;
};

type BedroomEnvironment = {
  object: THREE.Group;
  bed: THREE.Group;
  computer: THREE.Group;
  wardrobe: THREE.Group;
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

export function addBedroomEnvironment(parent: THREE.Group): BedroomEnvironment {
  const room = new THREE.Group();
  room.name = "dashboard-bedroom-environment";

  const wall = new THREE.MeshStandardMaterial({ color: "#dfe2cf", roughness: 0.94 });
  const sideWall = new THREE.MeshStandardMaterial({ color: "#cbd2bc", roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: "#936c4d", roughness: 0.78 });
  const darkWood = new THREE.MeshStandardMaterial({ color: "#674832", roughness: 0.82 });
  const floor = new THREE.MeshStandardMaterial({ color: "#c5a57f", roughness: 0.88 });
  const sage = new THREE.MeshStandardMaterial({ color: "#829879", roughness: 0.92 });
  const blanket = new THREE.MeshStandardMaterial({ color: "#aab99d", roughness: 0.98 });
  const linen = new THREE.MeshStandardMaterial({ color: "#f1ead9", roughness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c59b4f", metalness: 0.34, roughness: 0.44 });
  const glass = new THREE.MeshStandardMaterial({
    color: "#c9e3df",
    emissive: "#d7eee7",
    emissiveIntensity: 0.16,
    roughness: 0.28,
  });

  room.add(
    createMesh(new THREE.PlaneGeometry(14, 11), floor, [0, 0, -0.2], {
      receiveShadow: true,
      rotation: [-Math.PI / 2, 0, 0],
    }),
    box([13, 6.6, 0.12], wall, [0, 3.3, -5.25], { receiveShadow: true }),
    box([0.12, 6.6, 10.2], sideWall, [-6.1, 3.3, -0.2], { receiveShadow: true }),
    box([0.12, 6.6, 10.2], sideWall, [6.1, 3.3, -0.2], { receiveShadow: true }),
    box([12.75, 0.17, 0.15], wood, [0, 0.32, -5.13], { castShadow: true }),
  );

  const rug = createMesh(
    new THREE.CylinderGeometry(1, 1, 0.035, 64),
    new THREE.MeshStandardMaterial({ color: "#d9c8a9", roughness: 1 }),
    [-0.3, 0.035, 0.25],
    { receiveShadow: true },
  );
  rug.scale.set(2.7, 1, 1.45);
  room.add(rug);

  const windowGroup = new THREE.Group();
  windowGroup.name = "dashboard-bedroom-window";
  windowGroup.position.set(...bedroomPositions.window);
  windowGroup.rotation.y = Math.PI / 2;
  windowGroup.add(
    createMesh(new THREE.PlaneGeometry(2.35, 1.68), glass, [0, 0, 0.03]),
    box([2.7, 0.14, 0.16], wood, [0, 0.96, 0.07], { castShadow: true }),
    box([2.7, 0.14, 0.16], wood, [0, -0.96, 0.07], { castShadow: true }),
    box([0.14, 2.05, 0.16], wood, [-1.28, 0, 0.07], { castShadow: true }),
    box([0.14, 2.05, 0.16], wood, [1.28, 0, 0.07], { castShadow: true }),
    box([0.1, 1.82, 0.13], wood, [0, 0, 0.08], { castShadow: true }),
  );
  room.add(windowGroup);

  const bed = new THREE.Group();
  bed.name = "dashboard-bedroom-bed";
  bed.position.set(...bedroomPositions.bed);
  const headboard = box([0.2, 1.55, 2.12], darkWood, [-1.78, 0.86, 0], { castShadow: true });
  headboard.name = "dashboard-bedroom-bed-headboard";
  const bedFrame = box([3.6, 0.32, 2], wood, [0, 0.34, 0], { castShadow: true, receiveShadow: true });
  bedFrame.name = "dashboard-bedroom-bed-frame";
  const mattress = box([3.42, 0.34, 1.85], linen, [0, 0.61, 0], { castShadow: true, receiveShadow: true });
  mattress.name = "dashboard-bedroom-bed-mattress";
  const bedBlanket = box([2.18, 0.12, 1.81], blanket, [0.55, 0.83, 0], { castShadow: true });
  bedBlanket.name = "dashboard-bedroom-bed-blanket";
  const pillow = box([0.72, 0.18, 1.28], linen, [-1.16, 0.88, 0], {
    castShadow: true,
    rotation: [0, 0, -0.06],
  });
  pillow.name = "dashboard-bedroom-bed-pillow";
  bed.add(
    headboard,
    bedFrame,
    mattress,
    bedBlanket,
    pillow,
  );
  room.add(bed);

  const computer = new THREE.Group();
  computer.name = "dashboard-bedroom-computer";
  computer.position.set(...bedroomPositions.computer);
  const screen = new THREE.MeshStandardMaterial({
    color: "#b9dfd2",
    emissive: "#8bcbb9",
    emissiveIntensity: 0.72,
    roughness: 0.28,
  });
  computer.add(
    box([1.6, 0.16, 0.68], darkWood, [0, 0.84, 0], {
      castShadow: true,
      receiveShadow: true,
    }),
    box([0.13, 0.78, 0.13], darkWood, [-0.66, 0.4, -0.22], { castShadow: true }),
    box([0.13, 0.78, 0.13], darkWood, [0.66, 0.4, -0.22], { castShadow: true }),
    box([0.13, 0.78, 0.13], darkWood, [-0.66, 0.4, 0.22], { castShadow: true }),
    box([0.13, 0.78, 0.13], darkWood, [0.66, 0.4, 0.22], { castShadow: true }),
    box([0.92, 0.62, 0.1], darkWood, [0, 1.42, -0.12], { castShadow: true }),
    (() => {
      const computerScreen = box([0.76, 0.46, 0.025], screen, [0, 1.42, -0.058]);
      computerScreen.name = "dashboard-bedroom-computer-screen";
      return computerScreen;
    })(),
    box([0.1, 0.42, 0.1], darkWood, [0, 1.07, -0.12], { castShadow: true }),
    box([0.52, 0.06, 0.25], darkWood, [0, 0.94, 0.16], { castShadow: true }),
    box([0.68, 0.055, 0.23], linen, [0, 0.94, 0.34], {
      castShadow: true,
      rotation: [-0.08, 0, 0],
    }),
    box([0.74, 0.12, 0.52], wood, [0, 0.5, 0.84], { castShadow: true }),
    box([0.12, 0.55, 0.12], darkWood, [0, 0.22, 0.84], { castShadow: true }),
  );
  const computerGlow = new THREE.PointLight("#9fe3d0", 0.72, 3.1, 2);
  computerGlow.position.set(0, 1.42, 0.45);
  computer.add(computerGlow);
  room.add(computer);

  const nightstand = new THREE.Group();
  nightstand.name = "dashboard-bedroom-nightstand";
  nightstand.position.set(...bedroomPositions.nightstand);
  nightstand.add(
    box([1.05, 0.72, 0.85], darkWood, [0, 0.4, 0], { castShadow: true }),
    createMesh(new THREE.CylinderGeometry(0.19, 0.25, 0.48, 24), brass, [0, 0.98, 0], { castShadow: true }),
    createMesh(new THREE.ConeGeometry(0.48, 0.68, 32, 1, true), linen, [0, 1.45, 0], { castShadow: true }),
  );
  const lampLight = new THREE.PointLight("#ffd79a", 1.7, 5.6, 2);
  lampLight.position.set(0, 1.45, 0.25);
  nightstand.add(lampLight);
  room.add(nightstand);

  const wardrobe = new THREE.Group();
  wardrobe.name = "dashboard-bedroom-wardrobe";
  wardrobe.position.set(...bedroomPositions.wardrobe);
  wardrobe.add(
    box([2.55, 3.45, 0.86], darkWood, [0, 1.73, 0], { castShadow: true, receiveShadow: true }),
    box([1.13, 2.95, 0.08], wood, [-0.61, 1.78, 0.47], { castShadow: true }),
    box([1.13, 2.95, 0.08], wood, [0.61, 1.78, 0.47], { castShadow: true }),
    box([2.78, 0.15, 1.02], darkWood, [0, 3.52, 0], { castShadow: true }),
    createMesh(new THREE.SphereGeometry(0.075, 18, 14), brass, [-0.12, 1.75, 0.56], { castShadow: true }),
    createMesh(new THREE.SphereGeometry(0.075, 18, 14), brass, [0.12, 1.75, 0.56], { castShadow: true }),
  );
  room.add(wardrobe);

  const plant = new THREE.Group();
  plant.name = "dashboard-bedroom-plant";
  plant.position.set(...bedroomPositions.plant);
  plant.add(
    createMesh(new THREE.CylinderGeometry(0.42, 0.32, 0.62, 24), linen, [0, 0.31, 0], { castShadow: true }),
    createMesh(new THREE.SphereGeometry(0.48, 24, 18), sage, [0, 1.0, 0], { castShadow: true }),
    createMesh(new THREE.SphereGeometry(0.38, 24, 18), sage, [-0.3, 1.28, 0], { castShadow: true }),
    createMesh(new THREE.SphereGeometry(0.36, 24, 18), sage, [0.3, 1.34, 0.02], { castShadow: true }),
  );
  room.add(plant);

  parent.add(room);
  return { object: room, bed, computer, wardrobe };
}

export function addBedroomDoor(parent: THREE.Group): BedroomDoor {
  const group = new THREE.Group();
  group.name = "dashboard-bedroom-return-door";
  group.position.set(...bedroomPositions.door);
  group.rotation.y = -Math.PI / 2;

  const frame = new THREE.MeshStandardMaterial({
    color: dashboardBedroomDoorStyle.frame,
    roughness: 0.78,
  });
  const leaf = new THREE.MeshStandardMaterial({
    color: dashboardBedroomDoorStyle.leaf,
    roughness: 0.72,
  });
  const inset = new THREE.MeshStandardMaterial({
    color: dashboardBedroomDoorStyle.inset,
    roughness: 0.82,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: dashboardBedroomDoorStyle.brass,
    metalness: 0.46,
    roughness: 0.38,
  });
  const portal = new THREE.MeshBasicMaterial({ color: "#ead8bf" });

  const opening = createMesh(new THREE.PlaneGeometry(1.34, 2.58), portal, [0, 1.29, 0.055]);
  opening.name = "dashboard-bedroom-room-preview";
  const pivot = new THREE.Group();
  pivot.name = "dashboard-bedroom-return-door-leaf";
  pivot.position.set(-0.67, 0, 0.08);
  const panel = box([1.34, 2.58, 0.12], leaf, [0.67, 1.29, 0], {
    castShadow: true,
  });
  panel.name = "dashboard-bedroom-return-door-panel";
  const handle = createMesh(
    new THREE.SphereGeometry(0.075, 18, 14),
    brass,
    [1.11, 1.25, 0.12],
    { castShadow: true },
  );
  handle.name = "dashboard-bedroom-return-door-handle";
  const moonEmblem = createMesh(
    new THREE.CircleGeometry(0.12, 28),
    brass,
    [0.67, 2.18, 0.101],
    { castShadow: true },
  );
  moonEmblem.name = "dashboard-bedroom-return-door-moon-emblem";
  pivot.add(
    panel,
    box([0.88, 0.78, 0.04], inset, [0.67, 1.84, 0.075], {
      castShadow: true,
    }),
    box([0.88, 0.82, 0.04], inset, [0.67, 0.7, 0.075], {
      castShadow: true,
    }),
    handle,
    moonEmblem,
  );
  group.add(
    opening,
    pivot,
    box([1.64, 0.17, 0.2], frame, [0, 2.65, 0.12], {
      castShadow: true,
    }),
    box([0.17, 2.72, 0.2], frame, [-0.75, 1.31, 0.12], {
      castShadow: true,
    }),
    box([0.17, 2.72, 0.2], frame, [0.75, 1.31, 0.12], {
      castShadow: true,
    }),
  );
  parent.add(group);

  return {
    object: group,
    update: (openAmount) => {
      pivot.rotation.y =
        -THREE.MathUtils.smoothstep(openAmount, 0, 1) *
        dashboardBedroomDoorOpenAngle;
    },
  };
}

export default function DashboardBedroomScene({
  outfitId = defaultDashboardOutfitId,
  onComputerClick,
  onReturnComplete,
  onReturnTransitionStart,
  onSceneReady,
  onWardrobeClick,
}: DashboardBedroomSceneProps) {
  const t = useTranslations("Dashboard");
  const doorHotspotRef = useRef<HTMLButtonElement>(null);
  const bedHotspotRef = useRef<HTMLButtonElement>(null);
  const wardrobeHotspotRef = useRef<HTMLButtonElement>(null);
  const computerHotspotRef = useRef<HTMLButtonElement>(null);
  const returnActionRef = useRef<(() => void) | null>(null);
  const bedActionRef = useRef<(() => void) | null>(null);
  const computerActionRef = useRef<(() => void) | null>(null);
  const outfitActionRef = useRef<
    ((outfitId: DashboardOutfitId) => void) | null
  >(null);
  const outfitIdRef = useRef(outfitId);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    outfitIdRef.current = outfitId;
    outfitActionRef.current?.(outfitId);
  }, [outfitId]);

  const setup = useCallback((context: ThreeStageContext) => {
    const { camera, reducedMotion, renderer, scene } = context;
    const requestOnlineRoom = onComputerClick ?? (async () => false);
    const root = new THREE.Group();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const cameraBase = new THREE.Vector3(0, 3.45, 9.15);
    const cameraTarget = new THREE.Vector3(0, 1.55, -2.35);
    const entryPosition = new THREE.Vector3(...bedroomPositions.characterEntry);
    const restPosition = new THREE.Vector3(...bedroomPositions.characterRest);
    const bedApproachPosition = new THREE.Vector3(
      ...bedroomBedInteraction.approach,
    );
    const bedSeatedPosition = new THREE.Vector3(
      ...bedroomBedInteraction.seated,
    );
    const computerApproachPosition = new THREE.Vector3(
      ...bedroomComputerInteraction.approach,
    );
    const doorAnchor = new THREE.Vector3();
    const bedAnchor = new THREE.Vector3();
    const wardrobeAnchor = new THREE.Vector3();
    const computerAnchor = new THREE.Vector3();

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    scene.background = new THREE.Color("#e8dfcb");
    scene.fog = new THREE.Fog("#e8dfcb", 11, 21);
    scene.add(root);
    camera.position.copy(cameraBase);
    camera.lookAt(cameraTarget);

    const ambient = new THREE.HemisphereLight("#fff7e4", "#786b58", 1.35);
    const sunlight = new THREE.DirectionalLight("#ffe5b7", 2.85);
    sunlight.position.set(-3.8, 6.8, 4.6);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -7;
    sunlight.shadow.camera.right = 7;
    sunlight.shadow.camera.top = 6;
    sunlight.shadow.camera.bottom = -6;
    scene.add(ambient, sunlight);

    const environment = addBedroomEnvironment(root);
    const bedroomDoor = addBedroomDoor(root);
    bedroomDoor.update(reducedMotion ? 0 : 1);

    type CharacterState =
      | "entering"
      | "idle"
      | "walking-to-bed"
      | "walking-to-computer"
      | "connecting-online"
      | "resting"
      | "leaving-bed"
      | "returning";
    let characterState: CharacterState = reducedMotion ? "idle" : "entering";
    let stateElapsed = 0;
    let returnCompleted = false;
    let leavingBedWalking = false;
    let returnWalking = false;
    let returnStandDelay = 0;
    let returnStart = restPosition.clone();
    let returnStandStart = restPosition.clone();
    let returnFromBed = false;
    let characterUnavailable = false;
    let bedWalkStart = restPosition.clone();
    let computerRequestStarted = false;
    let computerStandDelay = 0;
    let computerWalking = false;
    let computerStart = restPosition.clone();

    const setHotspotsDisabled = (disabled: boolean) => {
      [
        doorHotspotRef.current,
        bedHotspotRef.current,
        wardrobeHotspotRef.current,
        computerHotspotRef.current,
      ].forEach(
        (hotspot) => {
          if (disabled) hotspot?.setAttribute("disabled", "");
          else hotspot?.removeAttribute("disabled");
        },
      );
    };
    setHotspotsDisabled(!reducedMotion);

    let sceneReadyReported = false;
    const reportSceneReady = () => {
      if (sceneReadyReported) return;
      sceneReadyReported = true;
      onSceneReady?.();
    };
    const markCharacterReady = () => {
      const object = character.getObject();
      if (object && reducedMotion) {
        object.position.copy(restPosition);
        character.play("idle", { fadeDuration: 0 });
        character.faceCamera(camera);
        setHotspotsDisabled(false);
      }
      reportSceneReady();
    };
    const markCharacterError = () => {
      characterUnavailable = true;
      characterState = "idle";
      setHotspotsDisabled(false);
      bedHotspotRef.current?.setAttribute("disabled", "");
      computerHotspotRef.current?.setAttribute("disabled", "");
      reportSceneReady();
    };
    const character = loadDashboardCharacter({
      initialAnimation: reducedMotion ? "idle" : "walk",
      initialOutfitId: outfitIdRef.current,
      name: "dashboard-bedroom-character",
      onError: markCharacterError,
      onReady: markCharacterReady,
      parent: root,
      position: entryPosition,
    });
    outfitActionRef.current = character.setOutfit;

    const beginBedAction = () => {
      if (characterUnavailable || !character.isReady()) return;
      if (characterState !== "idle" && characterState !== "resting") return;

      if (reducedMotion) {
        const object = character.getObject();
        if (!object) return;
        if (characterState === "resting") {
          object.position.copy(restPosition);
          characterState = "idle";
          character.play("idle", { fadeDuration: 0 });
          character.faceCamera(camera);
          setIsResting(false);
        } else {
          object.position.copy(bedSeatedPosition);
          characterState = "resting";
          character.play("sit", { fadeDuration: 0 });
          character.faceCamera(camera);
          setIsResting(true);
        }
        return;
      }

      setHotspotsDisabled(true);
      stateElapsed = 0;
      if (characterState === "resting") {
        characterState = "leaving-bed";
        leavingBedWalking = false;
        character.play("idle", { fadeDuration: 0.28 });
        setIsResting(false);
      } else {
        const object = character.getObject();
        if (object) bedWalkStart = object.position.clone();
        characterState = "walking-to-bed";
        character.play("walk", { fadeDuration: 0.2 });
      }
    };
    bedActionRef.current = beginBedAction;

    const beginComputerAction = () => {
      if (!onComputerClick || characterUnavailable || !character.isReady()) return;
      if (characterState !== "idle" && characterState !== "resting") return;
      const object = character.getObject();
      if (!object) return;

      setHotspotsDisabled(true);
      computerRequestStarted = false;
      computerWalking = false;
      computerStandDelay = characterState === "resting" ? 0.42 : 0;
      computerStart = characterState === "resting"
        ? bedApproachPosition.clone()
        : object.position.clone();
      setIsResting(false);
      if (reducedMotion) {
        object.position.copy(computerApproachPosition);
        characterState = "connecting-online";
        character.play("idle", { fadeDuration: 0 });
        void requestOnlineRoom().then((entered) => {
          if (entered) return;
          characterState = "idle";
          setHotspotsDisabled(false);
          character.faceCamera(camera);
        });
        return;
      }
      characterState = "walking-to-computer";
      stateElapsed = 0;
      character.play(computerStandDelay ? "idle" : "walk", { fadeDuration: 0.2 });
    };
    computerActionRef.current = beginComputerAction;

    const beginReturn = () => {
      if (!onReturnComplete || characterState === "entering" || characterState === "returning" || returnCompleted) return;
      if (characterState === "walking-to-bed" || characterState === "leaving-bed") return;

      onReturnTransitionStart?.();
      setHotspotsDisabled(true);
      setIsResting(false);

      if (reducedMotion || !character.isReady()) {
        returnCompleted = true;
        bedroomDoor.update(1);
        onReturnComplete();
        return;
      }

      const object = character.getObject();
      if (!object) return;
      returnFromBed = characterState === "resting";
      returnStandStart = object.position.clone();
      returnStart = returnFromBed
        ? bedApproachPosition.clone()
        : object.position.clone();
      returnStandDelay = returnFromBed ? 0.42 : 0;
      returnWalking = returnStandDelay === 0;
      characterState = "returning";
      stateElapsed = 0;
      character.play(returnWalking ? "walk" : "idle", { fadeDuration: 0.22 });
    };
    returnActionRef.current = beginReturn;

    const readPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const isDoorHit = () => raycaster.intersectObject(bedroomDoor.object, true).length > 0;
    const isBedHit = () => raycaster.intersectObject(environment.bed, true).length > 0;
    const isWardrobeHit = () => raycaster.intersectObject(environment.wardrobe, true).length > 0;
    const isComputerHit = () => raycaster.intersectObject(environment.computer, true).length > 0;
    const isBusy = () =>
      characterState === "entering" ||
      characterState === "walking-to-bed" ||
      characterState === "walking-to-computer" ||
      characterState === "connecting-online" ||
      characterState === "leaving-bed" ||
      characterState === "returning";

    const onPointerMove = (event: PointerEvent) => {
      if (isBusy()) {
        renderer.domElement.style.cursor = "";
        return;
      }
      readPointer(event);
      renderer.domElement.style.cursor =
        (onReturnComplete && isDoorHit()) ||
        (!characterUnavailable && isBedHit()) ||
        (onWardrobeClick && isWardrobeHit()) ||
        (onComputerClick && !characterUnavailable && isComputerHit())
          ? "pointer"
          : "";
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isBusy()) return;
      readPointer(event);
      if (onReturnComplete && isDoorHit()) {
        event.preventDefault();
        beginReturn();
      } else if (!characterUnavailable && isBedHit()) {
        event.preventDefault();
        beginBedAction();
      } else if (onWardrobeClick && isWardrobeHit()) {
        event.preventDefault();
        onWardrobeClick();
      } else if (onComputerClick && !characterUnavailable && isComputerHit()) {
        event.preventDefault();
        beginComputerAction();
      }
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const positionHotspot = (
      hotspot: HTMLButtonElement | null,
      object: THREE.Object3D,
      anchor: THREE.Vector3,
      localPosition: THREE.Vector3,
    ) => {
      if (!hotspot) return;
      anchor.copy(localPosition);
      object.localToWorld(anchor);
      anchor.project(camera);
      const visible = Math.abs(anchor.x) <= 1.05 && Math.abs(anchor.y) <= 1.05 && anchor.z <= 1;
      hotspot.hidden = !visible;
      if (!visible) return;
      hotspot.style.left = `${(anchor.x * 0.5 + 0.5) * 100}%`;
      hotspot.style.top = `${(-anchor.y * 0.5 + 0.5) * 100}%`;
      hotspot.dataset.positioned = "true";
    };
    const updateHotspots = () => {
      positionHotspot(doorHotspotRef.current, bedroomDoor.object, doorAnchor, new THREE.Vector3(0, 1.35, 0.2));
      positionHotspot(bedHotspotRef.current, environment.bed, bedAnchor, new THREE.Vector3(0, 0.85, 0.72));
      positionHotspot(wardrobeHotspotRef.current, environment.wardrobe, wardrobeAnchor, new THREE.Vector3(0, 1.8, 0.5));
      positionHotspot(computerHotspotRef.current, environment.computer, computerAnchor, new THREE.Vector3(0, 1.45, 0.42));
    };

    const onResize = ({ height, width }: ThreeStageResize) => {
      const compact = width / height < 1.35;
      camera.fov = compact ? 47 : 40;
      cameraBase.set(0, compact ? 3.85 : 3.45, compact ? 10.5 : 9.15);
      camera.position.copy(cameraBase);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      updateHotspots();
    };

    const onFrame = ({ delta, elapsed }: ThreeStageFrame) => {
      camera.position.set(cameraBase.x + Math.sin(elapsed * 0.16) * 0.07, cameraBase.y, cameraBase.z);
      camera.lookAt(cameraTarget);
      character.update(delta);
      const object = character.getObject();
      if (object && character.isReady()) {
        stateElapsed += delta;
        if (characterState === "entering") {
          const progress = THREE.MathUtils.smoothstep(stateElapsed / 2.05, 0, 1);
          object.position.lerpVectors(entryPosition, restPosition, progress);
          character.facePoint(restPosition);
          bedroomDoor.update(1 - progress);
          if (progress >= 1) {
            characterState = "idle";
            stateElapsed = 0;
            character.play("idle", { fadeDuration: 0.2 });
            character.faceCamera(camera);
            setHotspotsDisabled(false);
          }
        } else if (characterState === "walking-to-bed") {
          const progress = THREE.MathUtils.smoothstep(stateElapsed / 1.55, 0, 1);
          object.position.lerpVectors(bedWalkStart, bedApproachPosition, progress);
          character.facePoint(bedApproachPosition);
          if (progress >= 1) {
            object.position.copy(bedSeatedPosition);
            characterState = "resting";
            stateElapsed = 0;
            character.play("sit", { fadeDuration: 0 });
            character.faceCamera(camera);
            setIsResting(true);
            setHotspotsDisabled(false);
          }
        } else if (characterState === "walking-to-computer") {
          if (computerStandDelay && stateElapsed < computerStandDelay) {
            const standProgress = THREE.MathUtils.smoothstep(
              stateElapsed / computerStandDelay,
              0,
              1,
            );
            object.position.lerpVectors(
              bedSeatedPosition,
              bedApproachPosition,
              standProgress,
            );
            character.faceCamera(camera);
          }
          if (!computerWalking && stateElapsed >= computerStandDelay) {
            computerWalking = true;
            character.play("walk", { fadeDuration: 0.18 });
          }
          const travelDuration = Math.max(
            0.8,
            computerStart.distanceTo(computerApproachPosition) / 2.2,
          );
          const progress = THREE.MathUtils.smoothstep(
            (stateElapsed - computerStandDelay) / travelDuration,
            0,
            1,
          );
          if (stateElapsed >= computerStandDelay) {
            object.position.lerpVectors(computerStart, computerApproachPosition, progress);
            character.facePoint(computerApproachPosition);
          }
          if (progress >= 1 && !computerRequestStarted) {
            computerRequestStarted = true;
            characterState = "connecting-online";
            character.play("idle", { fadeDuration: 0.2 });
            character.facePoint(new THREE.Vector3(
              bedroomPositions.computer[0],
              0,
              bedroomPositions.computer[2],
            ));
            void requestOnlineRoom().then((entered) => {
              if (entered) return;
              characterState = "idle";
              stateElapsed = 0;
              setHotspotsDisabled(false);
              character.faceCamera(camera);
            });
          }
        } else if (characterState === "leaving-bed") {
          const standProgress = THREE.MathUtils.smoothstep(
            stateElapsed / 0.42,
            0,
            1,
          );
          object.position.lerpVectors(
            bedSeatedPosition,
            bedApproachPosition,
            standProgress,
          );
          if (stateElapsed >= 0.42 && !leavingBedWalking) {
            leavingBedWalking = true;
            character.play("walk", { fadeDuration: 0.18 });
          }
          const progress = THREE.MathUtils.smoothstep((stateElapsed - 0.42) / 1.55, 0, 1);
          if (stateElapsed >= 0.42) {
            object.position.lerpVectors(bedApproachPosition, restPosition, progress);
          }
          character.facePoint(restPosition);
          if (progress >= 1) {
            characterState = "idle";
            stateElapsed = 0;
            character.play("idle", { fadeDuration: 0.2 });
            character.faceCamera(camera);
            setHotspotsDisabled(false);
          }
        } else if (characterState === "returning") {
          if (returnFromBed && stateElapsed < returnStandDelay) {
            const standProgress = THREE.MathUtils.smoothstep(
              stateElapsed / returnStandDelay,
              0,
              1,
            );
            object.position.lerpVectors(
              returnStandStart,
              bedApproachPosition,
              standProgress,
            );
            character.faceCamera(camera);
          }
          if (!returnWalking && stateElapsed >= returnStandDelay) {
            returnWalking = true;
            character.play("walk", { fadeDuration: 0.18 });
          }
          const progress = THREE.MathUtils.smoothstep((stateElapsed - returnStandDelay) / 2.15, 0, 1);
          if (stateElapsed >= returnStandDelay) {
            object.position.lerpVectors(returnStart, entryPosition, progress);
            character.facePoint(entryPosition);
          }
          bedroomDoor.update(THREE.MathUtils.clamp((progress - 0.58) / 0.32, 0, 1));
          if (progress >= 1 && !returnCompleted) {
            returnCompleted = true;
            onReturnComplete?.();
          }
        } else {
          character.faceCamera(camera);
        }
      }
      updateHotspots();
    };

    return {
      dispose: () => {
        if (outfitActionRef.current === character.setOutfit) {
          outfitActionRef.current = null;
        }
        character.dispose();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        if (returnActionRef.current === beginReturn) returnActionRef.current = null;
        if (bedActionRef.current === beginBedAction) bedActionRef.current = null;
        if (computerActionRef.current === beginComputerAction) computerActionRef.current = null;
        scene.remove(root, ambient, sunlight);
        disposeObject3D(root);
      },
      onFrame,
      onResize,
    };
  }, [onComputerClick, onReturnComplete, onReturnTransitionStart, onSceneReady, onWardrobeClick]);

  return (
    <div className="dashboard-three-layer dashboard-three-layer-interactive">
      <ThreeStage
        className="dashboard-three-stage"
        fallback={<div className="dashboard-bedroom-fallback" />}
        setup={setup}
      />
      <button
        aria-label={t("returnFromBedroom")}
        className="dashboard-scene-hotspot dashboard-bedroom-return-hotspot"
        id="dashboard-bedroom-door-trigger"
        onClick={() => returnActionRef.current?.()}
        ref={doorHotspotRef}
        type="button"
      >
        <span>{t("returnFromBedroom")}</span>
      </button>
      <button
        aria-label={isResting ? t("finishResting") : t("restOnBed")}
        aria-pressed={isResting}
        className="dashboard-scene-hotspot dashboard-bedroom-bed-hotspot"
        id="dashboard-bedroom-bed-trigger"
        onClick={() => bedActionRef.current?.()}
        ref={bedHotspotRef}
        type="button"
      >
        <span>{isResting ? t("finishResting") : t("restOnBed")}</span>
      </button>
      {onWardrobeClick ? (
        <button
          aria-label={t("openWardrobe")}
          className="dashboard-scene-hotspot dashboard-bedroom-wardrobe-hotspot"
          id="dashboard-bedroom-wardrobe-trigger"
          onClick={onWardrobeClick}
          ref={wardrobeHotspotRef}
          type="button"
        >
          <span>{t("openWardrobe")}</span>
        </button>
      ) : null}
      {onComputerClick ? (
        <button
          aria-label={t("enterOnlineRoom")}
          className="dashboard-scene-hotspot dashboard-bedroom-computer-hotspot"
          id="dashboard-bedroom-computer-trigger"
          onClick={() => computerActionRef.current?.()}
          ref={computerHotspotRef}
          type="button"
        >
          <span>{t("enterOnlineRoom")}</span>
        </button>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {isResting ? t("restingOnBed") : ""}
      </p>
    </div>
  );
}
