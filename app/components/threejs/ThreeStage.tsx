"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

export type ThreeStageContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLDivElement;
  clock: THREE.Clock;
  reducedMotion: boolean;
};

export type ThreeStageFrame = ThreeStageContext & {
  delta: number;
  elapsed: number;
};

export type ThreeStageResize = ThreeStageContext & {
  width: number;
  height: number;
  pixelRatio: number;
};

export type ThreeStageLifecycle = {
  onFrame?: (frame: ThreeStageFrame) => void;
  onResize?: (state: ThreeStageResize) => void;
  dispose?: () => void;
};

export type ThreeStageProps = {
  setup: (context: ThreeStageContext) => ThreeStageLifecycle | void;
  className?: string;
  fallback?: ReactNode;
  ariaLabel?: string;
};

const textureKeys = [
  "alphaMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "emissiveMap",
  "envMap",
  "lightMap",
  "map",
  "metalnessMap",
  "normalMap",
  "roughnessMap",
] as const;

type TextureKey = (typeof textureKeys)[number];
type TextureMaterial = THREE.Material & Partial<Record<TextureKey, THREE.Texture | null>>;

function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");

    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function disposeMaterial(material: THREE.Material) {
  const typedMaterial = material as TextureMaterial;

  textureKeys.forEach((key) => {
    typedMaterial[key]?.dispose();
  });

  material.dispose();
}

export function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterial);
      return;
    }

    if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
}

export default function ThreeStage({
  setup,
  className,
  fallback,
  ariaLabel,
}: ThreeStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackLabelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const container = containerRef.current;

    if (!stage || !container) {
      return;
    }

    const setStageStatus = (
      status: "loading" | "ready" | "unsupported" | "error",
      label: string,
    ) => {
      stage.dataset.threeStatus = status;

      if (fallbackLabelRef.current) {
        fallbackLabelRef.current.textContent = label;
      }
    };

    if (!isWebGLAvailable()) {
      setStageStatus("unsupported", "3D scene unavailable");
      return;
    }

    let animationFrame = 0;
    let disposed = false;
    let lifecycle: ThreeStageLifecycle | void;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "three-stage-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const context: ThreeStageContext = {
      scene,
      camera,
      renderer,
      container,
      clock,
      reducedMotion,
    };

    const renderOnce = () => {
      renderer.render(scene, camera);
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(width));
      const nextHeight = Math.max(1, Math.floor(height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(nextWidth, nextHeight, false);

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();

      lifecycle?.onResize?.({
        ...context,
        width: nextWidth,
        height: nextHeight,
        pixelRatio,
      });

      renderOnce();
    };

    try {
      lifecycle = setup(context);
      resize();
      setStageStatus("ready", "");

      if (reducedMotion) {
        lifecycle?.onFrame?.({
          ...context,
          delta: 0,
          elapsed: clock.elapsedTime,
        });
        renderOnce();
      } else {
        const animate = () => {
          if (disposed) {
            return;
          }

          const delta = clock.getDelta();
          const elapsed = clock.elapsedTime;

          lifecycle?.onFrame?.({
            ...context,
            delta,
            elapsed,
          });
          renderOnce();

          animationFrame = window.requestAnimationFrame(animate);
        };

        animationFrame = window.requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("ThreeStage setup failed", error);
      setStageStatus("error", "3D scene failed to load");
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      lifecycle?.dispose?.();
      disposeObject3D(scene);
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        renderer.domElement.remove();
      }
    };
  }, [setup]);

  return (
    <div
      ref={stageRef}
      className={["three-stage", className].filter(Boolean).join(" ")}
      data-three-status="loading"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    >
      <div ref={containerRef} className="three-stage-mount" />
      <div className="three-stage-fallback-shell">
        {fallback ?? (
          <div ref={fallbackLabelRef} className="three-stage-fallback">
            Loading 3D scene
          </div>
        )}
      </div>
    </div>
  );
}
