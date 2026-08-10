import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeObject3D } from "@/app/components/threejs";

const characterModelUrl = "/meshes/characters/male.glb";
const characterHeight = 1.92;

export type DashboardCharacterAnimation = "idle" | "sit" | "walk" | "wave";

export type DashboardCharacterController = {
  dispose: () => void;
  faceCamera: (camera: THREE.PerspectiveCamera) => void;
  facePoint: (point: THREE.Vector3) => void;
  getObject: () => THREE.Group | null;
  isReady: () => boolean;
  play: (
    animation: DashboardCharacterAnimation,
    options?: { fadeDuration?: number; loopOnce?: boolean },
  ) => number;
  update: (delta: number) => void;
};

export function loadDashboardCharacter({
  initialAnimation,
  name,
  onError,
  onReady,
  parent,
  position,
}: {
  initialAnimation: DashboardCharacterAnimation;
  name: string;
  onError?: () => void;
  onReady?: () => void;
  parent: THREE.Group;
  position: THREE.Vector3;
}): DashboardCharacterController {
  const loader = new GLTFLoader();
  const actions = new Map<DashboardCharacterAnimation, THREE.AnimationAction>();
  let currentAction: THREE.AnimationAction | null = null;
  let character: THREE.Group | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let disposed = false;

  const findClip = (
    clips: THREE.AnimationClip[],
    animation: DashboardCharacterAnimation,
  ) =>
    THREE.AnimationClip.findByName(clips, animation) ??
    clips.find((clip) => clip.name.toLowerCase().includes(animation));

  loader.load(
    characterModelUrl,
    (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }

      configureCharacterModel(gltf.scene);
      frameCharacterModel(gltf.scene);

      character = new THREE.Group();
      character.name = name;
      character.position.copy(position);
      character.add(gltf.scene);
      parent.add(character);

      mixer = new THREE.AnimationMixer(gltf.scene);
      (["idle", "sit", "walk", "wave"] as const).forEach((animation) => {
        const clip = findClip(gltf.animations, animation);
        if (clip) actions.set(animation, mixer!.clipAction(clip));
      });

      currentAction = actions.get(initialAnimation) ?? actions.get("idle") ?? null;
      currentAction?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      mixer.update(0);
      onReady?.();
    },
    undefined,
    (error) => {
      console.error("Failed to load dashboard character model.", error);
      onError?.();
    },
  );

  return {
    dispose: () => {
      disposed = true;
      if (character) parent.remove(character);
      if (mixer && character?.children[0]) mixer.uncacheRoot(character.children[0]);
    },
    faceCamera: (camera) => {
      if (!character) return;
      faceObjectTowards(
        character,
        new THREE.Vector3(camera.position.x, character.position.y, camera.position.z),
      );
    },
    facePoint: (point) => {
      if (!character) return;
      faceObjectTowards(
        character,
        new THREE.Vector3(point.x, character.position.y, point.z),
      );
    },
    getObject: () => character,
    isReady: () => Boolean(character && mixer),
    play: (animation, options = {}) => {
      const nextAction = actions.get(animation);
      if (!nextAction) return 0;

      const { fadeDuration = 0.25, loopOnce = false } = options;
      nextAction.reset();
      nextAction.enabled = true;
      nextAction.clampWhenFinished = loopOnce;
      nextAction.setLoop(
        loopOnce ? THREE.LoopOnce : THREE.LoopRepeat,
        loopOnce ? 1 : Infinity,
      );
      nextAction.play();

      if (currentAction && currentAction !== nextAction) {
        currentAction.crossFadeTo(nextAction, fadeDuration, true);
      }
      currentAction = nextAction;

      return nextAction.getClip().duration;
    },
    update: (delta) => mixer?.update(delta),
  };
}

function configureCharacterModel(model: THREE.Object3D) {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function frameCharacterModel(model: THREE.Object3D) {
  const sourceBox = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const scale = characterHeight / Math.max(sourceSize.y, 0.001);

  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(
    new THREE.Vector3(scaledCenter.x, scaledBox.min.y, scaledCenter.z),
  );
}

function faceObjectTowards(object: THREE.Object3D, point: THREE.Vector3) {
  object.lookAt(point);
}
