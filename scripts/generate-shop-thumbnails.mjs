import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const projectRoot = process.cwd();
const publicRoot = join(projectRoot, "public");
const threeRoot = join(projectRoot, "node_modules", "three");
const outputRoot = join(publicRoot, "assets", "shop-thumbnails");

const sourceGroups = [
  { category: "flower", directory: join(publicRoot, "meshes", "flowers") },
  { category: "bug", directory: join(publicRoot, "meshes", "bugs") },
  { category: "fish", directory: join(publicRoot, "meshes", "fishes") },
  { category: "fruit", directory: join(publicRoot, "meshes", "fruits") },
];

const rendererHtml = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { width: 512px; height: 512px; margin: 0; overflow: hidden; background: transparent; }
      canvas { display: block; width: 512px; height: 512px; }
    </style>
    <script type="importmap">
      {
        "imports": {
          "three": "/vendor/three/build/three.module.js",
          "three/addons/": "/vendor/three/examples/jsm/"
        }
      }
    </script>
  </head>
  <body>
    <script type="module">
      import * as THREE from "three";
      import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(1);
      renderer.setSize(512, 512, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      document.body.append(renderer.domElement);

      const loader = new GLTFLoader();

      function presentationFor(category, sourcePath) {
        if (category === "fish") {
          const match = sourcePath.match(/fish(\d+)\.glb$/i);
          return {
            rotationX: 0,
            rotationY: Number(match?.[1] ?? 1) <= 3 ? -Math.PI / 2 : Math.PI / 2,
            scale: 1,
            exposure: 1.18
          };
        }
        if (category === "flower" && /flower3\.glb$/i.test(sourcePath)) {
          return { rotationX: 0.38, rotationY: -0.64, scale: 1.1, exposure: 0.82 };
        }
        if (category === "flower") {
          return { rotationX: 0, rotationY: -0.42, scale: 1, exposure: 1.18 };
        }
        if (category === "bug") {
          return { rotationX: -0.08, rotationY: -0.3, scale: 1, exposure: 1.18 };
        }
        if (category === "fruit") {
          return { rotationX: 0, rotationY: 0.5, scale: 1, exposure: 1.18 };
        }
        return { rotationX: 0, rotationY: 0.18, scale: 1, exposure: 1.18 };
      }

      window.renderShopAsset = async ({ category, sourcePath }) => {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 30);
        camera.position.set(0, 0.25, 6);
        camera.lookAt(0, 0, 0);

        const hemisphere = new THREE.HemisphereLight(0xfff8e8, 0x6f8d78, 2.7);
        const key = new THREE.DirectionalLight(0xffedc4, 4.1);
        const fill = new THREE.DirectionalLight(0xcce9ff, 2.2);
        key.position.set(3.5, 5, 5);
        fill.position.set(-4, 2, 3);
        scene.add(hemisphere, key, fill);

        const gltf = await loader.loadAsync(sourcePath);
        const presentation = presentationFor(category, sourcePath);
        renderer.toneMappingExposure = presentation.exposure;
        const root = new THREE.Group();
        const model = gltf.scene;
        root.add(model);
        scene.add(root);

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.frustumCulled = false;
          }
        });

        const initialBounds = new THREE.Box3().setFromObject(model);
        const initialCentre = initialBounds.getCenter(new THREE.Vector3());
        model.position.sub(initialCentre);
        root.rotation.x = presentation.rotationX;
        root.rotation.y = presentation.rotationY;
        root.updateMatrixWorld(true);

        const rotatedBounds = new THREE.Box3().setFromObject(root);
        const rotatedCentre = rotatedBounds.getCenter(new THREE.Vector3());
        const rotatedSize = rotatedBounds.getSize(new THREE.Vector3());
        root.position.sub(rotatedCentre);
        root.scale.setScalar(
          (2.25 * presentation.scale) /
            Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z, 0.001)
        );

        if (category === "character" && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          mixer.update(Math.min(gltf.animations[0].duration * 0.22, 0.45));
        }

        root.updateMatrixWorld(true);
        renderer.render(scene, camera);
        await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
        renderer.render(scene, camera);
      };
    </script>
  </body>
</html>`;

await mkdir(outputRoot, { recursive: true });
const assets = await discoverAssets();
const server = await startAssetServer();
let browser;

try {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  browser = await puppeteer.launch({
    ...(executablePath ? { executablePath } : { channel: "chrome" }),
    headless: true,
    args: [
      "--enable-webgl",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/renderer`, {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction(() => typeof window.renderShopAsset === "function");

  for (const asset of assets) {
    await page.evaluate((nextAsset) => window.renderShopAsset(nextAsset), asset);
    const canvas = await page.$("canvas");
    if (!canvas) throw new Error(`Renderer did not create a canvas for ${asset.sourcePath}.`);
    await canvas.screenshot({
      type: "webp",
      quality: 88,
      omitBackground: true,
      path: join(outputRoot, asset.outputName),
    });
    process.stdout.write(`Generated ${asset.outputName}\n`);
  }
} finally {
  await browser?.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

async function discoverAssets() {
  const discovered = [];
  for (const group of sourceGroups) {
    const filenames = (await readdir(group.directory))
      .filter((filename) => extname(filename).toLowerCase() === ".glb")
      .sort((left, right) => left.localeCompare(right));
    for (const filename of filenames) {
      discovered.push({
        category: group.category,
        sourcePath: `/meshes/${group.directory.split(sep).at(-1)}/${filename}`,
        outputName: `${group.category}-${filename.replace(/\.glb$/i, "").toLowerCase()}.webp`,
      });
    }
  }

  discovered.push({
    category: "character",
    sourcePath: "/meshes/characters/rabbit_merchant.glb",
    outputName: "character-rabbit_merchant.webp",
  });
  return discovered;
}

async function startAssetServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
      if (pathname === "/renderer") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(rendererHtml);
        return;
      }

      const target = pathname.startsWith("/vendor/three/")
        ? resolveInside(threeRoot, pathname.slice("/vendor/three/".length))
        : resolveInside(publicRoot, pathname.slice(1));
      const info = await stat(target);
      if (!info.isFile()) throw new Error("Not a file");
      response.writeHead(200, {
        "Content-Type": mimeType(target),
        "Cache-Control": "no-store",
      });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  return server;
}

function resolveInside(root, relativePath) {
  const target = resolve(root, relativePath);
  const normalizedRoot = `${resolve(root)}${sep}`;
  if (!target.startsWith(normalizedRoot)) throw new Error("Unsafe asset path");
  return target;
}

function mimeType(path) {
  switch (extname(path).toLowerCase()) {
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".glb":
      return "model/gltf-binary";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}
